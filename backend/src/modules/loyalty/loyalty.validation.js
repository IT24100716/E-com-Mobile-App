const { z } = require("zod");
module.exports = {
  addPointsSchema: z.object({
    userId: z.string({
      required_error: "User ID is required",
      invalid_type_error: "User ID must be a string",
    }),
    points: z.coerce.number({
      required_error: "Points amount is required",
      invalid_type_error: "Points must be a number",
    }).int("Points must be a whole number")
      .refine(val => val !== 0, { message: "Points amount cannot be zero" }),
    type: z.string().optional().default("admin_reward"),
    reason: z.string().optional()
  }).passthrough(),
  updatePointsSchema: z.object({
    points: z.coerce.number().int("Points must be a whole number")
      .refine(val => val !== 0, { message: "Points amount cannot be zero" }).optional(),
    type: z.string().optional()
  }).refine(
    (data) => Object.values(data).some(val => val !== undefined),
    { message: "Please provide at least one field to update" }
  )
};
