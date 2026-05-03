const prisma = require("../../config/prisma");
class PaymentsService {
  async create(data) { return prisma.payment.create({ data, include: { order: { include: { orderDiscount: true } } } }); }
  async getAll(skip = 0, take = 10) { return prisma.payment.findMany({ include: { order: { include: { orderDiscount: true } } }, skip, take, orderBy: { createdAt: 'desc' } }); }
  async getById(id) { return prisma.payment.findUnique({ where: { id }, include: { order: { include: { orderDiscount: true } } } }); }
  async updateStatus(id, status) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id },
        data: { status },
        include: { order: true }
      });

      // If payment is marked as paid, update the associated order to confirmed
      if (status === "paid" && payment.orderId) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: "confirmed" }
        });
      }

      return payment;
    });
  }
  async getTotalCount() { return prisma.payment.count(); }
}
module.exports = new PaymentsService();
