const notificationsService = require("./notifications.service");

const getNotifications = async (req, res) => {
    try {
        const role = req.user?.role;
        const notifications = await notificationsService.getAll(role);
        res.status(200).json({ status: "success", data: { notifications } });
    } catch (err) {
        res.status(500).json({ status: "fail", message: err.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const notification = await notificationsService.markAsRead(req.params.id);
        res.status(200).json({ status: "success", data: { notification } });
    } catch (err) {
        res.status(404).json({ status: "fail", message: err.message });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const role = req.user?.role;
        await notificationsService.markAllAsRead(role);
        res.status(200).json({ status: "success", message: "All relative notifications marked as read" });
    } catch (err) {
        res.status(500).json({ status: "fail", message: err.message });
    }
};

const deleteNotification = async (req, res) => {
    try {
        await notificationsService.delete(req.params.id);
        res.status(204).send();
    } catch (err) {
        res.status(404).json({ status: "fail", message: err.message });
    }
};

const clearAll = async (req, res) => {
    try {
        const role = req.user?.role;
        await notificationsService.clearAll(role);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ status: "fail", message: err.message });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
};
