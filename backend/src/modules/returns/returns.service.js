const prisma = require("../../config/prisma");
const { sendEmail } = require("../../config/mailer");
const { isVariantMatch } = require("../../utils/variantMatcher");
const notificationsService = require("../notifications/notifications.service");

class ReturnsService {
  async create(data) {
    return prisma.return.create({
      data,
      include: { 
        items: { include: { product: true } }, 
        order: { include: { user: true } } 
      }
    });
  }

  async getAll(skip = 0, take = 10) {
    return prisma.return.findMany({
      include: { 
        items: { include: { product: true } }, 
        order: { include: { user: true, items: { include: { product: true } } } } 
      },
      skip,
      take,
      orderBy: { createdAt: "desc" }
    });
  }

  async getById(id) {
    return prisma.return.findUnique({
      where: { id },
      include: { 
        items: { include: { product: true } }, 
        order: { include: { user: true, items: { include: { product: true } } } } 
      }
    });
  }

  async updateStatus(id, status) {
    const returnReq = await prisma.return.findUnique({
      where: { id },
      include: { items: true, order: { include: { user: true } } }
    });

    if (!returnReq) throw new Error("Return not found");

    // If return picked, restore stock (items physically collected from customer)
    if (status === "return picked" && returnReq.status !== "return picked") {
      await this.#restoreStock(returnReq.items);
    }

    const updated = await prisma.return.update({
      where: { id },
      data: { status },
      include: { 
        items: { include: { product: true } }, 
        order: { include: { user: true } } 
      }
    });

    // Send email notification (fire-and-forget)
    this.#sendReturnStatusEmail(updated).catch(console.error);

    return updated;
  }

