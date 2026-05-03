const express = require("express");
const authController = require("./auth.controller");
const validateRequest = require("../../middleware/validate.middleware");
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, verifyOTPSchema } = require("./auth.validation");
const authMiddleware = require("../../middleware/auth.middleware");

const router = express.Router();

router.post("/register", validateRequest(registerSchema), authController.register.bind(authController));
router.post("/login", validateRequest(loginSchema), authController.login.bind(authController));
router.post("/forgot-password", validateRequest(forgotPasswordSchema), authController.forgotPassword.bind(authController));
router.post("/verify-otp", validateRequest(verifyOTPSchema), authController.verifyOTP.bind(authController));
router.post("/reset-password", validateRequest(resetPasswordSchema), authController.resetPassword.bind(authController));
router.get("/profile", authMiddleware, authController.getProfile.bind(authController));

module.exports = router;
