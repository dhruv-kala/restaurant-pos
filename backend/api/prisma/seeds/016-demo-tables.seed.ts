import { requireDemoValue, SeedContext } from './seed-context';

export async function seedDemoTables(context: SeedContext): Promise<void> {
  const tenantId = requireDemoValue(context.demo.tenantId, 'tenant');
  const outletId = requireDemoValue(context.demo.outletId, 'outlet');
  const section = await context.prisma.tableSection.upsert({
    where: { tenantId_outletId_name: { tenantId, outletId, name: 'Main Dining' } },
    update: { description: 'Primary demo dining area', isActive: true, deletedAt: null },
    create: {
      tenantId,
      outletId,
      name: 'Main Dining',
      description: 'Primary demo dining area',
    },
  });
  const capacities = [2, 4, 4, 6, 8];
  for (let index = 1; index <= 20; index += 1) {
    const tableNumber = `T${index}`;
    await context.prisma.diningTable.upsert({
      where: { tenantId_outletId_tableNumber: { tenantId, outletId, tableNumber } },
      update: {
        sectionId: section.id,
        displayName: `Table ${index}`,
        capacity: capacities[(index - 1) % capacities.length],
        isActive: true,
        deletedAt: null,
      },
      create: {
        tenantId,
        outletId,
        sectionId: section.id,
        tableNumber,
        displayName: `Table ${index}`,
        capacity: capacities[(index - 1) % capacities.length],
        xPosition: ((index - 1) % 5) * 160,
        yPosition: Math.floor((index - 1) / 5) * 120,
      },
    });
  }
  console.log('016: seeded tables T1 through T20.');
}
