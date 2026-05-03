const loyaltyService = require("./loyalty.service");
const { sendSuccess, sendError } = require("../../utils/response");
class LoyaltyController {
  async addPoints(req, res) { try { const transaction = await loyaltyService.addPoints(req.body); return sendSuccess(res, "Points added", transaction, 201); } catch (error) { return sendError(res, error.message, 400); } }
  async getBalance(req, res) { try { const balance = await loyaltyService.getBalance(req.user.id); return sendSuccess(res, "Balance fetched", { balance }); } catch (error) { return sendError(res, error.message, 400); } }
  async getHistory(req, res) { try { const { skip = 0, take = 10 } = req.query; const history = await loyaltyService.getHistory(req.user.id, parseInt(skip), parseInt(take)); return sendSuccess(res, "History fetched", history); } catch (error) { return sendError(res, error.message, 400); } }
  async getAll(req, res) { try { const { skip = 0, take = 10 } = req.query; const transactions = await loyaltyService.getAll(parseInt(skip), parseInt(take)); return sendSuccess(res, "All transactions fetched", transactions); } catch (error) { return sendError(res, error.message, 400); } }
  async getMembers(req, res) { try { const members = await loyaltyService.getMembers(); return sendSuccess(res, "Loyalty members fetched", members); } catch (error) { return sendError(res, error.message, 400); } }
  async update(req, res) { try { const transaction = await loyaltyService.update(req.params.id, req.body); return sendSuccess(res, "Transaction updated", transaction); } catch (error) { return sendError(res, error.message, 400); } }
  async delete(req, res) { try { await loyaltyService.delete(req.params.id); return sendSuccess(res, "Transaction deleted"); } catch (error) { return sendError(res, error.message, 400); } }
}
module.exports = new LoyaltyController();
