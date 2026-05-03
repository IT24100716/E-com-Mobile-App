const express = require("express");
const usersController = require("./users.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");

const router = express.Router();

router.get("/password-requests", authMiddleware, roleMiddleware("admin"), usersController.getPasswordRequests.bind(usersController));
router.delete("/password-requests/:id", authMiddleware, roleMiddleware("admin"), usersController.deletePasswordRequest.bind(usersController));

router.get("/", authMiddleware, usersController.getAll.bind(usersController));
router.get("/:id", authMiddleware, usersController.getById.bind(usersController));
router.put("/:id", authMiddleware, usersController.update.bind(usersController));
router.put("/:id/password", authMiddleware, roleMiddleware("admin"), usersController.updatePassword.bind(usersController));
router.post("/request-password-change", authMiddleware, usersController.requestPasswordChange.bind(usersController));
router.delete("/:id", authMiddleware, usersController.delete.bind(usersController));

module.exports = router;
