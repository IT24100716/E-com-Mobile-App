const express = require("express");
const chatController = require("./chat.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const upload = require("../../config/multerMemory");

const router = express.Router();

// Customer & Admin routes
router.post("/send", authMiddleware, upload.single("image"), chatController.sendMessage);
router.get("/history/:userId", authMiddleware, chatController.getChatHistory);
router.post("/clear", authMiddleware, chatController.clearChatUI);

// Admin only routes
router.get("/admin/groups", authMiddleware, roleMiddleware("admin", "review manager"), chatController.getAllMessagesGrouped);
router.patch("/admin/read/:customerId", authMiddleware, roleMiddleware("admin", "review manager"), chatController.markAsRead);

module.exports = router;
