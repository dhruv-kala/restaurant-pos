import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CommunicationChannel,
  CommunicationMessageStatus,
  Prisma,
} from '@prisma/client';

import { applyDatabaseRequestContext } from '../../../common/database/request-context.util';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import type { CommunicationAnalyticsQueryDto } from '../dto/communication-analytics.dto';
import { requireCommunicationAnalyticsView } from './communication-analytics-access.util';
import { resolveCommunicationScope } from './communication-access.util';

type CountRow = {
  status: CommunicationMessageStatus;
  _count: { _all: number };
};

type LatencyRow = {
  groupKey: string | null;
  averageDeliveryTimeMs: number | null;
};

type WebhookLatencyRow = {
  providerId: string | null;
  averageWebhookLatencyMs: number | null;
};

type TrendRow = {
  bucket: Date;
  totalMessages: bigint | number;
  deliveredMessages: bigint | number;
  failedMessages: bigint | number;
};

@Injectable()
export class CommunicationAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async report(query: CommunicationAnalyticsQueryDto, actor: AuthenticatedUser) {
    requireCommunicationAnalyticsView(actor);
    const scope = resolveCommunicationScope(actor, query.tenantId, query.outletId);
    const range = this.range(query);
    return this.prisma.$transaction(async (tx) => {
      await applyDatabaseRequestContext(tx, actor, scope.tenantId);
      const where: Prisma.CommunicationMessageWhereInput = {
        tenantId: scope.tenantId,
        ...(scope.outletId ? { outletId: scope.outletId } : {}),
        createdAt: { gte: range.from, lte: range.to },
      };
      const [statusCounts, channelCounts, providers, providerLatency, channelLatency] =
        await Promise.all([
          tx.communicationMessage.groupBy({
            by: ['status'],
            where,
            _count: { _all: true },
          }),
          tx.communicationMessage.groupBy({
            by: ['channel', 'status'],
            where,
            _count: { _all: true },
          }),
          tx.communicationProvider.findMany({
            where: { tenantId: scope.tenantId },
            select: {
              id: true,
              channel: true,
              providerKey: true,
              displayName: true,
              status: true,
            },
            orderBy: [{ channel: 'asc' }, { priority: 'asc' }],
          }),
          this.deliveryLatency(tx, scope.tenantId, scope.outletId, range, 'provider'),
          this.deliveryLatency(tx, scope.tenantId, scope.outletId, range, 'channel'),
        ]);
      const [providerCounts, webhookLatency, trends] = await Promise.all([
        this.providerCounts(tx, scope.tenantId, scope.outletId, range),
        this.webhookLatency(tx, scope.tenantId, scope.outletId, range),
        this.trends(tx, scope.tenantId, scope.outletId, range, query.groupBy),
      ]);
      return {
        scope: {
          tenantId: scope.tenantId,
          outletId: scope.outletId ?? null,
          from: range.from,
          to: range.to,
          groupBy: query.groupBy,
        },
        summary: this.metrics(statusCounts),
        channels: Object.values(CommunicationChannel).map((channel) => ({
          channel,
          ...this.metrics(channelCounts.filter((row) => row.channel === channel)),
          averageDeliveryTimeMs:
            this.latency(channelLatency, channel) ?? null,
        })),
        providers: providers.map((provider) => ({
          ...provider,
          ...this.metrics(providerCounts.get(provider.id) ?? []),
          averageDeliveryTimeMs:
            this.latency(providerLatency, provider.id) ?? null,
          averageWebhookLatencyMs:
            this.webhookMetric(webhookLatency, provider.id) ?? null,
        })),
        trends: trends.map((row) => {
          const deliveredMessages = this.number(row.deliveredMessages);
          const failedMessages = this.number(row.failedMessages);
          return {
            periodStart: row.bucket,
            totalMessages: this.number(row.totalMessages),
            deliveredMessages,
            failedMessages,
            successRate: this.rate(deliveredMessages, failedMessages),
          };
        }),
      };
    });
  }

  private range(query: CommunicationAnalyticsQueryDto) {
    const to = query.to ?? new Date();
    const from =
      query.from ?? new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
    if (from > to) throw new BadRequestException('from must not exceed to');
    if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('Communication analytics range cannot exceed 366 days');
    }
    return { from, to };
  }

  private metrics(rows: CountRow[]) {
    const counts = new Map(rows.map((row) => [row.status, row._count._all]));
    const deliveredMessages =
      (counts.get(CommunicationMessageStatus.DELIVERED) ?? 0) +
      (counts.get(CommunicationMessageStatus.READ) ?? 0);
    const failedMessages = counts.get(CommunicationMessageStatus.FAILED) ?? 0;
    const pendingMessages =
      (counts.get(CommunicationMessageStatus.QUEUED) ?? 0) +
      (counts.get(CommunicationMessageStatus.PROCESSING) ?? 0) +
      (counts.get(CommunicationMessageStatus.SENT) ?? 0);
    const cancelledMessages =
      counts.get(CommunicationMessageStatus.CANCELLED) ?? 0;
    return {
      totalMessages: [...counts.values()].reduce((total, count) => total + count, 0),
      deliveredMessages,
      failedMessages,
      pendingMessages,
      cancelledMessages,
      successRate: this.rate(deliveredMessages, failedMessages),
      failureRate: this.rate(failedMessages, deliveredMessages),
    };
  }

  private rate(delivered: number, failed: number): number {
    const terminal = delivered + failed;
    return terminal === 0 ? 0 : Number((delivered / terminal).toFixed(4));
  }

  private async providerCounts(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string | undefined,
    range: { from: Date; to: Date },
  ): Promise<Map<string, CountRow[]>> {
    const rows = await tx.communicationMessage.groupBy({
      by: ['providerId', 'status'],
      where: {
        tenantId,
        providerId: { not: null },
        ...(outletId ? { outletId } : {}),
        createdAt: { gte: range.from, lte: range.to },
      },
      _count: { _all: true },
    });
    const grouped = new Map<string, CountRow[]>();
    for (const row of rows) {
      if (!row.providerId) continue;
      grouped.set(row.providerId, [
        ...(grouped.get(row.providerId) ?? []),
        { status: row.status, _count: row._count },
      ]);
    }
    return grouped;
  }

  private async deliveryLatency(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string | undefined,
    range: { from: Date; to: Date },
    grouping: 'provider' | 'channel',
  ): Promise<LatencyRow[]> {
    const groupColumn =
      grouping === 'provider'
        ? Prisma.sql`"provider_id"`
        : Prisma.sql`"channel"`;
    return tx.$queryRaw<LatencyRow[]>(Prisma.sql`
      SELECT
        ${groupColumn}::text AS "groupKey",
        AVG(EXTRACT(EPOCH FROM ("delivered_at" - "sent_at")) * 1000)::float8
          AS "averageDeliveryTimeMs"
      FROM "communication_messages"
      WHERE "tenant_id" = ${tenantId}::uuid
        AND "created_at" >= ${range.from}
        AND "created_at" <= ${range.to}
        AND "sent_at" IS NOT NULL
        AND "delivered_at" IS NOT NULL
        AND "delivered_at" >= "sent_at"
        ${outletId ? Prisma.sql`AND "outlet_id" = ${outletId}::uuid` : Prisma.empty}
      GROUP BY ${groupColumn}
    `);
  }

  private async webhookLatency(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string | undefined,
    range: { from: Date; to: Date },
  ): Promise<WebhookLatencyRow[]> {
    return tx.$queryRaw<WebhookLatencyRow[]>(Prisma.sql`
      SELECT
        webhook."provider_id" AS "providerId",
        AVG(
          EXTRACT(EPOCH FROM (webhook."processed_at" - webhook."occurred_at")) * 1000
        )::float8 AS "averageWebhookLatencyMs"
      FROM "communication_webhooks" webhook
      LEFT JOIN "communication_messages" message
        ON message."tenant_id" = webhook."tenant_id"
       AND message."id" = webhook."message_id"
      WHERE webhook."tenant_id" = ${tenantId}::uuid
        AND webhook."created_at" >= ${range.from}
        AND webhook."created_at" <= ${range.to}
        AND webhook."processed_at" >= webhook."occurred_at"
        ${
          outletId
            ? Prisma.sql`AND message."outlet_id" = ${outletId}::uuid`
            : Prisma.empty
        }
      GROUP BY webhook."provider_id"
    `);
  }

  private async trends(
    tx: Prisma.TransactionClient,
    tenantId: string,
    outletId: string | undefined,
    range: { from: Date; to: Date },
    groupBy: 'DAY' | 'WEEK' | 'MONTH',
  ): Promise<TrendRow[]> {
    const bucket = groupBy.toLowerCase();
    return tx.$queryRaw<TrendRow[]>(Prisma.sql`
      SELECT
        (
          date_trunc(${bucket}, "created_at" AT TIME ZONE 'UTC')
          AT TIME ZONE 'UTC'
        ) AS "bucket",
        COUNT(*) AS "totalMessages",
        COUNT(*) FILTER (
          WHERE "status" IN (
            ${CommunicationMessageStatus.DELIVERED}::"communication_message_status",
            ${CommunicationMessageStatus.READ}::"communication_message_status"
          )
        ) AS "deliveredMessages",
        COUNT(*) FILTER (
          WHERE "status" = ${CommunicationMessageStatus.FAILED}::"communication_message_status"
        ) AS "failedMessages"
      FROM "communication_messages"
      WHERE "tenant_id" = ${tenantId}::uuid
        AND "created_at" >= ${range.from}
        AND "created_at" <= ${range.to}
        ${outletId ? Prisma.sql`AND "outlet_id" = ${outletId}::uuid` : Prisma.empty}
      GROUP BY 1
      ORDER BY 1
    `);
  }

  private latency(rows: LatencyRow[], value: string): number | undefined {
    return rows.find((row) => row.groupKey === value)?.averageDeliveryTimeMs ?? undefined;
  }

  private webhookMetric(rows: WebhookLatencyRow[], providerId: string) {
    return rows.find((row) => row.providerId === providerId)
      ?.averageWebhookLatencyMs;
  }

  private number(value: bigint | number): number {
    return typeof value === 'bigint' ? Number(value) : value;
  }
}
