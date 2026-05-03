const prisma = require("../../config/prisma");
const notificationsService = require("../notifications/notifications.service");
const activitiesService = require("../activities/activities.service");

class SuppliersService {
  async create(data, user) {
    const supplier = await prisma.supplier.create({
      data,
      include: { products: true },
    });

    await notificationsService.create({
      type: 'NEW_SUPPLIER',
      title: 'New Supply Partner',
      message: `${supplier.name} has been officially registered.`,
      link: `/admin/suppliers`
    });

    await activitiesService.log({
      type: 'ACTION',
      action: 'CREATE_SUPPLIER',
      userId: user?.id,
      userName: user?.name,
      roleName: user?.role,
      targetId: supplier.id,
      targetName: supplier.name,
      message: `Registered new supplier: ${supplier.name}`
    });

    return supplier;
  }

  async getAll(skip = 0, take = 10) {
    return prisma.supplier.findMany({
      include: { products: true },
      skip,
      take,
      orderBy: {
        id: 'desc'
      }
    });
  }

  async getById(id) {
    return prisma.supplier.findUnique({
      where: { id },
      include: { products: true },
    });
  }

  async update(id, data, user) {
    const supplier = await prisma.supplier.update({
      where: { id },
      data,
      include: { products: true },
    });

    await notificationsService.create({
      type: 'SUPPLIER_UPDATE',
      title: 'Supplier Profile Updated',
      message: `${supplier.name}'s business meta-data has been modified.`,
      link: `/admin/suppliers`
    });

    await activitiesService.log({
      type: 'ACTION',
      action: 'UPDATE_SUPPLIER',
      userId: user?.id,
      userName: user?.name,
      roleName: user?.role,
      targetId: supplier.id,
      targetName: supplier.name,
      message: `Updated supplier details: ${supplier.name}`
    });

    return supplier;
  }

  async delete(id, user) {
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    await prisma.supplier.delete({
      where: { id },
    });

    if (supplier) {
      await activitiesService.log({
        type: 'ACTION',
        action: 'DELETE_SUPPLIER',
        userId: user?.id,
        userName: user?.name,
        roleName: user?.role,
        targetId: supplier.id,
        targetName: supplier.name,
        message: `Deleted supplier: ${supplier.name}`
      });
    }
  }

  async getTotalCount() {
    return prisma.supplier.count();
  }
}

module.exports = new SuppliersService();
