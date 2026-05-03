const rolesService = require("./roles.service");
const { sendSuccess, sendError } = require("../../utils/response");

class RolesController {
  async create(req, res) {
    try {
      const role = await rolesService.create(req.body);
      return sendSuccess(res, "Role created", role, 201);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getAll(req, res) {
    try {
      const { skip = 0, take = 10 } = req.query;
      const roles = await rolesService.getAll(parseInt(skip), parseInt(take));
      const total = await rolesService.getTotalCount();
      return sendSuccess(res, "Roles fetched", { roles, total });
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getById(req, res) {
    try {
      const role = await rolesService.getById(req.params.id);
      if (!role || role.isDeleted) {
        return sendError(res, "Role not found", 404);
      }
      return sendSuccess(res, "Role fetched", role);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const role = await rolesService.update(req.params.id, req.body);
      return sendSuccess(res, "Role updated", role);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      await rolesService.delete(req.params.id);
      return sendSuccess(res, "Role deleted");
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }
}

module.exports = new RolesController();
