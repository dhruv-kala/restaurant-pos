import { OutletStatus } from '@prisma/client';
import { KITCHEN_STATIONS } from './011-kitchen-master.seed';
import { requireDemoValue, SeedContext } from './seed-context';

export async function seedDemoOutlet(context: SeedContext): Promise<void> {
  const tenantId = requireDemoValue(context.demo.tenantId, 'tenant');
  const outlet = await context.prisma.outlet.upsert({
    where: { tenantId_code: { tenantId, code: 'MAIN' } },
    update: {
      name: 'Main Branch',
      email: 'main@demo.com',
      phone: '+919999990001',
      addressLine1: '100 Demo Street',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'IN',
      postalCode: '380001',
      timezone: 'Asia/Kolkata',
      status: OutletStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      tenantId,
      code: 'MAIN',
      name: 'Main Branch',
      email: 'main@demo.com',
      phone: '+919999990001',
      addressLine1: '100 Demo Street',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'IN',
      postalCode: '380001',
      timezone: 'Asia/Kolkata',
    },
  });
  context.demo.outletId = outlet.id;

  for (const [index, name] of KITCHEN_STATIONS.entries()) {
    const code = name.toUpperCase().replaceAll(' ', '_');
    const station = await context.prisma.kitchenStation.upsert({
      where: { tenantId_outletId_code: { tenantId, outletId: outlet.id, code } },
      update: { name, displayOrder: index + 1, isActive: true, deletedAt: null },
      create: {
        tenantId,
        outletId: outlet.id,
        name,
        code,
        displayOrder: index + 1,
      },
    });
    context.demo.stationIds[name] = station.id;
  }
  console.log('014: seeded Main Branch and five kitchen stations.');
}
