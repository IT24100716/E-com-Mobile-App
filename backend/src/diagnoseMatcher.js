const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { isVariantMatch } = require("./utils/variantMatcher");

async function diagnose() {
  try {
    const recentOrders = await prisma.order.findMany({
      take: 1,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    for (const order of recentOrders) {
      console.log(`Order: ${order.id}`);
      for (const item of order.items) {
        console.log(`\nProduct: ${item.product.name}`);
        console.log(`Payload Attributes: ${JSON.stringify(item.variantAttributes)}`);
        
        if (item.product.variants && item.product.variants.length > 0) {
          item.product.variants.forEach((v, idx) => {
            const match = isVariantMatch(v.attributes, item.variantAttributes);
            console.log(` Variant ${idx} attrs: ${JSON.stringify(v.attributes)}`);
            console.log(` --> Match? ${match}`);
          });
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
