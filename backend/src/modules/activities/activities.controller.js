const activitiesService = require("./activities.service");
const { sendSuccess, sendError } = require("../../utils/response");

const activitiesController = {
    getAll: async (req, res) => {
        try {
            const { skip = 0, take = 50, search = "" } = req.query;
            const role = req.user?.role;
            const activities = await activitiesService.getAll(parseInt(skip), parseInt(take), search, role);
            const total = await activitiesService.getTotalCount(search, role);
            return sendSuccess(res, "Activities fetched", { activities, total });
        } catch (error) {
            return sendError(res, error.message, 400);
        }
    },

    getByUser: async (req, res) => {
        try {
            const { skip = 0, take = 50 } = req.query;
            const activities = await activitiesService.getByUser(req.params.userId, parseInt(skip), parseInt(take));
            return sendSuccess(res, "User activities fetched", activities);
        } catch (error) {
            return sendError(res, error.message, 400);
        }
    },

    clearAll: async (req, res) => {
        try {
            const role = req.user?.role;
            await activitiesService.clearAll(role);
            return sendSuccess(res, "Role-relative history cleared successfully");
        } catch (error) {
            return sendError(res, error.message, 400);
        }
    },

    deleteById: async (req, res) => {
        try {
            await activitiesService.deleteById(req.params.id);
            return sendSuccess(res, "Activity record deleted successfully");
        } catch (error) {
            return sendError(res, error.message, 400);
        }
    }
};

module.exports = activitiesController;
