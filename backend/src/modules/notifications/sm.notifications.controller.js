const notificationsService = require("./notifications.service");

class SMNotificationsController {
    async getNotifications(req, res) {
        try {
            // Hardcoded strictly to Supplier Manager filters
            const notifications = await notificationsService.getAll("SUPPLIER MANAGER");
            res.status(200).json({ status: "success", data: { notifications } });
        } catch (err) {
            res.status(500).json({ status: "fail", message: err.message });
        }
    }

    async markAllAsRead(req, res) {
        try {
            await notificationsService.markAllAsRead("SUPPLIER MANAGER");
            res.status(200).json({ status: "success", message: "All SM notifications marked as read" });
        } catch (err) {
            res.status(500).json({ status: "fail", message: err.message });
        }
    }

    async clearAll(req, res) {
        try {
            await notificationsService.clearAll("SUPPLIER MANAGER");
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ status: "fail", message: err.message });
        }
    }
}

module.exports = new SMNotificationsController();
