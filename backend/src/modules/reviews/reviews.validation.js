const { z } = require("zod");

const createReviewSchema = z.object({
  productId: z.string(),
  rating: z.coerce.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().min(5, "Comment must be at least 5 characters"),
  orderId: z.string().optional(),
});

const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().min(5).optional(),
});

const replyReviewSchema = z.object({
  reply: z.string().min(1, "Reply cannot be empty"),
});

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  replyReviewSchema,
};
