const prisma = require("../../config/prisma");
const notificationsService = require("../notifications/notifications.service");

class RestockRequestService {
  async create(data, user) {
    const request = await prisma.restockRequest.create({
      data: {
        productId: data.productId,
        quantity: parseInt(data.quantity),
        variantDetails: data.variantDetails || null,
        notes: data.notes,
        requestedBy: user.id,
        status: "Pending",
      },
      include: {
        product: {
          include: {
            supplier: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Notify relevant Managers
    const isReturnRequest = data.notes?.includes("||META||");
    
    await notificationsService.create({
      type: 'RESTOCK_REQUEST',
      title: isReturnRequest ? 'New Replacement Request' : 'New Restock Request',
      message: isReturnRequest 
        ? `${user.name} requested a replacement for a returned item: ${request.product.name}.`
        : `${user.name} requested ${data.quantity} units of ${request.product.name}.`,
      link: isReturnRequest 
        ? `/admin/products?activeTab=return_process`
        : `/admin/suppliers?activeTab=restock`
    });

    return request;
  }

  async getAll(skip = 0, take = 10) {
    return await prisma.restockRequest.findMany({
      skip,
      take,
      include: {
        product: {
          include: {
            supplier: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getById(id) {
    return await prisma.restockRequest.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            supplier: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async updateStatus(id, status, extraNotes = null) {
    const current = await prisma.restockRequest.findUnique({ where: { id }, select: { notes: true } });
    
    let updatedNotes = current?.notes;
    if (extraNotes) {
      updatedNotes = `${current?.notes || ""}\n||FULFILLMENT||${JSON.stringify(extraNotes)}`;
    }

    const request = await prisma.restockRequest.update({
      where: { id },
      data: { 
        status,
        notes: updatedNotes
      },
      include: {
        product: {
          include: {
            supplier: true
          }
        },
        user: {
          select: {
            name: true
          }
        }
      },
    });

    // Notify Based on Status
    let notificationTitle = "";
    let notificationMessage = "";
    let notificationType = "SYSTEM";

    switch (status) {
      case "Approved":
        notificationTitle = "Restock Request Approved";
        notificationMessage = `Your request for ${request.product.name} has been approved by the Supplier Manager.`;
        notificationType = "RESTOCK";
        break;
      case "Processing":
        notificationTitle = "Restock in Progress";
        notificationMessage = `Supplier has started processing the restock for ${request.product.name}.`;
        notificationType = "RESTOCK";
        break;
      case "Completed":
        notificationTitle = "Restock Units Ready";
        notificationMessage = `The restock units for ${request.product.name} are ready for inventory addition.`;
        notificationType = "RESTOCK";
        break;
      case "Rejected":
        notificationTitle = "Restock Request Rejected";
        notificationMessage = `Your request for ${request.product.name} was declined.`;
        notificationType = "SYSTEM";
        break;
    }

    if (notificationTitle) {
      await notificationsService.create({
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        link: `/admin/products?activeTab=restock`
      });
    }

    return request;
  }

  async approve(id) {
    return await this.updateStatus(id, "Approved");
  }

  async process(id) {
    return await this.updateStatus(id, "Processing");
  }

  async complete(id) {
    return await this.updateStatus(id, "Completed");
  }

  async addToStock(id) {
    // 1. Fetch the request to get quantity and product ID
    const request = await prisma.restockRequest.findUnique({
      where: { id },
      include: {
        product: {
          include: {
            supplier: true
          }
        }
      },
    });

    if (!request) throw new Error("Restock request not found");
    if (request.status !== "Completed") throw new Error("Request must be completed before adding to stock");

    // 2. Perform transaction: Update product stock and update request status
    const result = await prisma.$transaction(async (tx) => {
      // Build update data for product
      const productUpdateData = {
        stock: {
          increment: request.quantity
        }
      };

      // Handle variant-specific stock updates if variantDetails exists
      if (request.variantDetails && Array.isArray(request.variantDetails) && request.product.variants) {
        const currentVariants = JSON.parse(JSON.stringify(request.product.variants));
        const requestedVariants = request.variantDetails;

        // Helper function for deep equality of variant attributes
        const isEqual = (obj1, obj2) => {
          if (obj1 === obj2) return true;
          if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) return false;
          const k1 = Object.keys(obj1);
          const k2 = Object.keys(obj2);
          if (k1.length !== k2.length) return false;
          for (let key of k1) {
            if (!isEqual(obj1[key], obj2[key])) return false;
          }
          return true;
        };

        requestedVariants.forEach(rv => {
          // Match by deep comparing the attributes object
          const match = currentVariants.find(v => {
            if (!v.attributes || !rv.attributes) return false;
            return isEqual(v.attributes, rv.attributes);
          });
          if (match) {
            match.stock = (match.stock || 0) + (rv.quantity || 0);
          }
        });

        productUpdateData.variants = currentVariants;
      }

      // Update product stock (and variants)
      const updatedProduct = await tx.product.update({
        where: { id: request.productId },
        data: productUpdateData
      });

      // Update request status to Closed/Fulfilled
      const updatedRequest = await tx.restockRequest.update({
        where: { id },
        data: { status: "Closed" },
        include: {
          product: {
            include: {
              supplier: true
            }
          }
        }
      });

      return { updatedRequest, updatedProduct };
    });

    // Notify about stock replenish
    await notificationsService.create({
      type: 'RESTOCK',
      title: 'Inventory Replenished',
      message: `${request.product.name} stock has been updated (+${request.quantity} units).`,
      link: `/admin/products?viewId=${request.productId}`
    });

    return result;
  }
}

module.exports = new RestockRequestService();
