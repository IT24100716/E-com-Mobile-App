const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - Please login again" });
    }

    const userRole = req.user.role || '';
    console.log(`[RoleCheck] User Role: "${userRole}", Allowed: [${allowedRoles.join(", ")}]`);

    if (!userRole) {
      return res.status(403).json({ message: "Forbidden - No role assigned to your account. Please log in again or contact IT." });
    }

    if (allowedRoles.includes(userRole.toLowerCase())) {
      next();
    } else {
      return res.status(403).json({ message: `Forbidden - Insufficient permissions. Your role is '${userRole}', but this action requires one of: ${allowedRoles.join(", ")}.` });
    }
  };
};

module.exports = roleMiddleware;
