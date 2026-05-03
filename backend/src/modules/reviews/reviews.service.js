const prisma = require("../../config/prisma");

class ReviewsService {
  async create(data, imageUrl) {
    const review = await prisma.review.create({
      data: {
        ...data,
        imageUrl,
      },
      include: { user: true, product: true },
    });

    // Trigger in-app notification for Review Manager
    const notificationsService = require("../notifications/notifications.service");
    await notificationsService.create({
      type: 'REVIEW',
      title: 'New Review',
      message: `${review.user.name} reviewed ${review.product.name} (${review.rating} stars).`,
      link: `/admin/reviews`
    }).catch(console.error);

    return review;
  }

  async getAll(skip = 0, take = 10, productId = null) {
    const where = { isDeleted: false };
    if (productId) where.productId = productId;

    return prisma.review.findMany({
      where,
      include: { user: true, product: true, order: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async getById(id) {
    return prisma.review.findUnique({
      where: { id },
      include: { user: true, product: true },
    });
  }

  async getByUser(userId, skip = 0, take = 10) {
    return prisma.review.findMany({
      where: { userId, isDeleted: false },
      include: { user: true, product: true },
      skip,
      take,
    });
  }

  async update(id, userId, data, imageUrl) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new Error("Review not found");
    if (review.userId !== userId) throw new Error("Unauthorized: Review does not belong to this user");

    const updateData = { ...data };
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    return prisma.review.update({
      where: { id },
      data: updateData,
      include: { user: true, product: true },
    });
  }

  async delete(id, user) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new Error("Review not found");

    const isOwner = review.userId === user.id;
    const isManager = user.role && (user.role.toLowerCase() === "admin");

    if (!isOwner && !isManager) {
      throw new Error("Unauthorized: You do not have permission to delete this review");
    }

    return prisma.review.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async getTotalCount(productId = null) {
    const where = { isDeleted: false };
    if (productId) where.productId = productId;
    return prisma.review.count({ where });
  }

  async reply(id, replyText) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new Error("Review not found");

    return prisma.review.update({
      where: { id },
      data: { reply: replyText },
      include: { user: true, product: true },
    });
  }
}

module.exports = new ReviewsService();
