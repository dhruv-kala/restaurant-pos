import { TenantStatus } from '@prisma/client';
import { SeedContext } from './seed-context';

export async function seedDemoTenant(context: SeedContext): Promise<void> {
  const tenant = await context.prisma.tenant.upsert({
    where: { slug: 'demo-restaurant' },
    update: {
      name: 'Demo Restaurant',
      legalName: 'Demo Restaurant Private Limited',
      email: 'admin@demo.com',
      phone: '+919999990000',
      status: TenantStatus.ACTIVE,
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
      currencyCode: 'INR',
      outletLimit: 3,
      deletedAt: null,
    },
    create: {
      slug: 'demo-restaurant',
      name: 'Demo Restaurant',
      legalName: 'Demo Restaurant Private Limited',
      email: 'admin@demo.com',
      phone: '+919999990000',
      locale: 'en-IN',
      timezone: 'Asia/Kolkata',
      currencyCode: 'INR',
      outletLimit: 3,
    },
  });
  context.demo.tenantId = tenant.id;
  console.log('013: seeded Demo Restaurant tenant.');
}
