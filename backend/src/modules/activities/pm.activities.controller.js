const activitiesService = require("./activities.service");
const { sendSuccess, sendError } = require("../../utils/response");

const pmActivitiesController = {
    getAll: async (req, res) => {
        try {
            const { skip = 0, take = 50, search = "" } = req.query;
            const activities = await activitiesService.getAll(parseInt(skip), parseInt(take), search, "PRODUCT MANAGER");
            const total = await activitiesService.getTotalCount(search, "PRODUCT MANAGER");
            return sendSuccess(res, "PM Activities fetched", { activities, total });
        } catch (error) {
            return sendError(res, error.message, 400);
        }
    },

    clearAll: async (req, res) => {
        try {
            await activitiesService.clearAll("PRODUCT MANAGER");
            return sendSuccess(res, "Product Manager history cleared successfully");
        } catch (error) {
            return sendError(res, error.message, 400);
        }
    }
};

module.exports = pmActivitiesController;
