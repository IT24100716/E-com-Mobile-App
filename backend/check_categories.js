const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function checkCategories() {
  try {
    const categories = await prisma.category.findMany();
    console.log("CATEGORIES:", JSON.stringify(categories.map(c => ({ id: c.id, name: c.name })), null, 2));
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategories();
