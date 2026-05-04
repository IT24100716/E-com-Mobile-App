const prisma = require("./src/config/prisma");

async function checkOrders() {
  try {
    const orders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        contactEmail: true,
        status: true,
        total: true,
      }
    });

    console.log("Recent Orders Check:");
    orders.forEach(o => {
      console.log(`Order #${o.id.slice(-8)} | Email: ${o.contactEmail} | Status: ${o.status}`);
    });
  } catch (error) {
    console.error("Error checking orders:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrders();
