const prisma = require("../../config/prisma");
class LoyaltyService {
  async addPoints(data) { 
    console.log("[LoyaltyService] Adding points with data:", JSON.stringify(data, null, 2));
    try {
      const { userId, ...transactionData } = data;
      const tx = await prisma.loyaltyTransaction.create({ 
        data: {
          ...transactionData,
          user: { connect: { id: userId } }
        }, 
        include: { user: true } 
      }); 
      // Notify manager
      const notificationsService = require("../notifications/notifications.service");
      await notificationsService.create({
        type: 'LOYALTY',
        title: 'Points Awarded',
        message: `${tx.points} points were awarded to ${tx.user.name}.`,
        link: `/admin/loyalty`
      }).catch(console.error);
      return tx;
    } catch (error) {
      console.error("[LoyaltyService] Error adding points:", error);
      throw error;
    }
  }
  async getBalance(userId) { const sum = await prisma.loyaltyTransaction.aggregate({ where: { userId }, _sum: { points: true } }); return sum._sum.points || 0; }
  async getHistory(userId, skip = 0, take = 10) { return prisma.loyaltyTransaction.findMany({ where: { userId }, skip, take, orderBy: { createdAt: "desc" } }); }
  async getAll(skip = 0, take = 10) { return prisma.loyaltyTransaction.findMany({ include: { user: true }, skip, take, orderBy: { createdAt: "desc" } }); }
  async update(id, data) { return prisma.loyaltyTransaction.update({ where: { id }, data, include: { user: true } }); }
  async delete(id) { return prisma.loyaltyTransaction.delete({ where: { id } }); }
  async redeemPoints(userId, points, orderId) {
    // Validate user has enough points
    const balance = await this.getBalance(userId);
    if (balance < points) {
      throw new Error("Insufficient points");
    }

    // Create negative transaction (deduction)
    const tx = await prisma.loyaltyTransaction.create({
      data: {
        userId,
        points: -points,  // Negative for deduction
        type: "redeemed",
        orderId
      },
      include: { user: true }
    });

    // Notify manager
    const notificationsService = require("../notifications/notifications.service");
    await notificationsService.create({
      type: 'LOYALTY',
      title: 'Points Redeemed',
      message: `${points} points were redeemed by ${tx.user.name}.`,
      link: `/admin/loyalty`
    }).catch(console.error);

    return tx;
  }
  async getMembers() {
    const users = await prisma.user.findMany({
      where: { role: { name: { contains: 'customer', mode: 'insensitive' } }, isDeleted: false },
      take: 1000,
      orderBy: { createdAt: 'desc' },
      include: {
        loyaltyTransactions: true
      }
    });

    return users.map(user => {
      const earned = user.loyaltyTransactions
        .filter(t => t.points > 0)
        .reduce((sum, t) => sum + t.points, 0);
      const redeemed = user.loyaltyTransactions
        .filter(t => t.points < 0)
        .reduce((sum, t) => sum + Math.abs(t.points), 0);
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        earned,
        redeemed,
        balance: earned - redeemed,
        createdAt: user.createdAt
      };
    });
  }
}
module.exports = new LoyaltyService();
