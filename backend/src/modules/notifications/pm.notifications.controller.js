const notificationsService = require("./notifications.service");

class PMNotificationsController {
    async getNotifications(req, res) {
        try {
            // Hardcoded strictly to Product Manager filters
            const notifications = await notificationsService.getAll("PRODUCT MANAGER");
            res.status(200).json({ status: "success", data: { notifications } });
        } catch (err) {
            res.status(500).json({ status: "fail", message: err.message });
        }
    }

    async markAllAsRead(req, res) {
        try {
            await notificationsService.markAllAsRead("PRODUCT MANAGER");
            res.status(200).json({ status: "success", message: "All PM notifications marked as read" });
        } catch (err) {
            res.status(500).json({ status: "fail", message: err.message });
        }
    }

    async clearAll(req, res) {
        try {
            await notificationsService.clearAll("PRODUCT MANAGER");
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ status: "fail", message: err.message });
        }
    }
}

module.exports = new PMNotificationsController();
