const couponsService = require("./coupons.service");
const { sendSuccess, sendError } = require("../../utils/response");

class CouponsController {
  async create(req, res) {
    try {
      const coupon = await couponsService.create(req.body);
      return sendSuccess(res, "Coupon created", coupon, 201);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getAll(req, res) {
    try {
      const { skip = 0, take = 10 } = req.query;
      const coupons = await couponsService.getAll(parseInt(skip), parseInt(take));
      const total = await couponsService.getTotalCount();
      return sendSuccess(res, "Coupons fetched", { coupons, total });
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getAvailable(req, res) {
    try {
      // req.user might be null if we don't strictly require auth for this route
      const coupons = await couponsService.getAvailableCoupons(req.user);
      return sendSuccess(res, "Available coupons fetched", { coupons });
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getById(req, res) {
    try {
      const coupon = await couponsService.getById(req.params.id);
      if (!coupon || coupon.isDeleted) {
        return sendError(res, "Coupon not found", 404);
      }
      return sendSuccess(res, "Coupon fetched", coupon);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async validate(req, res) {
    try {
      const coupon = await couponsService.validateCoupon(req.params.code);
      if (!coupon) {
        return sendError(res, "Invalid coupon code", 404);
      }
      return sendSuccess(res, "Coupon valid", coupon);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async evaluate(req, res) {
    try {
      const { couponCode, items, total } = req.body;
      const userId = req.user?.id; // Optional auth
      
      const evaluation = await couponsService.evaluateCoupon(userId, couponCode, items, total);
      return sendSuccess(res, "Coupon evaluated successfully", evaluation);
    } catch (error) {
      // Return error softly as 400 with message so frontend can show validation error
      return sendError(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const coupon = await couponsService.update(req.params.id, req.body);
      return sendSuccess(res, "Coupon updated", coupon);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      await couponsService.delete(req.params.id);
      return sendSuccess(res, "Coupon deleted");
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }
}

module.exports = new CouponsController();
