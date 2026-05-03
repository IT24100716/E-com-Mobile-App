const express = require("express");
const paymentsController = require("./payments.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");
const validateRequest = require("../../middleware/validate.middleware");
const multer = require("../../config/multerMemory");
const { createPaymentSchema } = require("./payments.validation");

const router = express.Router();
router.post("/", authMiddleware, multer.single("proofImage"), validateRequest(createPaymentSchema), paymentsController.create.bind(paymentsController));
router.get("/", authMiddleware, roleMiddleware("admin", "order manager"), paymentsController.getAll.bind(paymentsController));
router.get("/:id", authMiddleware, paymentsController.getById.bind(paymentsController));
router.put("/:id/status", authMiddleware, roleMiddleware("admin", "order manager"), paymentsController.updateStatus.bind(paymentsController));
module.exports = router;
