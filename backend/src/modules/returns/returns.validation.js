const { z } = require("zod");

const createReturnSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  items: z.string()
    .transform((str) => JSON.parse(str))
    .pipe(z.array(z.object({
      productId: z.string(),
      quantity: z.number().min(1),
      variantAttributes: z.any().optional()
    })).min(1, "Select at least one item to return"))
});

const updateStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "return picked"], {
    errorMap: () => ({ message: "Status must be pending, approved, rejected, or return picked" }),
  }),
});

module.exports = {
  createReturnSchema,
  updateStatusSchema,
};
