const staffService = require("./staff.service");
const { sendSuccess, sendError } = require("../../utils/response");
class StaffController {
  async create(req, res) { try { const staff = await staffService.create(req.body, req.body.roleId); return sendSuccess(res, "Staff created", staff, 201); } catch (error) { return sendError(res, error.message, 400); } }
  async getAll(req, res) { try { const { skip = 0, take = 10 } = req.query; const staff = await staffService.getAll(parseInt(skip), parseInt(take)); const total = await staffService.getTotalCount(); return sendSuccess(res, "Staff fetched", { staff, total }); } catch (error) { return sendError(res, error.message, 400); } }
  async getById(req, res) { try { const staff = await staffService.getById(req.params.id); if (!staff) return sendError(res, "Staff not found", 404); return sendSuccess(res, "Staff fetched", staff); } catch (error) { return sendError(res, error.message, 400); } }
  async update(req, res) { try { const staff = await staffService.update(req.params.id, req.body); return sendSuccess(res, "Staff updated", staff); } catch (error) { return sendError(res, error.message, 400); } }
  async delete(req, res) { try { await staffService.delete(req.params.id); return sendSuccess(res, "Staff deleted"); } catch (error) { return sendError(res, error.message, 400); } }
}
module.exports = new StaffController();
