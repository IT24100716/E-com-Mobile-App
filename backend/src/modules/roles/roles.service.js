const prisma = require("../../config/prisma");

class RolesService {
  async create(data) {
    return prisma.role.create({
      data,
      include: { users: true },
    });
  }

  async getAll(skip = 0, take = 10) {
    return prisma.role.findMany({
      where: { isDeleted: false },
      include: { users: true },
      skip,
      take,
    });
  }

  async getById(id) {
    return prisma.role.findUnique({
      where: { id },
      include: { users: true },
    });
  }

  async update(id, data) {
    return prisma.role.update({
      where: { id },
      data,
      include: { users: true },
    });
  }

  async delete(id) {
    return prisma.role.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async getTotalCount() {
    return prisma.role.count({ where: { isDeleted: false } });
  }
}

module.exports = new RolesService();
