const express = require("express");
const router = express.Router();
const restockRequestController = require("./restock_requests.controller.js");
const authMiddleware = require("../../middleware/auth.middleware");
const roleMiddleware = require("../../middleware/role.middleware");

router.use(authMiddleware);

router.post(
  "/",
  roleMiddleware("admin", "product manager", "review manager"),
  restockRequestController.create
);

router.get(
  "/",
  roleMiddleware("admin", "product manager", "supplier manager", "review manager"),
  restockRequestController.getAll
);

router.get(
  "/:id",
  roleMiddleware("admin", "product manager", "supplier manager", "review manager"),
  restockRequestController.getById
);

router.patch(
  "/:id/status",
  roleMiddleware("admin", "supplier manager", "product manager"),
  restockRequestController.updateStatus
);

router.patch(
  "/:id/approve",
  roleMiddleware("admin", "supplier manager", "product manager"),
  restockRequestController.approve
);

router.patch(
  "/:id/process",
  roleMiddleware("admin", "supplier manager", "product manager"),
  restockRequestController.process
);

router.patch(
  "/:id/complete",
  roleMiddleware("admin", "supplier manager", "product manager"),
  restockRequestController.complete
);

router.patch(
  "/:id/add-to-stock",
  roleMiddleware("admin", "product manager"),
  restockRequestController.addToStock
);

module.exports = router;
