const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function checkSexAttribute() {
  try {
    const products = await prisma.product.findMany({
      take: 20,
    });
    products.forEach(p => {
      let sex = "Not Found";
      if (p.variants && Array.isArray(p.variants)) {
        for (const v of p.variants) {
          const attrs = v.attributes || v;
          const found = Object.keys(attrs).find(k => k.toLowerCase() === 'sex' || k.toLowerCase() === 'gender');
          if (found) {
            sex = attrs[found];
            break;
          }
        }
      }
      console.log(`Product: ${p.name} | CategoryID: ${p.categoryId} | Sex: ${sex} | Stock: ${p.stock}`);
    });
  } catch (error) {
    console.error("ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSexAttribute();
