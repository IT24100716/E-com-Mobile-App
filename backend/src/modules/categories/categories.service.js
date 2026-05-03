const prisma = require("../../config/prisma");
const activitiesService = require("../activities/activities.service");

class CategoriesService {
  async create(data, user) {
    // Check if category with same name already exists (and is not deleted)
    if (data.name) {
      const existing = await prisma.category.findFirst({
        where: {
          name: { equals: data.name, mode: 'insensitive' },
          isDeleted: false
        }
      });
      if (existing) {
        throw new Error(`Category "${data.name}" already exists`);
      }
    }
    const category = await prisma.category.create({ data });

    // Log activity
    await activitiesService.log({
      type: 'ACTION',
      action: 'CREATE_CATEGORY',
      userId: user?.id,
      userName: user?.name,
      roleName: user?.role?.name,
      targetId: category.id,
      targetName: category.name,
      message: `Collection "${category.name}" created by ${user?.name || 'System'}`,
      details: { description: category.description }
    });

    return category;
  }

  async getAll(skip = 0, take = 10, activeOnly = false) {
    const where = {
      isDeleted: false,
      ...(activeOnly ? { isActive: { not: false } } : {}),
    };
    return prisma.category.findMany({
      where,
      include: { products: true },
      skip,
      take,
      orderBy: { createdAt: 'desc' }
    });
  }

  async getById(id) {
    return prisma.category.findUnique({
      where: { id },
      include: { products: true }
    });
  }

  async update(id, data, user) {
    // Check if renamed to an existing category name
    if (data.name) {
      const existing = await prisma.category.findFirst({
        where: {
          name: { equals: data.name, mode: 'insensitive' },
          isDeleted: false,
          NOT: { id }
        }
      });
      if (existing) {
        throw new Error(`Category "${data.name}" already exists`);
      }
    }
    const updatedCategory = await prisma.category.update({
      where: { id },
      data,
      include: { products: true }
    });

    // Log activity
    await activitiesService.log({
      type: 'ACTION',
      action: 'UPDATE_CATEGORY',
      userId: user?.id,
      userName: user?.name,
      roleName: user?.role?.name,
      targetId: updatedCategory.id,
      targetName: updatedCategory.name,
      message: `Collection "${updatedCategory.name}" updated by ${user?.name || 'System'}`,
      details: { changes: Object.keys(data) }
    });

    return updatedCategory;
  }

  async delete(id, user) {
    const category = await this.getById(id);
    const deletedCategory = await prisma.category.update({
      where: { id },
      data: { isDeleted: true }
    });

    // Log activity
    await activitiesService.log({
      type: 'ACTION',
      action: 'DELETE_CATEGORY',
      userId: user?.id,
      userName: user?.name,
      roleName: user?.role?.name,
      targetId: id,
      targetName: category?.name,
      message: `Collection "${category?.name || id}" deleted by ${user?.name || 'System'}`,
    });

    return deletedCategory;
  }

  async toggleStatus(id) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new Error("Category not found");
    return prisma.category.update({
      where: { id },
      data: { isActive: category.isActive === false ? true : false },
    });
  }

  async getTotalCount() {
    return prisma.category.count({ where: { isDeleted: false } });
  }
}

module.exports = new CategoriesService();
