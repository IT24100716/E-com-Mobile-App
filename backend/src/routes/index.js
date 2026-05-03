const express = require("express");

const authRoutes = require("../modules/auth/auth.routes");
const usersRoutes = require("../modules/users/users.routes");
const categoriesRoutes = require("../modules/categories/categories.routes");
const productsRoutes = require("../modules/products/products.routes");
const rolesRoutes = require("../modules/roles/roles.routes");
const staffRoutes = require("../modules/staff/staff.routes");
const ordersRoutes = require("../modules/orders/orders.routes");
const paymentsRoutes = require("../modules/payments/payments.routes");
const reviewsRoutes = require("../modules/reviews/reviews.routes");
const returnsRoutes = require("../modules/returns/returns.routes");
const couponsRoutes = require("../modules/coupons/coupons.routes");
const loyaltyRoutes = require("../modules/loyalty/loyalty.routes");
const cartRoutes = require("../modules/cart/cart.routes");
const suppliersRoutes = require("../modules/suppliers/suppliers.routes");
const dashboardRoutes = require("../modules/dashboard/dashboard.routes");
const aiRoutes = require("../modules/ai/ai.routes");
const notificationsRoutes = require("../modules/notifications/notifications.routes");
const activitiesRoutes = require("../modules/activities/activities.routes");
const restockRequestRoutes = require("../modules/restock_requests/restock_requests.routes");
const chatRoutes = require("../modules/chat/chat.routes");


const router = express.Router();

// API Routes
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/categories", categoriesRoutes);
router.use("/products", productsRoutes);
router.use("/roles", rolesRoutes);
router.use("/staff", staffRoutes);
router.use("/orders", ordersRoutes);
router.use("/payments", paymentsRoutes);
router.use("/reviews", reviewsRoutes);
router.use("/returns", returnsRoutes);
router.use("/coupons", couponsRoutes);
router.use("/loyalty", loyaltyRoutes);
router.use("/cart", cartRoutes);
router.use("/suppliers", suppliersRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/ai", aiRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/activities", activitiesRoutes);
router.use("/restock-requests", restockRequestRoutes);
router.use("/chat", chatRoutes);


module.exports = router;
