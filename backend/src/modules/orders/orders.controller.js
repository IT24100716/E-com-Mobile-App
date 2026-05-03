const ordersService = require("./orders.service");
const { sendSuccess, sendError } = require("../../utils/response");
class OrdersController {
  async create(req, res) { 
    try { 
      console.log("[OrdersController] Incoming order body:", JSON.stringify(req.body, null, 2));
      const { items, total, address, contactNumber, contactEmail, deliveryMethod, shippingFee = 0, couponCode = "", pointsUsed = 0 } = req.body; 
      console.log(`[OrdersController] pointsUsed value: ${pointsUsed}, type: ${typeof pointsUsed}`);
      const order = await ordersService.create(req.user.id, items, total, address, contactNumber, contactEmail, deliveryMethod, shippingFee, couponCode, pointsUsed); 
      return sendSuccess(res, "Order created", order, 201); 
    } catch (error) { 
      console.error("[OrdersController] Create Error:", error);
      return sendError(res, error.message, 400); 
    } 
  }

  async getAll(req, res) { try { const { skip = 0, take = 10 } = req.query; const isAdminOrManager = ["admin", "order manager"].includes(req.user.role?.toLowerCase() || ""); const orders = await ordersService.getAll(req.user.id, parseInt(skip), parseInt(take), isAdminOrManager); const total = await ordersService.getTotalCount(); return sendSuccess(res, "Orders fetched", { orders, total }); } catch (error) { return sendError(res, error.message, 400); } }
  async getById(req, res) { try { const order = await ordersService.getById(req.params.id); if (!order) return sendError(res, "Order not found", 404); return sendSuccess(res, "Order fetched", order); } catch (error) { return sendError(res, error.message, 400); } }
  async updateStatus(req, res) { try { const order = await ordersService.updateStatus(req.params.id, req.body.status); return sendSuccess(res, "Status updated", order); } catch (error) { return sendError(res, error.message, 400); } }
  async delete(req, res) { try { await ordersService.delete(req.params.id); return sendSuccess(res, "Order deleted"); } catch (error) { return sendError(res, error.message, 400); } }
  async updateByUser(req, res) { try { const order = await ordersService.updateByUser(req.params.id, req.user.id, req.body); return sendSuccess(res, "Order updated", order); } catch (error) { return sendError(res, error.message, error.message.includes("Unauthorized") || error.message.includes("Can only") ? 403 : 400); } }
  async cancelByUser(req, res) { try { await ordersService.cancelByUser(req.params.id, req.user.id); return sendSuccess(res, "Order cancelled"); } catch (error) { return sendError(res, error.message, error.message.includes("Unauthorized") || error.message.includes("Can only") ? 403 : 400); } }
  
  async processRefund(req, res) { 
    try { 
      const order = await ordersService.processRefund(req.params.id); 
      return sendSuccess(res, "Refund processed successfully", order); 
    } catch (error) { 
      return sendError(res, error.message, 400); 
    } 
  }
  async applyDiscount(req, res) {
    try {
      const { couponCode, pointsUsed } = req.body;
      const result = await ordersService.applyDiscount(req.user.id, req.params.id, { couponCode, pointsUsed });
      return sendSuccess(res, "Discount applied", result);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }
  async getDiscountDetails(req, res) {
    try {
      const discount = await ordersService.getDiscountDetails(req.params.id);
      return sendSuccess(res, "Discount details fetched", discount);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }
  async saveDiscount(req, res) {
    try {
      const { couponCode, pointsUsed } = req.body;
      const result = await ordersService.saveDiscount(req.user.id, req.params.id, { couponCode, pointsUsed });
      return sendSuccess(res, "Discount saved and applied", result);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async createReturnOrder(req, res) {
    try {
      const { userId, items, address, contactNumber, contactEmail, returnRequestId, notes } = req.body;
      const order = await ordersService.createReturnOrder({
        userId,
        items,
        address,
        contactNumber,
        contactEmail,
        returnRequestId,
        notes,
      });
      return sendSuccess(res, "Return replacement order created", order, 201);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }
}
module.exports = new OrdersController();
