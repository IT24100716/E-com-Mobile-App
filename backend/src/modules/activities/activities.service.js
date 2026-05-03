const prisma = require("../../config/prisma");

class ActivitiesService {
    async log({ type, action, userId, userName, roleName, targetId, targetName, message, details }) {
        try {
            return await prisma.activity.create({
                data: {
                    type,
                    action,
                    userId,
                    userName,
                    roleName,
                    targetId,
                    targetName,
                    message,
                    details: details ? JSON.parse(JSON.stringify(details)) : null
                }
            });
        } catch (error) {
            console.error("❌ Failed to log activity:", error);
            // Don't throw, we don't want to break the main flow if logging fails
        }
    }

    _buildRoleWhereClause(role) {
        let where = { isDeleted: false };
        if (!role) return where;

        const safeRole = role.toUpperCase().trim();
        if (safeRole === "ADMIN" || safeRole === "SUPER ADMIN") {
            return where; // Unrestricted access
        } else if (safeRole === "PRODUCT MANAGER") {
            where.action = { in: ['CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT', 'LOW_STOCK', 'RESTOCK'] };
        } else if (safeRole === "SUPPLIER MANAGER") {
            where.action = { in: ['CREATE_SUPPLIER', 'UPDATE_SUPPLIER', 'DELETE_SUPPLIER', 'RESTOCK_REQUEST'] };
        }
        return where;
    }

    async getAll(skip = 0, take = 50, search = "", role = null) {
        let where = this._buildRoleWhereClause(role);
        if (search) {
            where = {
                ...where,
                OR: [
                    { message: { contains: search, mode: 'insensitive' } },
                    { userName: { contains: search, mode: 'insensitive' } },
                    { targetName: { contains: search, mode: 'insensitive' } },
                    { action: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        return await prisma.activity.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' }
        });
    }

    async getByUser(userId, skip = 0, take = 50) {
        return await prisma.activity.findMany({
            where: { userId, isDeleted: false },
            skip,
            take,
            orderBy: { createdAt: 'desc' }
        });
    }

    async getTotalCount(search = "", role = null) {
        let where = this._buildRoleWhereClause(role);
        if (search) {
            where = {
                ...where,
                OR: [
                    { message: { contains: search, mode: 'insensitive' } },
                    { userName: { contains: search, mode: 'insensitive' } },
                    { targetName: { contains: search, mode: 'insensitive' } },
                    { action: { contains: search, mode: 'insensitive' } }
                ]
            };
        }
        return await prisma.activity.count({ where });
    }

    async clearAll(role = null) {
        const where = this._buildRoleWhereClause(role);
        return await prisma.activity.updateMany({
            where: where,
            data: { isDeleted: true }
        });
    }

    async deleteById(id) {
        return await prisma.activity.update({
            where: { id },
            data: { isDeleted: true }
        });
    }
}

module.exports = new ActivitiesService();
