const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function checkMensPants() {
  try {
    const products = await prisma.product.findMany({
      where: { category: { name: { contains: "Mens Pants" } } },
      include: { category: true }
    });
    console.log("PRODUCTS:", JSON.stringify(products, null, 2));
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMensPants();
