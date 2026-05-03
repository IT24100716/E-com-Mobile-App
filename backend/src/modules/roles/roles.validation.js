const { z } = require("zod");

const createRoleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
});

const updateRoleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters").optional(),
});

module.exports = {
  createRoleSchema,
  updateRoleSchema,
};
