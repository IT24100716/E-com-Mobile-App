const activitiesService = require("./activities.service");
const { sendSuccess, sendError } = require("../../utils/response");

const smActivitiesController = {
    getAll: async (req, res) => {
        try {
            const { skip = 0, take = 50, search = "" } = req.query;
            const activities = await activitiesService.getAll(parseInt(skip), parseInt(take), search, "SUPPLIER MANAGER");
            const total = await activitiesService.getTotalCount(search, "SUPPLIER MANAGER");
            return sendSuccess(res, "SM Activities fetched", { activities, total });
        } catch (error) {
            return sendError(res, error.message, 400);
        }
    },

    clearAll: async (req, res) => {
        try {
            await activitiesService.clearAll("SUPPLIER MANAGER");
            return sendSuccess(res, "Supplier Manager history cleared successfully");
        } catch (error) {
            return sendError(res, error.message, 400);
        }
    }
};

module.exports = smActivitiesController;
