const prisma = require("../../config/prisma");
const { sendEmail } = require("../../config/mailer");
const loyaltyService = require("../loyalty/loyalty.service");
const { isVariantMatch } = require("../../utils/variantMatcher");

class OrdersService {
  async create(userId, items, total, address, contactNumber, contactEmail, deliveryMethod, shippingFee = 0, couponCode = "", pointsUsed = 0) {
    // 0. Preliminary validation
    if (!contactNumber || !/^\d{10}$/.test(contactNumber)) {
      throw new Error("Invalid phone number. Must be exactly 10 digits (e.g., 0771234567)");
    }
    if (!address || address.trim().length < 10) {
      throw new Error("Address is too short. Please provide a full shipping address (min 10 chars)");
    }

    let coupon = null;
    let couponDiscount = 0;
    let pointsValue = 0;
    let finalTotal = total;

    // 1. Validate coupon if provided
    if (couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: { code: couponCode }
      });

      if (!coupon || coupon.isDeleted) {
        throw new Error("Invalid coupon code");
      }

      if (total < coupon.minCartValue) {
        throw new Error(`Cart value must be at least LKR ${coupon.minCartValue}`);
      }

      // One-time use check
      const usedCount = await prisma.orderDiscount.count({
        where: {
          couponId: coupon.id,
          order: {
            userId: userId,
            isDeleted: false
          }
        }
      });
      if (usedCount > 0) {
        throw new Error("You have already used this coupon code");
      }

      if (coupon.firstOrder || coupon.audienceType === "new") {
        const userOrders = await prisma.order.count({ where: { userId, isDeleted: false } });
        if (userOrders > 0) {
          throw new Error(coupon.audienceType === "new" ? "This coupon is only for new customers with 0 orders" : "This coupon is only for first orders");
        }
      }

      if (coupon.audienceType === "specific") {
        if (!coupon.audienceUserIds.includes(userId)) {
          throw new Error("You are not eligible for this private promotion");
        }
      }

      let eligibleTotal = 0;
      if (coupon.targetType === "category" || coupon.targetType === "product") {
        const productIds = items.map(i => i.productId);
        const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
        const productMap = products.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

        for (const item of items) {
          const prod = productMap[item.productId];
          if (!prod) continue;
          
          let isEligible = false;
          if (coupon.targetType === "category" && coupon.targetCategoryIds.map(String).includes(prod.categoryId.toString())) {
            isEligible = true;
          } else if (coupon.targetType === "product" && coupon.targetProductIds.map(String).includes(prod.id.toString())) {
            isEligible = true;
          }
          
          if (isEligible) {
            eligibleTotal += ((item.price || prod.price) * item.quantity);
          }
        }

        if (eligibleTotal === 0) {
          throw new Error("Coupon is not valid for any items in your cart");
        }
      } else {
        eligibleTotal = total;
      }

