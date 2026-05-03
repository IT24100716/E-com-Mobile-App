const { z } = require("zod");
module.exports = {
  addPointsSchema: z.object({
    userId: z.string(),
    points: z.coerce.number().int().refine(val => val !== 0, { message: "Points cannot be zero" }),
    type: z.string().default("bonus")
  }),
  updatePointsSchema: z.object({
    points: z.coerce.number().int().refine(val => val !== 0, { message: "Points cannot be zero" }).optional(),
    type: z.string().optional()
  }).refine(
    (data) => Object.values(data).some(val => val !== undefined),
    { message: "At least one field must be provided for update" }
  )
};
