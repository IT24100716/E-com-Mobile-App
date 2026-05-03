const usersService = require("./users.service");
const { sendSuccess, sendError } = require("../../utils/response");

class UsersController {
  async getAll(req, res) {
    try {
      const { skip = 0, take = 10 } = req.query;
      const users = await usersService.getAll(parseInt(skip), parseInt(take));
      const total = await usersService.getTotalCount();
      return sendSuccess(res, "Users fetched", { users, total });
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getById(req, res) {
    try {
      const user = await usersService.getById(req.params.id);
      if (!user || user.isDeleted) {
        return sendError(res, "User not found", 404);
      }
      return sendSuccess(res, "User fetched", user);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async update(req, res) {
    try {
      const targetId = req.params.id;
      const currentUser = req.user;

      // Allow if: User is updating their own account OR User is an admin/user manager/staff manager
      const isOwner = currentUser.id === targetId;
      const isPrivileged = ["admin", "user manager", "staff manager"].includes(currentUser.role?.toLowerCase());

      if (!isOwner && !isPrivileged) {
        return sendError(res, "Forbidden - You can only update your own account", 403);
      }

      const user = await usersService.update(targetId, req.body);
      return sendSuccess(res, "User updated", user);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async delete(req, res) {
    try {
      const targetId = req.params.id;
      const currentUser = req.user;

      // Allow if: User is deleting their own account OR User is an admin/user manager/staff manager
      const isOwner = currentUser.id === targetId;
      const isAdmin = ["admin", "user manager", "staff manager"].includes(currentUser.role?.toLowerCase());

      if (!isOwner && !isAdmin) {
        return sendError(res, "Forbidden - You can only delete your own account", 403);
      }

      await usersService.delete(targetId);
      return sendSuccess(res, "User deleted");
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async updatePassword(req, res) {
    try {
      const { password } = req.body;
      const user = await usersService.updatePassword(req.params.id, password);
      return sendSuccess(res, "Password updated successfully", user);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async requestPasswordChange(req, res) {
    try {
      await usersService.requestPasswordChange(req.user);
      return sendSuccess(res, "Password change request sent to administrators");
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getPasswordRequests(req, res) {
    try {
      const requests = await usersService.getPasswordRequests();
      return sendSuccess(res, "Password requests fetched", requests);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async deletePasswordRequest(req, res) {
    try {
      await usersService.deletePasswordRequest(req.params.id);
      return sendSuccess(res, "Password request deleted");
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }
}

module.exports = new UsersController();
