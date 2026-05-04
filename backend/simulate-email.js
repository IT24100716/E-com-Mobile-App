const ordersService = require("./src/modules/orders/orders.service");
const prisma = require("./src/config/prisma");
require("dotenv").config();

async function simulateOrderEmail() {
  try {
    console.log("Fetching a recent order for simulation...");
    const order = await prisma.order.findFirst({
      where: { isDeleted: false },
      include: { 
        items: { include: { product: true } }, 
        payment: true, 
        orderDiscount: true,
        user: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!order) {
      console.log("❌ No orders found in database to simulate with.");
      return;
    }

    console.log(`Found order #${order.id.slice(-8)}. Attempting to trigger email...`);
    
    // We call the private method using the instance
    // Note: In Node.js, we can't easily call private methods from outside, 
    // so we'll temporarily make it public or use a wrapper if needed.
    // For this test, I'll just manually call the logic inside.
    
    // Since we can't call # methods from outside, let's just test the sendEmail directly with the order's email
    const { sendEmail } = require("./src/config/mailer");
    
    console.log(`Testing direct sendEmail to: ${order.contactEmail}`);
    
    await sendEmail(
      order.contactEmail,
      "Simulated Order Update",
      "This is a test of the order email system.",
      "<h1>Test</h1><p>Your order is being processed.</p>"
    );
    
    console.log("✅ Simulation successful!");
  } catch (error) {
    console.error("❌ Simulation failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

simulateOrderEmail();
