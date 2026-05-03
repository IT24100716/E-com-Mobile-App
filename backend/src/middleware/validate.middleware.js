const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      console.log("=================Validation error==================")
      console.error(error)
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors
      });

    }
  };
};

module.exports = validateRequest;