  async #restoreStock(items) {
    console.log(`[RestoreStock] Starting stock restoration for ${items.length} item(s)...`);
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        console.log(`[RestoreStock] ❌ Product ${item.productId} not found, skipping`);
        continue;
      }

      console.log(`[RestoreStock] Processing: "${product.name}" (qty: ${item.quantity})`);

      if (item.variantAttributes && Array.isArray(product.variants) && product.variants.length > 0) {
        // Clean attributes for fallback isVariantMatch comparison
        const rawAttrs = item.variantAttributes || {};
        const { id: _id, stock: _stock, priceAdj: _priceAdj, ...cleanAttrs } = rawAttrs;

        let variantMatched = false;
        const updatedVariants = product.variants.map((v) => {
          if (variantMatched) return v;

          // Robust Matching Logic (mirrors OrdersService for consistency)
          // vAttrs handles both nested ({attributes: {...}}) and flat variant structures
          const vAttrs = v.attributes || v;

          // 1. Try matching by unique variant ID first (most reliable)
          // 2. Fallback to attribute matching if ID is missing or doesn't match
          const matchResult = rawAttrs.id 
            ? v.id === rawAttrs.id 
            : isVariantMatch(vAttrs, cleanAttrs);

          if (matchResult) {
            variantMatched = true;
            const currentStock = parseInt(v.stock) || 0;
            const newStock = currentStock + parseInt(item.quantity);
            console.log(`[RestoreStock]   ✅ MATCHED! Variant: ${v.id || 'N/A'}. Stock: ${currentStock} -> ${newStock}`);
            return { ...v, stock: newStock };
          }
          return v;
        });

        if (!variantMatched) {
          console.log(`[RestoreStock] ⚠️ No variant matched for "${product.name}", falling back to total stock update`);
          const newTotalStock = (parseInt(product.stock) || 0) + parseInt(item.quantity);
          await prisma.product.update({
            where: { id: product.id },
            data: { stock: newTotalStock }
          });
        } else {
          // Recalculate total stock from variants to ensure perfect synchronization
          const newTotalStock = updatedVariants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
          await prisma.product.update({
            where: { id: product.id },
            data: { 
              variants: updatedVariants, 
              stock: newTotalStock 
            }
          });
          console.log(`[RestoreStock] ✅ Synchronized variants. "${product.name}" total stock: ${newTotalStock}`);
        }
      } else {
        // No variants, simple total stock update
        const newTotalStock = (parseInt(product.stock) || 0) + parseInt(item.quantity);
        await prisma.product.update({
          where: { id: product.id },
          data: { stock: newTotalStock }
        });
        console.log(`[RestoreStock] ✅ (No variants) "${product.name}" stock: ${newTotalStock}`);
      }
    }
    console.log(`[RestoreStock] Stock restoration complete.`);
  }

  async #sendReturnStatusEmail(returnReq) {
    const { order, items, status, reason } = returnReq;
    const user = order.user;
    if (!user || !user.email) return;

    const statusInfo = {
      approved: { label: "Approved ✅", color: "#10b981", msg: "Your return request has been approved. The item amounts have been credited back to our stock, and we will process any necessary refunds shortly." },
      rejected: { label: "Rejected ❌", color: "#ef4444", msg: "Your return request was not approved. If you have questions, please contact our support team." },
      pending: { label: "Pending ⏳", color: "#f59e0b", msg: "Your return request is currently under review." },
      "return picked": { label: "Picked Up 🚛", color: "#3b82f6", msg: "Your return items have been picked up from your location. We will notify you once the items are received and inspected." }
    };

    const info = statusInfo[status] || statusInfo.pending;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333; text-transform: uppercase; letter-spacing: 1px;">Return Update</h2>
        <p>Hello ${user.name},</p>
        <p>One of your return requests for order <b>#${order.id.slice(-8).toUpperCase()}</b> has been updated.</p>
        
        <div style="background: #fafafa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Status:</p>
          <p style="margin: 5px 0 0; font-weight: bold; color: ${info.color}; text-transform: uppercase;">${info.label}</p>
        </div>

        <p>${info.msg}</p>

        <h3 style="font-size: 14px; text-transform: uppercase;">Returned Items:</h3>
        <ul style="list-style: none; padding: 0;">
          ${items.map(i => `
            <li style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
              <div style="font-weight: bold; color: #111; font-size: 14px;">${i.product?.name || 'Product'}</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">
                Quantity: <b>${i.quantity}</b> 
                ${i.variantAttributes ? `| Variants: <b>${Object.entries(i.variantAttributes).map(([k,v]) => `${k}: ${v}`).join(', ')}</b>` : ''}
              </div>
            </li>
          `).join('')}
        </ul>

        <p style="font-size: 12px; color: #999; margin-top: 30px;">
          This is an automated message. Please do not reply.
        </p>
      </div>
    `;

    await sendEmail(user.email, `Return Update - #${order.id.slice(-8).toUpperCase()}`, info.msg, html);
  }

  async getTotalCount() {
    return prisma.return.count();
  }

  async createByUser(userId, orderId, reason, items, imageUrl = null) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) throw new Error("Order not found");
    if (order.userId !== userId) throw new Error("Unauthorized");
    if (order.status !== "delivered") throw new Error("Only delivered orders can be returned");

    // 7-day validation
    if (order.deliveredAt) {
      const deliveredDate = new Date(order.deliveredAt);
      const now = new Date();
      const diffTime = Math.abs(now - deliveredDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 7) {
        throw new Error("Return period has expired (7 days max)");
      }
    } else {
      // Fallback for orders delivered before we added deliveredAt
      const createdAt = new Date(order.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now - createdAt);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 30) {
        throw new Error("Return window expired");
      }
    }

    if (!items || items.length === 0) throw new Error("Select at least one item to return");

    return prisma.$transaction(async (tx) => {
      // Create the return record
      const returnRequest = await tx.return.create({
        data: {
          orderId,
          reason,
          status: "pending",
          imageUrl,
          items: {
            create: items.map(item => {
              const orderItem = order.items.find(oi => oi.productId === item.productId);
              return {
                productId: item.productId,
                quantity: item.quantity,
                price: orderItem?.price || null,
                variantAttributes: item.variantAttributes
              };
            })
          }
        },
        include: { 
          items: { include: { product: true } }, 
          order: { include: { user: true } } 
        }
      });

      // 3. Trigger notification for Order Managers
      await notificationsService.create({
        type: 'RETURN_REQUEST',
        title: 'New Return Request',
        message: `Order #${order.id.slice(-8).toUpperCase()} has a new return request for ${items.length} item(s).`,
        link: `/admin/returns?viewId=${returnRequest.id}`
      });

      return returnRequest;
    });
  }

  async deleteByUser(id, userId) {
    const returnReq = await prisma.return.findUnique({
      where: { id },
      include: { order: true }
    });
    if (!returnReq) throw new Error("Return not found");
    if (returnReq.order.userId !== userId) throw new Error("Unauthorized");
    if (returnReq.status !== "pending") throw new Error("Can only cancel pending returns");

    return prisma.return.delete({ where: { id } });
  }

  async delete(id) {
    return prisma.return.delete({ where: { id } });
  }
}

module.exports = new ReturnsService();
