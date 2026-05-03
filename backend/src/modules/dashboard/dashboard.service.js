const prisma = require("../../config/prisma");
class DashboardService {
  async getDashboardData() {
    const totalUsers = await prisma.user.count({ where: { isDeleted: false } });
    const totalOrders = await prisma.order.count({ where: { isDeleted: false } });
    const totalRevenueOrders = await prisma.order.findMany({
      where: {
        isDeleted: false,
        status: { not: "cancelled" },
        payment: {
          status: "paid"
        }
      },
      select: { total: true, shippingFee: true, deliveryMethod: true, method: true }
    });
    const totalRevenue = totalRevenueOrders.reduce((sum, o) => {
      const sFee = o.shippingFee || (o.deliveryMethod === 'express_delivery' ? 500 : (o.deliveryMethod === 'pickup' ? 0 : 350));
      if (o.method === 'return_replacement') {
        return sum - sFee;
      }
      const itemsTotal = Math.max(0, o.total - sFee);
      return sum + itemsTotal;
    }, 0);

    // Inventory Metrics (Refined: Only count products in active categories as 'Active')
    const totalProducts = await prisma.product.count({ where: { isDeleted: false } });
    const activeProducts = await prisma.product.count({
      where: {
        isDeleted: false,
        isActive: true,
        category: { isActive: true, isDeleted: false }
      }
    });
    const totalCategories = await prisma.category.count({ where: { isDeleted: false } });
    const lowStockProducts = await prisma.product.count({ where: { isDeleted: false, stock: { lte: 10 } } });

    // Top Selling Products Aggregation
    const productsWithSales = await prisma.product.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        category: { select: { name: true } },
        orderItems: { 
          select: { quantity: true },
          take: 100 // Limit order items per product for calculation
        }
      },
      take: 50 // Only consider first 50 products for top selling calculation to speed up
    });

    const topSellingProducts = productsWithSales
      .map(p => ({
        id: p.id,
        name: p.name,
        category: p.category?.name || "Uncategorized",
        imageUrl: p.imageUrl,
        totalSales: p.orderItems.reduce((sum, item) => sum + item.quantity, 0)
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5);

    // Chart Data Generation (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentProducts = await prisma.product.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: sevenDaysAgo }
      },
      select: { createdAt: true }
    });

    // Map to days of week
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartDataMap = {};

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      chartDataMap[dayName] = 0;
    }

    recentProducts.forEach(p => {
      if (p.createdAt) {
        const dayName = days[new Date(p.createdAt).getDay()];
        if (chartDataMap[dayName] !== undefined) {
          chartDataMap[dayName]++;
        }
      }
    });

    const chartData = Object.entries(chartDataMap).map(([name, products]) => ({ name, products }));

    const recentOrders = await prisma.order.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    const recentUsers = await prisma.user.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, createdAt: true, phone: true }
    });

    const totalReturns = await prisma.return.count();
    const pendingReturns = await prisma.return.count({ where: { status: 'Pending' } });

    return {
      totalUsers,
      totalOrders,
      totalRevenue,
      totalProducts,
      activeProducts,
      totalCategories,
      lowStockProducts,
      topSellingProducts,
      chartData,
      totalReturns,
      pendingReturns,
      recentOrders: recentOrders || [],
      recentUsers: recentUsers || []
    };
  }

  async getSupplierDashboardData() {
    const totalSuppliers = await prisma.supplier.count();

    // Active suppliers: Suppliers that have at least 1 product
    const suppliersWithProducts = await prisma.supplier.findMany({
      where: { products: { some: { isDeleted: false } } },
      select: { id: true }
    });
    const activeSuppliers = suppliersWithProducts.length;

    const pendingRestocks = await prisma.restockRequest.count({
      where: { status: 'Pending' }
    });

    const totalSuppliedProducts = await prisma.product.count({
      where: { supplierId: { not: null }, isDeleted: false }
    });

    // Chart Data Generation (Last 7 Days) for Restock Requests
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRestocks = await prisma.restockRequest.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      select: { createdAt: true }
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartDataMap = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      chartDataMap[dayName] = 0;
    }

    recentRestocks.forEach(r => {
      if (r.createdAt) {
        const dayName = days[new Date(r.createdAt).getDay()];
        if (chartDataMap[dayName] !== undefined) {
          chartDataMap[dayName]++;
        }
      }
    });

    const chartData = Object.entries(chartDataMap).map(([name, requests]) => ({ name, requests }));

    // Top Suppliers by number of products
    const suppliersWithProductCounts = await prisma.supplier.findMany({
      include: {
        _count: {
          select: { products: { where: { isDeleted: false } } }
        }
      }
    });

    const topSuppliers = suppliersWithProductCounts
      .map(s => ({
        id: s.id,
        name: s.name,
        type: s.type || "Local",
        imageUrl: s.imageUrl,
        productCount: s._count.products
      }))
      .sort((a, b) => b.productCount - a.productCount)
      .slice(0, 5);

    return {
      totalSuppliers,
      activeSuppliers,
      pendingRestocks,
      totalSuppliedProducts,
      chartData,
      topSuppliers
    };
  }

  async getOrderDashboardData() {
    const totalOrders = await prisma.order.count({ where: { isDeleted: false } });
    const pendingOrders = await prisma.order.count({ where: { isDeleted: false, status: "pending" } });
    const confirmedOrders = await prisma.order.count({ where: { isDeleted: false, status: "confirmed" } });
    const shippedOrders = await prisma.order.count({ where: { isDeleted: false, status: "shipped" } });
    const deliveredOrders = await prisma.order.count({ where: { isDeleted: false, status: "delivered" } });
    const cancelledOrders = await prisma.order.count({ where: { isDeleted: false, status: "cancelled" } });

    const revenueOrders = await prisma.order.findMany({
      where: {
        isDeleted: false,
        status: { not: "cancelled" },
        payment: {
          status: "paid"
        }
      },
      select: { total: true, shippingFee: true, deliveryMethod: true, method: true }
    });
    const totalRevenue = revenueOrders.reduce((sum, o) => {
      const sFee = o.shippingFee || (o.deliveryMethod === 'express_delivery' ? 500 : (o.deliveryMethod === 'pickup' ? 0 : 350));
      if (o.method === 'return_replacement') {
        return sum - sFee;
      }
      const itemsTotal = Math.max(0, o.total - sFee);
      return sum + itemsTotal;
    }, 0);

    // Chart Data Generation (Last 7 Days) for Orders
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentOrdersForChart = await prisma.order.findMany({
      where: {
        isDeleted: false,
        createdAt: { gte: sevenDaysAgo }
      },
      select: { createdAt: true }
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartDataMap = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      chartDataMap[dayName] = 0;
    }

    recentOrdersForChart.forEach(o => {
      if (o.createdAt) {
        const dayName = days[new Date(o.createdAt).getDay()];
        if (chartDataMap[dayName] !== undefined) {
          chartDataMap[dayName]++;
        }
      }
    });

    const chartData = Object.entries(chartDataMap).map(([name, orders]) => ({ name, orders }));

    const recentOrders = await prisma.order.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    const recentPayments = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        order: {
          select: {
            id: true,
            user: { select: { name: true } }
          }
        }
      }
    });

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      chartData,
      recentOrders,
      recentPayments
    };
  }

  async getReviewDashboardData() {
    const totalReviews = await prisma.review.count({ where: { isDeleted: false } });

    // Average rating
    const allReviews = await prisma.review.findMany({ where: { isDeleted: false }, select: { rating: true } });
    const averageRating = allReviews.length > 0 ? parseFloat((allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)) : 0;

    const totalReturns = await prisma.return.count();
    const pendingReturns = await prisma.return.count({ where: { status: 'Pending' } });

    // Fetch all reviews and derive createdAt from MongoDB ObjectId
    const activeReviews = await prisma.review.findMany({
      where: { isDeleted: false },
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true, id: true } }
      }
    });

    const reviewsWithDates = activeReviews;

    // Chart Data Generation (Last 7 Days) for Reviews
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentReviewsStat = reviewsWithDates.filter(r => r.createdAt >= sevenDaysAgo);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartDataMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      chartDataMap[dayName] = 0;
    }

    recentReviewsStat.forEach(r => {
      if (r.createdAt) {
        const dayName = days[r.createdAt.getDay()];
        if (chartDataMap[dayName] !== undefined) {
          chartDataMap[dayName]++;
        }
      }
    });
    const chartData = Object.entries(chartDataMap).map(([name, reviews]) => ({ name, reviews }));

    // Recent Reviews 
    const recentReviews = reviewsWithDates
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 5);

    return { totalReviews, averageRating, totalReturns, pendingReturns, chartData, recentReviews };
  }

  async getLoyaltyDashboardData() {
    const totalCoupons = await prisma.coupon.count({ where: { isDeleted: false } });
    // Since Coupon model doesn't have expiryDate or isActive yet, 
    // we consider all non-deleted coupons as active for now.
    const activeCoupons = totalCoupons;

    const transactions = await prisma.loyaltyTransaction.findMany();
    const totalPointsEarned = transactions.reduce((sum, t) => t.points > 0 ? sum + t.points : sum, 0);
    const totalPointsRedeemed = transactions.reduce((sum, t) => t.points < 0 ? sum + Math.abs(t.points) : sum, 0);

    const customers = await prisma.user.findMany({
      where: {
        isDeleted: false,
        // Match both 'Customer' and 'customer' role names
        role: { 
          name: { 
            contains: 'customer',
            mode: 'insensitive' 
          } 
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        loyaltyTransactions: { select: { points: true } }
      }
    });

    const topCustomers = customers
      .map(c => {
        const netPoints = c.loyaltyTransactions.reduce((sum, t) => sum + t.points, 0);
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          netPoints
        };
      })
      .sort((a, b) => b.netPoints - a.netPoints)
      .slice(0, 5);

    // Chart Data Generation (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Some systems might have transactions without createdAt if imported,
    // so we provide a fallback for today if needed, but schema has @default(now())
    const recentTransactions = transactions.filter(t => t.createdAt && new Date(t.createdAt) >= sevenDaysAgo);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartDataMap = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      chartDataMap[dayName] = 0;
    }

    recentTransactions.forEach(t => {
      const dayName = days[new Date(t.createdAt).getDay()];
      if (chartDataMap[dayName] !== undefined && t.points > 0) {
        chartDataMap[dayName] += t.points;
      }
    });

    const chartData = Object.entries(chartDataMap).map(([name, points]) => ({ name, points }));

    return {
      totalCoupons,
      activeCoupons,
      totalLoyaltyTransactions: transactions.length,
      totalPointsEarned,
      totalPointsRedeemed,
      topCustomers,
      chartData
    };
  }

  async getAdminOverallData() {
    try {
      // 1. Core Platform Metrics
      const totalUsers = await prisma.user.count({ where: { isDeleted: false } }) || 0;
      
      // Get all roles except customer to count staff - simplified for MongoDB compatibility
      const roles = await prisma.role.findMany({
        include: { _count: { select: { users: true } } }
      });
      const staffCount = roles
        .filter(r => !r.name.toLowerCase().includes('customer'))
        .reduce((sum, r) => sum + r._count.users, 0);

      // 2. Revenue & Orders - using a more explicit join-like query
      const totalOrders = await prisma.order.count({ where: { isDeleted: false } }) || 0;
      
      // Get paid payments and sum their amounts
      const paidPayments = await prisma.payment.findMany({
        where: { status: "paid" },
        select: { amount: true }
      });
      const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);

      // 3. Products & Stock
      const totalProducts = await prisma.product.count({ where: { isDeleted: false } }) || 0;
      const lowStockCount = await prisma.product.count({ where: { isDeleted: false, stock: { lte: 10 } } }) || 0;

      // 4. Loyalty & Marketing
      const activeCoupons = await prisma.coupon.count({ where: { isDeleted: false } }) || 0;
      const loyaltyPointsSum = await prisma.loyaltyTransaction.aggregate({
        _sum: { points: true }
      });
      const netLoyaltyPoints = loyaltyPointsSum._sum.points || 0;

      // 5. Reviews & Engagement
      const totalReviews = await prisma.review.count({ where: { isDeleted: false } }) || 0;
      const avgRatingAgg = await prisma.review.aggregate({
        where: { isDeleted: false },
        _avg: { rating: true }
      });
      const avgRating = avgRatingAgg._avg.rating || 0;

      // 6. Returns & Logistics
      const pendingReturns = await prisma.return.count({ where: { status: { in: ['Pending', 'Processing'] } } }) || 0;
      const totalSuppliers = await prisma.supplier.count() || 0;

      // 7. Revenue Chart (Last 7 Days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentPayments = await prisma.payment.findMany({
        where: {
          status: "paid",
          createdAt: { gte: sevenDaysAgo }
        },
        select: { amount: true, createdAt: true }
      });

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const revenueMap = {};
      
      // Initialize revenueMap with last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        revenueMap[days[d.getDay()]] = 0;
      }

      recentPayments.forEach(p => {
        const day = days[new Date(p.createdAt).getDay()];
        if (revenueMap[day] !== undefined) revenueMap[day] += p.amount;
      });

      const revenueChart = Object.entries(revenueMap).map(([name, revenue]) => ({ name, revenue }));

      const recentActivities = await prisma.activity.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 10
      }) || [];

      return {
        metrics: {
          platform: { totalUsers, staffCount, totalSuppliers },
          sales: { totalOrders, totalRevenue, pendingReturns },
          inventory: { totalProducts, lowStockCount },
          marketing: { activeCoupons, netLoyaltyPoints },
          engagement: { totalReviews, avgRating }
        },
        revenueChart,
        recentActivities
      };
    } catch (error) {
      console.error("Error in getAdminOverallData:", error);
      throw error;
    }
  }
}

module.exports = new DashboardService();
