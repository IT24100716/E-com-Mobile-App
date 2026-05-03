const prisma = require("../../config/prisma");
const activitiesService = require("../activities/activities.service");

class NotificationsService {
    async create(data) {
        return await prisma.notification.create({
            data: {
                type: data.type,
                title: data.title,
                message: data.message,
                link: data.link,
            }
        });
    }

    _buildRoleWhereClause(role) {
        if (!role) return { type: { in: ['SYSTEM'] } }; // Failsafe for missing or legacy tokens
        const safeRole = role.toUpperCase().trim();

        if (safeRole === "ADMIN" || safeRole === "SUPER ADMIN") {
            return {}; // Unrestricted access
        } else if (safeRole === "PRODUCT MANAGER") {
            return { type: { in: ['LOW_STOCK', 'RESTOCK', 'TOP_SELLING', 'SYSTEM'] } };
        } else if (safeRole === "ORDER MANAGER") {
            return { type: { in: ['NEW_ORDER', 'RETURN_REQUEST', 'SYSTEM'] } };
        } else if (safeRole === "REVIEW MANAGER") {
            return { type: { in: ['REVIEW', 'RETURN_REQUEST', 'SYSTEM'] } };
        } else if (safeRole === "SUPPLIER MANAGER") {
            return { type: { in: ['SYSTEM', 'NEW_SUPPLIER', 'SUPPLIER_UPDATE', 'RESTOCK_REQUEST'] } };
        } else if (safeRole === "LOYALTY MANAGER") {
            return { type: { in: ['LOYALTY', 'SYSTEM'] } };
        }

        return { type: { in: ['SYSTEM'] } }; // Absolute default lockdown
    }

    async getAll(role) {
        const whereClause = this._buildRoleWhereClause(role);
        return await prisma.notification.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 20
        });
    }

    async markAsRead(id) {
        return await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
    }

    async markAllAsRead(role) {
        const whereRole = this._buildRoleWhereClause(role);
        return await prisma.notification.updateMany({
            where: { isRead: false, ...whereRole },
            data: { isRead: true }
        });
    }

    async delete(id) {
        return await prisma.notification.delete({
            where: { id }
        });
    }

    async clearAll(role) {
        const whereRole = this._buildRoleWhereClause(role);
        return await prisma.notification.deleteMany({
            where: whereRole
        });
    }

    // Low Stock Logic
    async checkLowStock(product) {
        if (product.stock <= 10) {
            // Check if a recent LOW_STOCK notification already exists to avoid spam
            const existing = await prisma.notification.findFirst({
                where: {
                    type: 'LOW_STOCK',
                    link: `/admin/products?search=${encodeURIComponent(product.name)}`,
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24h
                    }
                }
            });

            if (!existing) {
                await this.create({
                    type: 'LOW_STOCK',
                    title: 'Stock Warning',
                    message: `${product.name} is running low on stock (${product.stock} left).`,
                    link: `/admin/products?viewId=${product.id}`
                });

                // Dedicated alert for Supplier Managers
                await this.create({
                    type: 'RESTOCK_REQUEST',
                    title: 'Restock Action Required',
                    message: `Inventory depleted: Please coordinate a restock order for ${product.name}.`,
                    link: `/admin/products?viewId=${product.id}`
                });

                // Also log to Activity History
                await activitiesService.log({
                    type: 'ALERT',
                    action: 'LOW_STOCK',
                    targetId: product.id,
                    targetName: product.name,
                    message: `Low Stock Alert: ${product.name} has only ${product.stock} units left.`,
                    details: { currentStock: product.stock }
                });
            }
        }
    }

    // Restock Logic
    async checkRestock(product, oldStock) {
        if (oldStock <= 0 && product.stock > 0) {
            await this.create({
                type: 'RESTOCK',
                title: 'Inventory Replenished',
                message: `${product.name} is back in stock! (${product.stock} units available).`,
                link: `/admin/products?viewId=${product.id}`
            });

            // Also log to Activity History
            await activitiesService.log({
                type: 'ALERT',
                action: 'RESTOCK',
                targetId: product.id,
                targetName: product.name,
                message: `Restock Alert: ${product.name} is back in stock with ${product.stock} units.`,
                details: { oldStock, currentStock: product.stock }
            });
        }
    }
}

module.exports = new NotificationsService();
