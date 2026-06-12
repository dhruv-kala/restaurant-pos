import { CustomerSource, CustomerType, OrderStatus, OrderType } from '@prisma/client';
import { requireDemoValue, seedUuid, SeedContext } from './seed-context';

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun',
  'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Ananya', 'Diya', 'Aadhya', 'Myra', 'Sara',
  'Ira', 'Riya', 'Meera', 'Tara', 'Kavya',
] as const;

export async function seedDemoCustomers(context: SeedContext): Promise<void> {
  const tenantId = requireDemoValue(context.demo.tenantId, 'tenant');
  const outletId = requireDemoValue(context.demo.outletId, 'outlet');
  const customerTypes = [
    CustomerType.WALK_IN,
    CustomerType.REGULAR,
    CustomerType.VIP,
    CustomerType.CORPORATE,
    CustomerType.DELIVERY,
  ];

  for (const [index, firstName] of FIRST_NAMES.entries()) {
    const customerNumber = index + 1;
    const phone = `+91980000${customerNumber.toString().padStart(4, '0')}`;
    const customer = await context.prisma.customer.upsert({
      where: { tenantId_phone: { tenantId, phone } },
      update: {
        firstName,
        lastName: 'Demo',
        displayName: `${firstName} Demo`,
        email: `customer${customerNumber}@demo.com`,
        customerType: customerTypes[index % customerTypes.length],
        source: CustomerSource.POS,
        deletedAt: null,
      },
      create: {
        tenantId,
        firstName,
        lastName: 'Demo',
        displayName: `${firstName} Demo`,
        phone,
        email: `customer${customerNumber}@demo.com`,
        customerType: customerTypes[index % customerTypes.length],
        source: CustomerSource.POS,
      },
    });

    const visitCount = (index % 4) + 1;
    let totalSpend = 0;
    let firstVisitAt: Date | undefined;
    let lastVisitAt: Date | undefined;
    for (let visitIndex = 0; visitIndex < visitCount; visitIndex += 1) {
      const spend = 25000 + index * 3500 + visitIndex * 5000;
      totalSpend += spend;
      const visitDate = new Date(Date.UTC(2026, 0, 5 + index + visitIndex * 7, 13, 0, 0));
      firstVisitAt ??= visitDate;
      lastVisitAt = visitDate;
      const orderNumber = `DEMO-CUST-${customerNumber.toString().padStart(2, '0')}-${visitIndex + 1}`;
      const order = await context.prisma.order.upsert({
        where: { tenantId_outletId_orderNumber: { tenantId, outletId, orderNumber } },
        update: {
          customerId: customer.id,
          businessDate: visitDate,
          orderType: OrderType.TAKEAWAY,
          status: OrderStatus.COMPLETED,
          subtotal: spend,
          grandTotal: spend,
          completedAt: visitDate,
        },
        create: {
          tenantId,
          outletId,
          customerId: customer.id,
          orderNumber,
          businessDate: visitDate,
          orderType: OrderType.TAKEAWAY,
          status: OrderStatus.COMPLETED,
          currencyCode: 'INR',
          subtotal: spend,
          grandTotal: spend,
          completedAt: visitDate,
        },
      });
      const visitId = seedUuid(6000 + index * 10 + visitIndex);
      await context.prisma.customerVisit.upsert({
        where: { tenantId_id: { tenantId, id: visitId } },
        update: {
          outletId,
          customerId: customer.id,
          orderId: order.id,
          businessDate: visitDate,
          visitDate,
          totalSpend: spend,
        },
        create: {
          id: visitId,
          tenantId,
          outletId,
          customerId: customer.id,
          orderId: order.id,
          businessDate: visitDate,
          visitDate,
          totalSpend: spend,
        },
      });
    }
    await context.prisma.customerStats.upsert({
      where: { tenantId_customerId: { tenantId, customerId: customer.id } },
      update: {
        totalOrders: visitCount,
        totalSpend,
        averageOrderValue: Math.round(totalSpend / visitCount),
        firstVisitAt,
        lastVisitAt,
        favoriteOutletId: outletId,
      },
      create: {
        tenantId,
        customerId: customer.id,
        totalOrders: visitCount,
        totalSpend,
        averageOrderValue: Math.round(totalSpend / visitCount),
        firstVisitAt,
        lastVisitAt,
        favoriteOutletId: outletId,
      },
    });
  }
  console.log('020: seeded 20 customers with varied visit and spend history.');
}
