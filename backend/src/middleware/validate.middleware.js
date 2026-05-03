const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      console.log(`[Validation] Checking body for ${req.path}:`, JSON.stringify(req.body, null, 2));
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      console.error("[Validation Error]", JSON.stringify(error.errors, null, 2));
      const firstError = error.errors[0]?.message || "Invalid input data";
      return res.status(400).json({
        success: false,
        message: firstError,
        errors: error.errors
      });

    }
  };
};

module.exports = validateRequest;
