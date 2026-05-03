const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst({ where: { role: { name: 'Customer' } } });
    if (!user) {
      console.log('No customer found to test with.');
      return;
    }
    console.log(`Testing with user: ${user.name} (${user.id})`);
    
    const data = {
      userId: user.id,
      points: 10,
      type: 'admin_reward',
      reason: 'Test manual award'
    };
    
    const tx = await prisma.loyaltyTransaction.create({
      data,
      include: { user: true }
    });
    console.log('Transaction created successfully:', tx.id);
  } catch (err) {
    console.error('Prisma Create Error:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
