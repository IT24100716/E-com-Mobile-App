const express = require("express");
const reviewsController = require("./reviews.controller");
const authMiddleware = require("../../middleware/auth.middleware");
const validateRequest = require("../../middleware/validate.middleware");
const multer = require("../../config/multer");
const { createReviewSchema, updateReviewSchema, replyReviewSchema } = require("./reviews.validation");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  multer.memory.single("image"),
  validateRequest(createReviewSchema),
  reviewsController.create.bind(reviewsController)
);
router.get("/", reviewsController.getAll.bind(reviewsController));
router.get("/mine", authMiddleware, reviewsController.getMine.bind(reviewsController));
router.get("/:id", reviewsController.getById.bind(reviewsController));
router.put(
  "/:id",
  authMiddleware,
  multer.memory.single("image"),
  validateRequest(updateReviewSchema),
  reviewsController.update.bind(reviewsController)
);
router.patch(
  "/:id/reply",
  authMiddleware,
  validateRequest(replyReviewSchema),
  reviewsController.reply.bind(reviewsController)
);
router.delete("/:id", authMiddleware, reviewsController.delete.bind(reviewsController));

module.exports = router;
