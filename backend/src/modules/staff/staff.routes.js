const express = require("express");
const staffController = require("./staff.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const validateRequest = require("../../middleware/validate.middleware");
const { createStaffSchema, updateStaffSchema } = require("./staff.validation");

const router = express.Router();

router.post("/", authMiddleware, roleMiddleware("admin", "user manager"), validateRequest(createStaffSchema), staffController.create.bind(staffController));
router.get("/", authMiddleware, roleMiddleware("admin", "user manager"), staffController.getAll.bind(staffController));
router.get("/:id", authMiddleware, roleMiddleware("admin", "user manager"), staffController.getById.bind(staffController));
router.put("/:id", authMiddleware, roleMiddleware("admin", "user manager"), validateRequest(updateStaffSchema), staffController.update.bind(staffController));
router.delete("/:id", authMiddleware, roleMiddleware("admin", "user manager"), staffController.delete.bind(staffController));

module.exports = router;
