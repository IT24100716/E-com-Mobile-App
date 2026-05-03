const authService = require("./auth.service");
const { sendSuccess, sendError } = require("../../utils/response");

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return sendSuccess(res, "User registered successfully", result, 201);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      return sendSuccess(res, "Login successful", result);
    } catch (error) {
      return sendError(res, error.message, 401);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const result = await authService.forgotPassword(req.body);
      return sendSuccess(res, result.message);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPassword(req.body);
      return sendSuccess(res, result.message);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async verifyOTP(req, res, next) {
    try {
      const result = await authService.verifyOTP(req.body);
      return sendSuccess(res, result.message);
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }

  async getProfile(req, res) {
    try {
      const user = await authService.getProfile(req.user.id);
      return sendSuccess(res, "Profile fetched", { user });
    } catch (error) {
      return sendError(res, error.message, 400);
    }
  }
}

module.exports = new AuthController();
