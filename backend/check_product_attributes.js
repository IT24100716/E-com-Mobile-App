const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function checkProductAttributes() {
  try {
    const products = await prisma.product.findMany({
      take: 5,
      include: { category: true }
    });
    console.log("PRODUCTS:", JSON.stringify(products.map(p => ({ 
      id: p.id, 
      name: p.name, 
      category: p.category?.name,
      stock: p.stock,
      variants: p.variants 
    })), null, 2));
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProductAttributes();
