const { PrismaClient } = require("./prisma/generated/client");
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const totalUsers = await prisma.user.count();
    const customers = await prisma.user.findMany({
      where: { role: { name: { contains: 'customer', mode: 'insensitive' } } },
      include: { role: true }
    });
    console.log("TOTAL USERS:", totalUsers);
    console.log("CUSTOMERS FOUND:", customers.length);
    console.log("CUSTOMERS:", JSON.stringify(customers.map(c => ({ id: c.id, name: c.name, email: c.email, role: c.role?.name })), null, 2));
  } catch (error) {
    console.error("DB ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
