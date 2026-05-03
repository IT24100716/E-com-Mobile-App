const express = require("express");
const activitiesController = require("./activities.controller");
const pmActivitiesController = require("./pm.activities.controller");
const smActivitiesController = require("./sm.activities.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");

const router = express.Router();

// All activity routes are protected and restricted to admin/product manager roles
router.use(authMiddleware);
router.use(roleMiddleware("admin", "product manager", "supplier manager"));

// Legacy Universal Endpoints
router.get("/", activitiesController.getAll);
router.delete("/", activitiesController.clearAll);

// Isolated Product Manager Endpoints
router.get("/pm", pmActivitiesController.getAll);
router.delete("/pm", pmActivitiesController.clearAll);

// Isolated Supplier Manager Endpoints
router.get("/sm", smActivitiesController.getAll);
router.delete("/sm", smActivitiesController.clearAll);

// Cross-domain Item Endpoints
router.get("/user/:userId", activitiesController.getByUser);
router.delete("/:id", activitiesController.deleteById);

module.exports = router;