      // Calculate discount based on type (percentage or fixed) against eligibleTotal
      if (coupon.discountType === "percentage") {
        couponDiscount = (eligibleTotal * coupon.discount) / 100;
      } else {
        couponDiscount = Math.min(coupon.discount, eligibleTotal);
      }
    }

    // 2. Calculate points value if points are provided
    if (pointsUsed > 0) {
      const userBalance = await loyaltyService.getBalance(userId);
      if (userBalance < pointsUsed) {
        throw new Error("Insufficient points");
      }
      pointsValue = pointsUsed * 1;
    }

    // 3. Calculate final total (Subtotal + Shipping - Discounts)
    console.log(`[OrdersService] Creating order with pointsUsed: ${pointsUsed}`);
    finalTotal = Math.max(0, total + shippingFee - couponDiscount - pointsValue);

    // 4. Create order with finalTotal
    const order = await prisma.order.create({
      data: { 
        userId, 
        status: "pending", 
        total: finalTotal, 
        shippingFee,
        address, 
        contactNumber, 
        contactEmail, 
        deliveryMethod, 
        method: "pending", 
        items: { createMany: { data: items } } 
      },
      include: { items: { include: { product: true } } }
    });

    // 5. Update Stock Levels
    const notificationsService = require("../notifications/notifications.service");
    const activitiesService = require("../activities/activities.service");
    for (const item of items) {
      try {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) continue;

        if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
          let variantMatched = false;
          const updatedVariants = product.variants.map((v) => {
            const vAttrs = v.attributes || v;
            const matchResult = item.variantAttributes?.id 
              ? v.id === item.variantAttributes.id 
              : isVariantMatch(vAttrs, item.variantAttributes);
            
            if (matchResult && !variantMatched) {
              variantMatched = true;
              return { ...v, stock: Math.max(0, (parseInt(v.stock) || 0) - parseInt(item.quantity)) };
            }
            return v;
          });
          const newTotalStock = updatedVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
          await prisma.product.update({
            where: { id: product.id },
            data: { variants: updatedVariants, stock: newTotalStock }
          });
        } else {
          await prisma.product.update({
            where: { id: product.id },
            data: { stock: Math.max(0, product.stock - item.quantity) }
          });
        }
      } catch (stockError) {
        console.error(`Failed to update stock for product ${item.productId}:`, stockError);
      }
    }

    // 6. Deduct points if pointsUsed > 0
    if (pointsUsed > 0) {
      await loyaltyService.redeemPoints(userId, pointsUsed, order.id);
    }

    // 7. Create OrderDiscount record
    const earnedPoints = Math.floor(finalTotal / 100);
    await prisma.orderDiscount.create({
      data: {
        orderId: order.id,
        couponId: coupon?.id,
        couponCode: coupon?.code,
        couponDiscount,
        pointsUsed,
        pointsValue,
        earnedPoints
      }
    });

    // 8. Points will be earned when order is confirmed (not at creation)

    // Clear user's cart items after successful order creation
    await prisma.cartItem.deleteMany({
      where: { cart: { userId } }
    });

    // 9. Send order confirmation email with full details
    const fullOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { 
        items: { include: { product: true } }, 
        payment: true, 
        orderDiscount: true,
        user: true
      }
    });
    
    this.#sendOrderStatusEmail(fullOrder).catch(console.error);
    
    // 10. Push Notification for Admin/Order Managers
    await notificationsService.create({
      type: 'NEW_ORDER',
      title: 'New Order Placed',
      message: `Order #${fullOrder.id.slice(-8).toUpperCase()} has been placed by ${fullOrder.user?.name || 'Guest'}.`,
      link: `/admin/orders?viewId=${fullOrder.id}`
    });
    
    return fullOrder;
  }
  async createReturnOrder({ userId, items, address, contactNumber, contactEmail, returnRequestId, notes }) {
    // Validate inputs
    if (!contactNumber || contactNumber.length < 7) {
      throw new Error("Invalid contact number for replacement order");
    }
    if (!address || address.trim().length < 5) {
      throw new Error("Address is required for replacement order");
    }
    if (!items || items.length === 0) {
      throw new Error("At least one item is required");
    }

    try {
      console.log("[ReturnReplacement] API Received Data:", JSON.stringify({ userId, address, contactNumber, returnRequestId }));

      // 1. Mandatory Price Validation Safeguard
      const originalReturn = await prisma.return.findUnique({
        where: { id: returnRequestId },
        include: { items: true }
      });

      if (!originalReturn) {
        throw new Error("Original return record not found for validation.");
      }

      // Check each replacement item against the highest possible credit from the return
      // (Simple logic: new item price must be <= max price found in original return items)
      // Since we create one restock request per item, we usually compare 1-to-1.
      for (const item of items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Product ${item.productId} not found`);

        let newPrice = product.price;
        // If it's a variant, we might need its specific price (if stored differently)
        // But in this system, Product has a base price or we use variants.
        // Let's check for specific variant price if available
        if (item.variantAttributes?.id || item.variantAttributes?.price) {
          const vPrice = item.variantAttributes?.price;
          if (vPrice !== undefined) newPrice = vPrice;
          else if (item.variantAttributes?.id && product.variants) {
            const variant = product.variants.find(v => v.id === item.variantAttributes.id);
            if (variant) newPrice = variant.price;
          }
        }

        const maxAllowed = Math.max(...originalReturn.items.map(i => i.price || 0));
        
        console.log(`[PriceValidation] New: ${newPrice} LKR | Max Allowed: ${maxAllowed} LKR`);
        
        if (maxAllowed > 0 && newPrice > maxAllowed) {
          throw new Error(`Price Violation: Replacement item (${newPrice} LKR) exceeds original credit (${maxAllowed} LKR)`);
        }
      }

      // Create order with total = 0 (free replacement)
      const order = await prisma.order.create({
        data: {
          userId,
          status: "confirmed",
          total: 0,
          address,
          contactNumber,
          contactEmail,
          deliveryMethod: "standard_delivery",
          method: "return_replacement",
          items: {
            createMany: {
              data: items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: 0,
                variantAttributes: item.variantAttributes || {},
              }))
            }
          }
        },
        include: { items: { include: { product: true } }, user: true }
      });

      // 5. Update Stock Levels (Deduct inventory for replacement)
      for (const item of items) {
        try {
          const product = await prisma.product.findUnique({
            where: { id: item.productId }
          });

          if (!product) continue;

          if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
            let variantMatched = false;
            const updatedVariants = product.variants.map((v) => {
              // Standard matching logic
              const matchResult = isVariantMatch(v.attributes, item.variantAttributes);
              if (matchResult && !variantMatched) {
                variantMatched = true;
                return { ...v, stock: Math.max(0, (v.stock || 0) - item.quantity) };
              }
              return v;
            });

            const newTotalStock = updatedVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
            await prisma.product.update({
              where: { id: product.id },
              data: { variants: updatedVariants, stock: newTotalStock }
            });
          } else {
            await prisma.product.update({
              where: { id: product.id },
              data: { stock: Math.max(0, (product.stock || 0) - item.quantity) }
            });
          }
        } catch (stockError) {
          console.error(`[ReturnReplacement] Failed to update stock for ${item.productId}:`, stockError);
        }
      }

      // Create a payment record marked as paid (free order)
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: 0,
          method: "return_replacement",
          status: "paid",
        }
      });

      // Create an OrderDiscount record with zero values (mandatory for relations)
      await prisma.orderDiscount.create({
        data: {
          orderId: order.id,
          couponDiscount: 0,
          pointsUsed: 0,
          pointsValue: 0,
          earnedPoints: 0,
        }
      });

      // Fetch the full order with all relations for email
      const fullOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          items: { include: { product: true } },
          payment: true,
          orderDiscount: true,
          user: true,
        }
      });

      // Send confirmation email
      this.#sendOrderStatusEmail(fullOrder).catch(err => console.error("[ReturnReplacement] Email failed:", err));

      console.log(`[ReturnReplacement] Successfully created replacement order #${order.id.slice(-8).toUpperCase()} for user ${userId}`);

      return fullOrder;
    } catch (error) {
      console.error("[ReturnReplacement] Full Error details:", error);
      // Simplify error message for frontend if it's a prisma/ObjectId error
      if (error.message?.includes("Inconsistent column data") || error.message?.includes("ObjectId")) {
        throw new Error("Invalid customer identifying data in the return request.");
      }
      throw error;
    }
  }

  async getAll(userId, skip = 0, take = 10, isAdmin = false) { const where = isAdmin ? { isDeleted: false } : { userId, isDeleted: false }; return prisma.order.findMany({ where, include: { user: true, items: { include: { product: true } }, payment: true, orderDiscount: true }, skip, take, orderBy: { createdAt: "desc" } }); }
  async getById(id) { return prisma.order.findUnique({ where: { id }, include: { user: true, items: { include: { product: true } }, payment: true, returns: true, orderDiscount: true, reviews: true } }); }
  async updateStatus(id, status) {
    console.log(`[OrdersService] Starting status update for ${id} to "${status}"`);
    return await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } }, orderDiscount: true }
      });

      if (!existingOrder) {
        console.error(`[OrdersService] Order ${id} not found`);
        throw new Error("Order not found");
      }

      console.log(`[OrdersService] current status: "${existingOrder.status}"`);

      // 1. Handle Cancellation logic (if moving TO cancelled)
      if (status === "cancelled" && existingOrder.status !== "cancelled") {
        console.log(`[OrdersService] Processing cancellation for order ${id}`);
        // Restore stock
        await this.#restoreStock(existingOrder.items, tx);
        
        // Refund REDEEMED points (Repush to customer)
        if (existingOrder.orderDiscount?.pointsUsed > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              userId: existingOrder.userId,
              points: existingOrder.orderDiscount.pointsUsed,
              type: "refunded",
              reason: `Order #${existingOrder.id.slice(-8).toUpperCase()} cancelled`,
              orderId: existingOrder.id
            }
          });
        }

        // Reverse EARNED points (Deduct if already awarded)
        const previouslyAwarded = ["confirmed", "shipped", "delivered"].includes(existingOrder.status);
        if (previouslyAwarded) {
          const earned = existingOrder.orderDiscount?.earnedPoints || Math.floor(existingOrder.total / 100);
          if (earned > 0) {
            await tx.loyaltyTransaction.create({
              data: {
                userId: existingOrder.userId,
                points: -Math.floor(earned),
                type: "reversed",
                reason: `Order #${existingOrder.id.slice(-8).toUpperCase()} cancelled (Points reversed)`,
                orderId: existingOrder.id
              }
            });
          }
        }
      }

      const updateData = { status };
      if (status === "delivered" && existingOrder.status !== "delivered") {
        updateData.deliveredAt = new Date();
      }

      const order = await tx.order.update({
        where: { id },
        data: updateData,
        include: { items: { include: { product: true } }, payment: true, orderDiscount: true }
      });

      // 2. Award loyalty points when order is confirmed OR shipped OR delivered (first time)
      const reachingAwardedStatus = ["confirmed", "shipped", "delivered"].includes(status);
      const wasNotAwarded = !["confirmed", "shipped", "delivered"].includes(existingOrder.status);

      if (reachingAwardedStatus && wasNotAwarded) {
        try {
          console.log(`[OrdersService] Awarding points for order ${id} (status: ${status})`);
          const baseTotal = order.total || 0;
          const calculatedPoints = order.orderDiscount?.earnedPoints || (baseTotal / 100);
          const earnedPoints = Math.floor(Number(calculatedPoints) || 0);
          
          if (earnedPoints > 0) {
            const orderIdStr = String(order.id);
            const userIdStr = String(order.userId);
            console.log(`[OrdersService] Creating loyalty tx: User=${userIdStr}, Points=${earnedPoints}`);
            await tx.loyaltyTransaction.create({
              data: {
                user: { connect: { id: userIdStr } },
                points: earnedPoints,
                type: "earned",
                reason: `Order #${orderIdStr.slice(-8).toUpperCase()} ${status}`,
                orderId: orderIdStr
              }
            });
            console.log(`[OrdersService] Loyalty transaction created successfully`);
          }
        } catch (loyaltyError) {
          console.error(`[OrdersService] ❌ Loyalty awarding failed for order ${id}:`, loyaltyError);
          // We might choose to ignore loyalty errors to allow status update, 
          // but if it's a critical system error, we should know.
          throw new Error(`Loyalty Processing Error: ${loyaltyError.message}`);
        }
      }

      // 3. Send status update email (fire-and-forget after transaction)
      console.log(`[OrdersService] Sending status email for ${id}`);
      this.#sendOrderStatusEmail(order).catch(err => console.error("[OrdersService] Email failed:", err));

      return order;
    });
  }
  async delete(id) { return prisma.order.update({ where: { id }, data: { isDeleted: true } }); }
  async getTotalCount() { return prisma.order.count({ where: { isDeleted: false } }); }
  async updateByUser(id, userId, data) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new Error("Order not found");
    if (order.userId !== userId) throw new Error("Unauthorized: Order does not belong to this user");
    if (order.status !== "pending") throw new Error("Can only edit pending orders");
    if (order.isUpdatedByUser) throw new Error("Delivery details can only be updated once");

    if (data.contactNumber && !/^\d{10}$/.test(data.contactNumber)) {
      throw new Error("Invalid phone number. Must be 10 digits.");
    }
    if (data.address && data.address.trim().length < 10) {
      throw new Error("Address is too short. Please provide at least 10 characters.");
    }

    const updateData = {
      isUpdatedByUser: true
    };
    if (data.address !== undefined) updateData.address = data.address;
    if (data.contactNumber !== undefined) updateData.contactNumber = data.contactNumber;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
    if (data.deliveryMethod !== undefined) updateData.deliveryMethod = data.deliveryMethod;

    return prisma.order.update({ where: { id }, data: updateData, include: { items: true, payment: true } });
  }
  async #restoreStock(orderItems, tx = prisma) {
    console.log(`[OrderRestoreStock] Starting restoration for ${orderItems.length} items...`);
    for (const item of orderItems) {
      const productId = item.productId || item.product?.id;
      if (!productId) continue;
      
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        console.log(`[OrderRestoreStock] ❌ Product ${productId} not found`);
        continue;
      }

      console.log(`[OrderRestoreStock] Restoring: "${product.name}" (qty: ${item.quantity})`);
      let newTotalStock = product.stock;

      if (item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && Array.isArray(product.variants) && product.variants.length > 0) {
        let variantMatched = false;
        const updatedVariants = product.variants.map((v) => {
          if (variantMatched) return v;
          const vAttrs = v.attributes || v;
          const matchResult = item.variantAttributes?.id 
            ? v.id === item.variantAttributes.id 
            : isVariantMatch(vAttrs, item.variantAttributes);
          
          if (matchResult) {
            variantMatched = true;
            const currentStock = (parseInt(v.stock) || 0);
            const newStock = currentStock + parseInt(item.quantity);
            console.log(`[OrderRestoreStock]   ✅ Matched Variant. Stock: ${currentStock} -> ${newStock}`);
            return { ...v, stock: newStock };
          }
          return v;
        });

        newTotalStock = updatedVariants.reduce((sum, v) => sum + (v.stock || 0), 0);

        await tx.product.update({
          where: { id: product.id },
          data: { variants: updatedVariants, stock: newTotalStock }
        });
      } else {
        newTotalStock = (parseInt(product.stock) || 0) + parseInt(item.quantity);
        await tx.product.update({
          where: { id: product.id },
          data: { stock: newTotalStock }
        });
        console.log(`[OrderRestoreStock]   ✅ Restored Total Stock. Stock: ${product.stock} -> ${newTotalStock}`);
      }
    }
    console.log(`[OrderRestoreStock] Restoration complete.`);
  }

  async cancelByUser(id, userId) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ 
        where: { id }, 
        include: { items: { include: { product: true } }, payment: true, orderDiscount: true } 
      });
      if (!order) throw new Error("Order not found");
      if (order.userId !== userId) throw new Error("Unauthorized: Order does not belong to this user");
      if (order.status !== "pending") throw new Error("Can only cancel pending orders");
      
      let paymentUpdate = {};
      if (order.payment) {
        if (['card', 'bank_deposit'].includes(order.payment.method)) {
          paymentUpdate = { update: { status: "refund_pending" } };
        } else {
          paymentUpdate = { update: { status: "cancelled" } };
        }
      }

      // Restore stock
      await this.#restoreStock(order.items, tx);

      // Refund REDEEMED points (Repush to customer)
      if (order.orderDiscount?.pointsUsed > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            userId: order.userId,
            points: order.orderDiscount.pointsUsed,
            type: "refunded",
            reason: `Order #${order.id.slice(-8).toUpperCase()} cancelled by user`,
            orderId: order.id
          }
        });
      }

      const updatedOrder = await tx.order.update({ 
        where: { id }, 
        data: { 
          status: "cancelled",
          ...(Object.keys(paymentUpdate).length > 0 && { payment: paymentUpdate })
        }, 
        include: { items: { include: { product: true } }, payment: true, orderDiscount: true } 
      });

      // Send automated cancellation email (fire-and-forget after transaction)
      this.#sendOrderStatusEmail(updatedOrder).catch(console.error);

      return updatedOrder;
    });
  }

  async processRefund(id) {
    const order = await prisma.order.findUnique({ where: { id }, include: { user: true, items: { include: { product: true } }, payment: true, orderDiscount: true } });
    if (!order) throw new Error("Order not found");
    if (order.status !== "cancelled") throw new Error("Only cancelled orders can be refunded");
    if (!order.payment) throw new Error("No payment found for this order");
    if (order.payment.status !== "refund_pending") throw new Error("Payment is not eligible for refund");

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        payment: {
          update: { status: "refunded" }
        }
      },
      include: { user: true, items: { include: { product: true } }, payment: true, orderDiscount: true }
    });

    this.#sendOrderStatusEmail(updatedOrder, "refunded").catch(console.error);

    return updatedOrder;
  }

  async applyDiscount(userId, orderId, { couponCode, pointsUsed }) {
    const order = await prisma.order.findUnique({ 
      where: { id: orderId },
      include: { items: { include: { product: true } } }
    });
    if (!order) throw new Error("Order not found");
    if (order.userId !== userId) throw new Error("Unauthorized");

    const originalTotal = order.total;
    let coupon = null;
    let couponDiscount = 0;
    let pointsValue = 0;

    // Validate coupon if provided
    if (couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: { code: couponCode }
      });

      if (!coupon || coupon.isDeleted) {
        throw new Error("Invalid coupon code");
      }

      if (originalTotal < coupon.minCartValue) {
        throw new Error(`Cart value must be at least LKR ${coupon.minCartValue}`);
      }

      // One-time use check
      const usedCount = await prisma.orderDiscount.count({
        where: {
          couponId: coupon.id,
          order: {
            userId: userId,
            isDeleted: false
          }
        }
      });
      if (usedCount > 0) {
        throw new Error("You have already used this coupon code");
      }

      if (coupon.firstOrder || coupon.audienceType === "new") {
        const userOrders = await prisma.order.count({ where: { userId, isDeleted: false } });
        if (userOrders > 0) {
          throw new Error(coupon.audienceType === "new" ? "This coupon is only for new customers with 0 orders" : "This coupon is only for first orders");
        }
      }

      if (coupon.audienceType === "specific") {
        if (!coupon.audienceUserIds.includes(userId)) {
          throw new Error("You are not eligible for this private promotion");
        }
      }

      let eligibleTotal = 0;
      if (coupon.targetType === "category" || coupon.targetType === "product") {
        for (const item of order.items) {
          const prod = item.product;
          if (!prod) continue;
          
          let isEligible = false;
          if (coupon.targetType === "category" && coupon.targetCategoryIds.map(String).includes(prod.categoryId.toString())) {
            isEligible = true;
          } else if (coupon.targetType === "product" && coupon.targetProductIds.map(String).includes(prod.id.toString())) {
            isEligible = true;
          }
          
          if (isEligible) {
            eligibleTotal += (item.price * item.quantity);
          }
        }

        if (eligibleTotal === 0) {
          throw new Error("Coupon is not valid for any items in this order");
        }
      } else {
        eligibleTotal = originalTotal;
      }

      // Calculate discount based on type (percentage or fixed) against eligibleTotal
      if (coupon.discountType === "percentage") {
        couponDiscount = (eligibleTotal * coupon.discount) / 100;
      } else {
        couponDiscount = Math.min(coupon.discount, eligibleTotal);
      }
    }

    // Calculate points value
    if (pointsUsed > 0) {
      const userBalance = await loyaltyService.getBalance(userId);
      if (userBalance < pointsUsed) {
        throw new Error("Insufficient points");
      }
      pointsValue = pointsUsed * 1;
    }

    const finalTotal = Math.max(0, originalTotal - couponDiscount - pointsValue);

    return {
      couponCode: coupon?.code,
      couponDiscount,
      pointsUsed,
      pointsValue,
      finalTotal,
      earnedPoints: Math.floor(finalTotal / 100)
    };
  }

  async saveDiscount(userId, orderId, { couponCode, pointsUsed }) {
    const order = await prisma.order.findUnique({ 
      where: { id: orderId },
      include: { items: { include: { product: true } } }
    });
    if (!order) throw new Error("Order not found");
    if (order.userId !== userId) throw new Error("Unauthorized");

    // Check if discount already exists
    const existingDiscount = await prisma.orderDiscount.findUnique({ where: { orderId } });
    if (existingDiscount && (existingDiscount.couponDiscount > 0 || existingDiscount.pointsUsed > 0)) {
      throw new Error("Discount already applied to this order");
    }

    const originalTotal = order.total;
    let coupon = null;
    let couponDiscount = 0;
    let pointsValue = 0;

    // Validate coupon if provided
    if (couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: { code: couponCode }
      });

      if (!coupon || coupon.isDeleted) {
        throw new Error("Invalid coupon code");
      }

      if (originalTotal < coupon.minCartValue) {
        throw new Error(`Cart value must be at least LKR ${coupon.minCartValue}`);
      }

      // One-time use check
      const usedCount = await prisma.orderDiscount.count({
        where: {
          couponId: coupon.id,
          order: {
            userId: userId,
            isDeleted: false
          }
        }
      });
      if (usedCount > 0) {
        throw new Error("You have already used this coupon code");
      }

      if (coupon.firstOrder || coupon.audienceType === "new") {
        const userOrders = await prisma.order.count({ where: { userId, isDeleted: false } });
        if (userOrders > 0) {
          throw new Error(coupon.audienceType === "new" ? "This coupon is only for new customers with 0 orders" : "This coupon is only for first orders");
        }
      }

      if (coupon.audienceType === "specific") {
        if (!coupon.audienceUserIds.includes(userId)) {
          throw new Error("You are not eligible for this private promotion");
        }
      }

      let eligibleTotal = 0;
      if (coupon.targetType === "category" || coupon.targetType === "product") {
        for (const item of order.items) {
          const prod = item.product;
          if (!prod) continue;
          
          let isEligible = false;
          if (coupon.targetType === "category" && coupon.targetCategoryIds.map(String).includes(prod.categoryId.toString())) {
            isEligible = true;
          } else if (coupon.targetType === "product" && coupon.targetProductIds.map(String).includes(prod.id.toString())) {
            isEligible = true;
          }
          
          if (isEligible) {
            eligibleTotal += (item.price * item.quantity);
          }
        }

        if (eligibleTotal === 0) {
          throw new Error("Coupon is not valid for any items in this order");
        }
      } else {
        eligibleTotal = originalTotal;
      }

      // Calculate discount based on type (percentage or fixed) against eligibleTotal
      if (coupon.discountType === "percentage") {
        couponDiscount = (eligibleTotal * coupon.discount) / 100;
      } else {
        couponDiscount = Math.min(coupon.discount, eligibleTotal);
      }
    }

    // Calculate points value
    if (pointsUsed > 0) {
      const userBalance = await loyaltyService.getBalance(userId);
      if (userBalance < pointsUsed) {
        throw new Error("Insufficient points");
      }
      pointsValue = pointsUsed * 1;
    }

    const finalTotal = Math.max(0, originalTotal - couponDiscount - pointsValue);

    // Update order total
    await prisma.order.update({
      where: { id: orderId },
      data: { total: finalTotal }
    });

    // Deduct points if applicable
    if (pointsUsed > 0) {
      await loyaltyService.redeemPoints(userId, pointsUsed, orderId);
    }

    // Create or update OrderDiscount record
    const earnedPoints = Math.floor(finalTotal / 100);
    await prisma.orderDiscount.upsert({
      where: { orderId },
      update: {
        couponId: coupon?.id,
        couponCode: coupon?.code,
        couponDiscount,
        pointsUsed,
        pointsValue,
        earnedPoints
      },
      create: {
        orderId,
        couponId: coupon?.id,
        couponCode: coupon?.code,
        couponDiscount,
        pointsUsed,
        pointsValue,
        earnedPoints
      }
    });

    // Points will be earned when order is confirmed (not at discount application)

    return { orderId, finalTotal, couponDiscount, pointsValue, earnedPoints };
  }

  async getDiscountDetails(orderId) {
    return prisma.orderDiscount.findUnique({
      where: { orderId },
      include: { coupon: true }
    });
  }

  #getImageUrl(product) {
    if (!product) return null;
    const img = product.images?.[0] || product.imageUrl;
    if (!img) return null;
    if (img.startsWith('http')) return img;
    return `http://localhost:5001${img.startsWith('/') ? img : '/' + img}`;
  }

  #buildOrderEmailHtml(order, { title, subtitle, statusLabel, statusColor, footerMessage }) {
    const subtotal = order.items?.reduce((acc, i) => acc + (i.price * i.quantity), 0) || 0;
    const shippingFee = order.shippingFee !== undefined ? order.shippingFee : (order.deliveryMethod === 'express_delivery' ? 500 : 350);
    const discount = order.orderDiscount ? (order.orderDiscount.couponDiscount || 0) + (order.orderDiscount.pointsValue || 0) : Math.max(0, subtotal + shippingFee - (order.total || 0));
    const grandTotal = order.total || 0;

    const paymentMethod = order.payment?.method?.replace(/_/g, ' ') || order.method || 'Pending';
    const paymentStatus = order.payment?.status || 'unpaid';

    const itemsHtml = (order.items || []).map(item => {
      const imgUrl = this.#getImageUrl(item.product);
      const imgCell = imgUrl
        ? `<img src="${imgUrl}" alt="${item.product?.name || 'Product'}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #e5e5e5;" />`
        : `<div style="width:56px;height:56px;background:#f5f5f5;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:20px;border:1px solid #e5e5e5;">📦</div>`;

      return `
        <tr>
          <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;vertical-align:middle;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="padding-right:12px;vertical-align:middle;">${imgCell}</td>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-weight:700;color:#111;font-size:13px;">${item.product?.name || 'Product'}</p>
                ${item.variantAttributes ? `<p style="margin:2px 0 0;font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${Object.entries(item.variantAttributes).map(([k,v]) => `${k}: ${v}`).join(' · ')}</p>` : ''}
              </td>
            </tr></table>
          </td>
          <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:center;font-weight:600;color:#333;font-size:13px;">${item.quantity}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:right;color:#666;font-size:13px;">LKR ${item.price.toFixed(2)}</td>
          <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;color:#111;font-size:13px;">LKR ${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`;
    }).join('');

    return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:0;">
      <!-- Header -->
      <div style="background:#111;padding:28px 32px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:18px;font-weight:800;letter-spacing:3px;text-transform:uppercase;">RICH APPAREL</h1>
      </div>

      <div style="padding:32px 28px;">
        <!-- Status Banner -->
        <div style="background:${statusColor};border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="margin:0;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:0.7;">${statusLabel}</p>
          <p style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">${title}</p>
        </div>

        <!-- Subtitle -->
        <p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 24px;">${subtitle}</p>

        <!-- Order Info -->
        <div style="background:#fff;border-radius:12px;border:1px solid #e8e8e8;padding:16px 20px;margin-bottom:24px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding:4px 0;"><span style="font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Order ID</span></td>
              <td style="padding:4px 0;text-align:right;"><span style="font-size:13px;font-weight:800;color:#111;">#${order.id.slice(-8).toUpperCase()}</span></td>
            </tr>
            <tr>
              <td style="padding:4px 0;"><span style="font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Order Date</span></td>
              <td style="padding:4px 0;text-align:right;"><span style="font-size:13px;font-weight:600;color:#333;">${new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></td>
            </tr>
            <tr>
              <td style="padding:4px 0;"><span style="font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Payment</span></td>
              <td style="padding:4px 0;text-align:right;"><span style="font-size:13px;font-weight:600;color:#333;text-transform:capitalize;">${paymentMethod} (${paymentStatus})</span></td>
            </tr>
          </table>
        </div>

        <!-- Items Table -->
        <div style="background:#fff;border-radius:12px;border:1px solid #e8e8e8;overflow:hidden;margin-bottom:24px;">
          <div style="padding:14px 20px;border-bottom:1px solid #f0f0f0;">
            <p style="margin:0;font-size:11px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:2px;">Order Items</p>
          </div>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <thead>
              <tr style="background:#fafafa;">
                <th style="padding:10px 8px;text-align:left;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Product</th>
                <th style="padding:10px 8px;text-align:center;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Qty</th>
                <th style="padding:10px 8px;text-align:right;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Price</th>
                <th style="padding:10px 8px;text-align:right;font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:1px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <!-- Financial Breakdown -->
        <div style="background:#fff;border-radius:12px;border:1px solid #e8e8e8;padding:20px;margin-bottom:24px;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#666;">Subtotal</td>
              <td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600;color:#333;">LKR ${subtotal.toFixed(2)}</td>
            </tr>
            ${discount > 0 ? `
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#10b981;">Discount</td>
              <td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600;color:#10b981;">- LKR ${discount.toFixed(2)}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#666;">Delivery (${order.deliveryMethod === 'express_delivery' ? 'Express' : 'Standard'})</td>
              <td style="padding:6px 0;text-align:right;font-size:13px;font-weight:600;color:#333;">LKR ${shippingFee.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:8px 0 0;"><div style="border-top:2px solid #111;"></div></td>
            </tr>
            <tr>
              <td style="padding:10px 0 0;font-size:16px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:1px;">Grand Total</td>
              <td style="padding:10px 0 0;text-align:right;font-size:18px;font-weight:900;color:#111;">LKR ${grandTotal.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <!-- Delivery Details -->
        <div style="background:#111;border-radius:12px;padding:20px;margin-bottom:24px;color:#fff;">
          <p style="margin:0 0 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.4);">Delivery Details</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.5);font-weight:600;">Method</td>
              <td style="padding:4px 0;text-align:right;font-size:12px;font-weight:700;color:#fff;text-transform:capitalize;">${(order.deliveryMethod || 'standard_delivery').replace(/_/g, ' ')}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.5);font-weight:600;">Address</td>
              <td style="padding:4px 0;text-align:right;font-size:12px;font-weight:700;color:#fff;">${order.address}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.5);font-weight:600;">Contact</td>
              <td style="padding:4px 0;text-align:right;font-size:12px;font-weight:700;color:#fff;">${order.contactNumber}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:12px;color:rgba(255,255,255,0.5);font-weight:600;">Email</td>
              <td style="padding:4px 0;text-align:right;font-size:12px;font-weight:700;color:#fff;">${order.contactEmail}</td>
            </tr>
          </table>
        </div>

        <!-- Footer Message -->
        <p style="color:#999;font-size:12px;text-align:center;line-height:1.6;margin:0;">${footerMessage}</p>
      </div>

      <!-- Bottom Bar -->
      <div style="background:#111;padding:16px 32px;text-align:center;">
        <p style="margin:0;color:rgba(255,255,255,0.3);font-size:10px;font-weight:600;letter-spacing:1px;">© ${new Date().getFullYear()} RICH APPAREL · ALL RIGHTS RESERVED</p>
      </div>
    </div>`;
  }

  async #sendOrderStatusEmail(order, customType = null) {
    const isReplacement = order.method === 'return_replacement';
    
    const configs = {
      pending: {
        title: isReplacement ? 'Replacement Received' : 'Order Received',
        subtitle: isReplacement 
          ? 'We have received your request for a replacement and it is being reviewed. You will be notified once it is confirmed.' 
          : 'We have received your order and it is being reviewed. You will be notified once it is confirmed.',
        statusLabel: 'Status Update',
        statusColor: '#f59e0b',
        footerMessage: isReplacement 
          ? 'Your replacement order is being reviewed. We will update you shortly.' 
          : 'Your order is being reviewed. We will update you shortly.'
      },
      confirmed: {
        title: isReplacement ? 'Replacement Confirmed' : 'Order Confirmed',
        subtitle: isReplacement 
          ? 'Great news! Your replacement has been confirmed and is now being prepared for shipment.' 
          : 'Great news! Your order has been confirmed and is now being prepared for shipment.',
        statusLabel: 'Confirmed',
        statusColor: '#2563eb',
        footerMessage: 'We are preparing your items. You will receive a shipping notification soon.'
      },
      shipped: {
        title: isReplacement ? 'Replacement On the Way' : 'Order On the Way',
        subtitle: isReplacement 
          ? 'Your replacement items are on their way! They have been handed over to our delivery partner.' 
          : 'Your order is on its way! It has been handed over to the delivery partner.',
        statusLabel: 'On the Way',
        statusColor: '#7c3aed',
        footerMessage: 'Your package is on its way. Track your order for live updates.'
      },
      delivered: {
        title: isReplacement ? 'Replacement Delivered' : 'Order Delivered',
        subtitle: isReplacement 
          ? 'Your replacement items have been successfully delivered. We hope they meet your expectations!' 
          : 'Your order has been successfully delivered. We hope you enjoy your purchase!',
        statusLabel: 'Delivered',
        statusColor: '#10b981',
        footerMessage: 'Thank you for your patience during the replacement process.'
      },
      cancelled: {
        title: isReplacement ? 'Replacement Cancelled' : 'Order Cancelled',
        subtitle: 'The shipment has been cancelled. Please contact our support team for further assistance.',
        statusLabel: 'Cancelled',
        statusColor: '#ef4444',
        footerMessage: 'If you have any questions about this cancellation, please contact our support team.'
      },
      refunded: {
        title: 'Payment Refunded',
        subtitle: 'Your payment for the cancelled order has been fully refunded to your original payment method.',
        statusLabel: 'Refunded',
        statusColor: '#8b5cf6',
        footerMessage: 'Please allow 3-5 business days for the refund to appear on your statement.'
      }
    };

    const config = configs[customType || order.status] || configs.pending;
    const html = this.#buildOrderEmailHtml(order, config);
    const subjectMap = {
      pending: isReplacement ? 'Replacement Received' : 'Order Received',
      confirmed: isReplacement ? 'Replacement Confirmed' : 'Order Confirmed',
      shipped: isReplacement ? 'Replacement Shipped' : 'Order On the Way',
      delivered: isReplacement ? 'Replacement Delivered' : 'Order Delivered',
      cancelled: isReplacement ? 'Replacement Cancelled' : 'Order Cancelled',
      refunded: 'Payment Refunded'
    };

    const typeKey = customType || order.status;
    const subjectPrefix = subjectMap[typeKey] || 'Order Update';

    await sendEmail(
      order.contactEmail,
      `${isReplacement ? 'REPLACEMENT: ' : ''}${subjectPrefix} — #${order.id.slice(-8).toUpperCase()}`,
      `Your ${isReplacement ? 'replacement ' : ''}order #${order.id.slice(-8).toUpperCase()} status: ${order.status}. ${config.subtitle}`,
      html
    );
  }
}
module.exports = new OrdersService();
