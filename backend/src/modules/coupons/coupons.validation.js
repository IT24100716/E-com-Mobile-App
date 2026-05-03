const { z } = require("zod");

const createCouponSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters"),
  discount: z.number().positive("Discount must be positive"),
  discountType: z.string().optional(),
  minCartValue: z.number().nonnegative("Min cart value must be non-negative").default(0),
  firstOrder: z.boolean().default(false),
  targetType: z.enum(["all", "category", "product"]).default("all"),
  targetCategoryIds: z.array(z.string()).optional().default([]),
  targetProductIds: z.array(z.string()).optional().default([]),
  audienceType: z.enum(["all", "new", "specific"]).default("all"),
  audienceUserIds: z.array(z.string()).optional().default([]),
});

const updateCouponSchema = z.object({
  code: z.string().min(2).optional(),
  discount: z.number().positive().optional(),
  discountType: z.string().optional(),
  minCartValue: z.number().nonnegative().optional(),
  firstOrder: z.boolean().optional(),
  targetType: z.enum(["all", "category", "product"]).optional(),
  targetCategoryIds: z.array(z.string()).optional(),
  targetProductIds: z.array(z.string()).optional(),
  audienceType: z.enum(["all", "new", "specific"]).optional(),
  audienceUserIds: z.array(z.string()).optional(),
});

module.exports = {
  createCouponSchema,
  updateCouponSchema,
};
