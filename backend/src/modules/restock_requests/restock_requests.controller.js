const restockRequestService = require("./restock_requests.service.js");
const { sendSuccess, sendError } = require("../../utils/response");

class RestockRequestController {
  async create(req, res) {
    try {
      const { productId, quantity, notes } = req.body;
      if (!productId || !quantity) {
        return sendError(res, "Product ID and quantity are required", 400);
      }

      const request = await restockRequestService.create(req.body, req.user);
      return sendSuccess(res, "Restock request created successfully", request, 201);
    } catch (error) {
      console.error("Restock Request Error:", error);
      return sendError(res, error.message, 400);
    }
  }

  async getAll(req, res) {
    try {
      const { skip = 0, take = 10 } = req.query;
      const requests = await restockRequestService.getAll(parseInt(skip), parseInt(take));
      return sendSuccess(res, "Restock requests fetched successfully", requests);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getById(req, res) {
    try {
      const request = await restockRequestService.getById(req.params.id);
      if (!request) {
        return sendError(res, "Restock request not found", 404);
      }
      return sendSuccess(res, "Restock request fetched successfully", request);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async updateStatus(req, res) {
    try {
      const { status, fulfillment } = req.body;
      const request = await restockRequestService.updateStatus(req.params.id, status, fulfillment);
      return sendSuccess(res, "Restock request status updated", request);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async approve(req, res) {
    try {
      const request = await restockRequestService.approve(req.params.id);
      return sendSuccess(res, "Restock request approved", request);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async process(req, res) {
    try {
      const request = await restockRequestService.process(req.params.id);
      return sendSuccess(res, "Restock request processing started", request);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async complete(req, res) {
    try {
      const request = await restockRequestService.complete(req.params.id);
      return sendSuccess(res, "Restock request marked as completed", request);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async addToStock(req, res) {
    try {
      const result = await restockRequestService.addToStock(req.params.id);
      return sendSuccess(res, "Stock successfully updated and request closed", result);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }
}

module.exports = new RestockRequestController();
