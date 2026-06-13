import { BadRequestException, Injectable } from '@nestjs/common';

const PLACEHOLDER_PATTERN = /{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g;

export interface CommunicationTemplateVariableInput {
  key: string;
  description?: string | null;
  required?: boolean;
}

export interface PreparedCommunicationTemplate {
  subjectTemplate: string | null;
  bodyTemplate: string;
  variables: Array<{
    key: string;
    description: string | null;
    required: true;
  }>;
}

@Injectable()
export class CommunicationTemplateRenderer {
  prepare(
    subjectTemplate: string | null | undefined,
    bodyTemplate: string,
    variables: CommunicationTemplateVariableInput[],
  ): PreparedCommunicationTemplate {
    const subject = subjectTemplate?.trim() || null;
    const body = bodyTemplate.trim();
    if (!body) throw new BadRequestException('Template body is required');

    const normalized = variables.map((variable) => ({
      key: variable.key.trim(),
      description: variable.description?.trim() || null,
      required: true as const,
    }));
    const declared = new Set(normalized.map((variable) => variable.key));
    if (declared.size !== normalized.length) {
      throw new BadRequestException('Template variable keys must be unique');
    }

    const referenced = new Set([...this.placeholders(subject ?? ''), ...this.placeholders(body)]);
    const undeclared = [...referenced].filter((key) => !declared.has(key));
    const unused = [...declared].filter((key) => !referenced.has(key));
    if (undeclared.length > 0) {
      throw new BadRequestException(
        `Undeclared template variables: ${undeclared.sort().join(', ')}`,
      );
    }
    if (unused.length > 0) {
      throw new BadRequestException(`Unused template variables: ${unused.sort().join(', ')}`);
    }

    return { subjectTemplate: subject, bodyTemplate: body, variables: normalized };
  }

  render(
    prepared: PreparedCommunicationTemplate,
    values: Record<string, unknown>,
  ): { subject: string | null; body: string } {
    const expected = new Set(prepared.variables.map((variable) => variable.key));
    const missing = [...expected].filter(
      (key) => !Object.prototype.hasOwnProperty.call(values, key) || values[key] === null,
    );
    const unknown = Object.keys(values).filter((key) => !expected.has(key));
    if (missing.length > 0) {
      throw new BadRequestException(`Missing template values: ${missing.sort().join(', ')}`);
    }
    if (unknown.length > 0) {
      throw new BadRequestException(`Unknown template values: ${unknown.sort().join(', ')}`);
    }
    for (const [key, value] of Object.entries(values)) {
      if (!['string', 'number', 'boolean'].includes(typeof value)) {
        throw new BadRequestException(`Template value ${key} must be a scalar`);
      }
    }

    const replace = (content: string) =>
      content.replace(PLACEHOLDER_PATTERN, (_match, key: string) => String(values[key]));
    return {
      subject: prepared.subjectTemplate ? replace(prepared.subjectTemplate) : null,
      body: replace(prepared.bodyTemplate),
    };
  }

  private placeholders(content: string): string[] {
    return [...content.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]);
  }
}
