const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const customers = await prisma.user.findMany({
      where: { role: { name: 'Customer' } },
      include: { loyaltyTransactions: true }
    });
    console.log(`Found ${customers.length} Customers.`);
    customers.forEach(c => {
      console.log(`- ${c.name}: ${c.loyaltyTransactions.length} transactions`);
    });

    const allTx = await prisma.loyaltyTransaction.findMany({
      include: { user: true }
    });
    console.log(`Total loyalty transactions: ${allTx.length}`);
  } catch (err) {
    console.error('Prisma Error:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
