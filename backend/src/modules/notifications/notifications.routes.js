const express = require("express");
const router = express.Router();
const notificationsController = require("./notifications.controller");
const pmNotificationsController = require("./pm.notifications.controller");
const smNotificationsController = require("./sm.notifications.controller");
const authMiddleware = require("../../middleware/auth.middleware");

router.use(authMiddleware);

// Legacy / Generic Endpoints (Admins)
router.get("/", notificationsController.getNotifications);
router.patch("/mark-all-read", notificationsController.markAllAsRead);
router.delete("/clear-all", notificationsController.clearAll);

// Isolated Product Manager Endpoints
router.get("/pm", pmNotificationsController.getNotifications);
router.patch("/pm/mark-all-read", pmNotificationsController.markAllAsRead);
router.delete("/pm/clear-all", pmNotificationsController.clearAll);

// Isolated Supplier Manager Endpoints
router.get("/sm", smNotificationsController.getNotifications);
router.patch("/sm/mark-all-read", smNotificationsController.markAllAsRead);
router.delete("/sm/clear-all", smNotificationsController.clearAll);

// Universal Item-level Operations
router.patch("/:id/read", notificationsController.markAsRead);
router.delete("/:id", notificationsController.deleteNotification);

module.exports = router;
