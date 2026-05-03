# Coupons & Loyalty Points Integration Plan

## Overview
Allow users to apply coupons and loyalty points when placing orders. Admins should be able to view discount details (coupon used, points used/earned) for each order.

---

## 1. Database Schema Changes

### 1.1 New Model: OrderDiscount
Add to `backend/prisma/schema.prisma`:

```prisma
model OrderDiscount {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  orderId       String   @unique @db.ObjectId
  couponId     String?  @db.ObjectId
  couponCode   String?   // Store code even if coupon is deleted
  couponDiscount Float   // Discount amount from coupon (LKR)
  pointsUsed   Int       // Points redeemed by user
  pointsValue  Float     // Monetary value of points (pointsUsed * 0.1 LKR)
  earnedPoints Int       // Points earned from this order (floor(finalTotal / 10))
  order        Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  coupon       Coupon?  @relation(fields: [couponId], references: [id])
  createdAt    DateTime @default(now())
}
```

### 1.2 Update Order Model
Add relation to existing `Order` model:

```prisma
model Order {
  // ... existing fields
  orderDiscount  OrderDiscount?
}
```

### 1.3 Run Database Commands
```bash
cd backend
npm run db:push
npm run prisma generate
```

---

## 2. Backend - Loyalty Service Updates

### File: `backend/src/modules/loyalty/loyalty.service.js`

Add new method:

```javascript
async redeemPoints(userId, points, orderId) {
  // Validate user has enough points
  const balance = await this.getBalance(userId);
  if (balance < points) {
    throw new Error("Insufficient points");
  }
  
  // Create negative transaction (deduction)
  return prisma.loyaltyTransaction.create({
    data: {
      userId,
      points: -points,  // Negative for deduction
      type: "redeemed",
      orderId          // Reference to order
    }
  });
}
```

---

## 3. Backend - Orders Service Updates

### File: `backend/src/modules/orders/orders.service.js`

#### 3.1 Update create() method
Add parameters: `couponCode`, `pointsUsed`

**Logic Flow:**

1. **Validate coupon (if provided)**:
   - Find coupon by code
   - Check coupon is not deleted
   - Check cart meets `minCartValue`
   - If `firstOrder: true`, check user has no previous orders

2. **Calculate discounts**:
   - `couponDiscount`: If coupon exists, apply discount (percentage or fixed amount)
   - `pointsValue`: `pointsUsed * 0.1` (1 point = 0.1 LKR)
   - `finalTotal`: `total - couponDiscount - pointsValue` (must be >= 0)

3. **Create order** with `finalTotal`

4. **Deduct points** (if pointsUsed > 0):
   - Call `loyaltyService.redeemPoints(userId, pointsUsed, orderId)`

5. **Create OrderDiscount record**:
   ```javascript
   {
     orderId,
     couponId,
     couponCode: coupon?.code,
     couponDiscount,
     pointsUsed,
     pointsValue,
     earnedPoints: Math.floor(finalTotal / 10)
   }
   ```

6. **Earn points**:
   - Calculate: `earnedPoints = Math.floor(finalTotal / 10)`
   - Create positive loyalty transaction

#### 3.2 Add new methods

```javascript
async applyDiscount(userId, orderId, { couponCode, pointsUsed }) {
  // 1. Get order
  // 2. Validate coupon if provided
  // 3. Calculate points value if pointsUsed provided
  // 4. Check user has enough points
  // 5. Return discount calculations (for preview)
}

async getDiscountDetails(orderId) {
  return prisma.orderDiscount.findUnique({
    where: { orderId },
    include: { coupon: true }
  });
}
```

---

## 4. Backend - Orders Controller Updates

### File: `backend/src/modules/orders/orders.controller.js`

Add new endpoints:

```javascript
async applyDiscount(req, res) {
  try {
    const { couponCode, pointsUsed } = req.body;
    const result = await ordersService.applyDiscount(
      req.user.id, 
      req.params.id, 
      { couponCode, pointsUsed }
    );
    return sendSuccess(res, "Discount applied", result);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
}

async getDiscountDetails(req, res) {
  try {
    const discount = await ordersService.getDiscountDetails(req.params.id);
    return sendSuccess(res, "Discount details fetched", discount);
  } catch (error) {
    return sendError(res, error.message, 400);
  }
}
```

---

## 5. Backend - Orders Routes

### File: `backend/src/modules/orders/orders.routes.js`

Add new routes:

```javascript
router.post("/:id/apply-discount", authMiddleware, ordersController.applyDiscount.bind(ordersController));
router.get("/:id/discount", authMiddleware, ordersController.getDiscountDetails.bind(ordersController));
```

---

## 6. Frontend - New Service

### File: `frontend/src/services/orderDiscount.service.js`

```javascript
import api from "../api/axios";

export const orderDiscountService = {
  applyDiscount: (orderId, data) => 
    api.post(`/orders/${orderId}/apply-discount`, data),
  
  getDiscount: (orderId) => 
    api.get(`/orders/${orderId}/discount`)
};
```

Add to `frontend/src/services/index.js`:
```javascript
export * from "./orderDiscount.service";
```

---

## 7. Frontend - Payment Page Updates

### File: `frontend/src/pages/client/CreatePaymentPage.jsx`

#### 7.1 New State Variables
```javascript
const [couponCode, setCouponCode] = useState("");
const [appliedCoupon, setAppliedCoupon] = useState(null);
const [couponError, setCouponError] = useState("");
const [pointsToUse, setPointsToUse] = useState(0);
const [userPoints, setUserPoints] = useState(0);
const [applyingCoupon, setApplyingCoupon] = useState(false);
```

#### 7.2 Fetch User Points on Mount
```javascript
useEffect(() => {
  // Fetch user's loyalty points balance
  loyaltyService.getTransactions()
    .then(res => {
      const balance = calculateTotalPoints(res.data.data);
      setUserPoints(balance);
    });
}, []);
```

#### 7.3 Helper Functions
```javascript
const calculatePointsValue = (points) => points * 0.1;
const calculateEarnedPoints = (amount) => Math.floor(amount / 10);

const applyCoupon = async () => {
  if (!couponCode.trim()) return;
  setApplyingCoupon(true);
  setCouponError("");
  try {
    const res = await orderDiscountService.applyDiscount(orderId, { 
      couponCode, 
      pointsUsed: pointsToUse 
    });
    setAppliedCoupon(res.data.data);
  } catch (err) {
    setCouponError(err.response?.data?.message || "Invalid coupon");
  } finally {
    setApplyingCoupon(false);
  }
};

const useMaxPoints = () => {
  const maxPoints = Math.floor(orderAmount * 10); // Max points worth the order
  const usablePoints = Math.min(userPoints, maxPoints);
  setPointsToUse(usablePoints);
};
```

#### 7.4 UI - Coupon Section
Add above payment methods:

```jsx
<div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 mb-6">
  <h3 className="text-lg font-semibold text-zinc-900 mb-4">Apply Discounts</h3>
  
  {/* Coupon Input */}
  <div className="flex gap-3 mb-4">
    <input
      type="text"
      value={couponCode}
      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
      placeholder="Enter coupon code"
      className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg"
    />
    <Button 
      onClick={applyCoupon} 
      disabled={!couponCode.trim() || applyingCoupon}
    >
      {applyingCoupon ? "Applying..." : "Apply"}
    </Button>
  </div>
  {couponError && <p className="text-red-500 text-sm mb-4">{couponError}</p>}
  
  {/* Loyalty Points */}
  <div className="border-t border-zinc-200 pt-4">
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-zinc-600">Your Points:</span>
      <span className="font-semibold">{userPoints} points</span>
    </div>
    <div className="flex gap-3">
      <input
        type="number"
        value={pointsToUse}
        onChange={(e) => setPointsToUse(Math.max(0, parseInt(e.target.value) || 0))}
        placeholder="Points to use"
        className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg"
      />
      <Button variant="secondary" onClick={useMaxPoints}>
        Use Max
      </Button>
    </div>
    <p className="text-xs text-zinc-500 mt-2">
      1 point = 0.1 LKR • You'll earn {calculateEarnedPoints(finalAmount)} points
    </p>
  </div>
</div>
```

#### 7.5 Display Discount Summary
In the order summary section, show:

```jsx
<div className="space-y-2 text-sm">
  <div className="flex justify-between">
    <span>Subtotal:</span>
    <span>{formatPrice(originalTotal)}</span>
  </div>
  {appliedCoupon?.couponDiscount > 0 && (
    <div className="flex justify-between text-green-600">
      <span>Coupon ({appliedCoupon.couponCode}):</span>
      <span>-{formatPrice(appliedCoupon.couponDiscount)}</span>
    </div>
  )}
  {appliedCoupon?.pointsValue > 0 && (
    <div className="flex justify-between text-green-600">
      <span>Points ({appliedCoupon.pointsUsed} pts):</span>
      <span>-{formatPrice(appliedCoupon.pointsValue)}</span>
    </div>
  )}
  <div className="flex justify-between font-bold text-lg border-t border-zinc-200 pt-2">
    <span>Total:</span>
    <span>{formatPrice(finalAmount)}</span>
  </div>
</div>
```

#### 7.6 Submit with Discount Info
Pass discount info to order/payment:

```javascript
const onSubmit = async (data) => {
  await handleCreatePayment(
    method, 
    status, 
    "Payment successful!", 
    data,
    { couponCode: appliedCoupon?.couponCode, pointsUsed: pointsToUse }
  );
};
```

---

## 8. Frontend - Admin Orders Page Updates

### File: `frontend/src/pages/admin/OrdersPage.jsx`

#### 8.1 Add Discount Column
```javascript
{
  key: "discount",
  label: "Discount",
  render: (row) => row.orderDiscount ? (
    <button
      onClick={() => openDiscountModal(row)}
      className="text-blue-600 hover:underline text-sm"
    >
      View
    </button>
  ) : (
    <span className="text-gray-400 text-sm">None</span>
  )
}
```

#### 8.2 Add Modal State
```javascript
const [discountModalOrder, setDiscountModalOrder] = useState(null);
```

#### 8.3 Open Discount Modal
```javascript
const openDiscountModal = async (order) => {
  try {
    const res = await orderDiscountService.getDiscount(order.id);
    setDiscountModalOrder(res.data.data);
  } catch (err) {
    toast.error("Failed to fetch discount details");
  }
};
```

#### 8.4 300x300px Modal
Add at the end of component:

```jsx
<Modal
  isOpen={!!discountModalOrder}
  onClose={() => setDiscountModalOrder(null)}
  title="Discount Details"
  size="300" // 300px width
>
  {discountModalOrder && (
    <div className="p-4">
      {/* Coupon Details */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-500 mb-1">Coupon</h4>
        {discountModalOrder.couponCode ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="font-medium text-green-800">{discountModalOrder.couponCode}</p>
            <p className="text-sm text-green-600">
              -{formatPrice(discountModalOrder.couponDiscount)}
            </p>
          </div>
        ) : (
          <p className="text-gray-400">No coupon used</p>
        )}
      </div>

      {/* Points Details */}
      <div>
        <h4 className="text-sm font-semibold text-gray-500 mb-1">Loyalty Points</h4>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Used:</span>
            <span className="font-medium">
              {discountModalOrder.pointsUsed > 0 
                ? `${discountModalOrder.pointsUsed} points (-${formatPrice(discountModalOrder.pointsValue)})`
                : "None"
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Earned:</span>
            <span className="font-medium text-green-700">
              +{discountModalOrder.earnedPoints} points
            </span>
          </div>
        </div>
      </div>
    </div>
  )}
</Modal>
```

**Note:** The modal size `size="300"` should render approximately 300px width × 300px height. Verify against the Modal component implementation.

---

## 9. Key Calculations Summary

| Scenario | Points Earned | Points Value |
|----------|---------------|--------------|
| Order 120 LKR | 12 points | - |
| Order 11 LKR | 1 point | - |
| Order 9 LKR | 0 points | - |
| Redeem 10 points | - | 1 LKR discount |
| Redeem 50 points | - | 5 LKR discount |

**Formulas:**
- **Earn points**: `Math.floor(finalOrderTotal / 10)`
- **Points value**: `pointsUsed * 0.1` (LKR)
- **Final total**: `originalTotal - couponDiscount - pointsValue`

---

## 10. Testing Scenarios

1. **Apply valid coupon**: Code exists, meets minCartValue, not first order
2. **Apply invalid coupon**: Wrong code, below minCartValue, first-order only
3. **Use points**: User has enough points, points exceed order value
4. **Use more points than available**: Show error
5. **Combine coupon + points**: Both applied correctly
6. **No discount**: Order as normal, earn points
7. **Admin view**: See correct discount details in modal

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `backend/prisma/schema.prisma` | Add OrderDiscount model, update Order |
| `backend/src/modules/loyalty/loyalty.service.js` | Add redeemPoints method |
| `backend/src/modules/orders/orders.service.js` | Update create(), add discount methods |
| `backend/src/modules/orders/orders.controller.js` | Add endpoints |
| `backend/src/modules/orders/orders.routes.js` | Add routes |
| `frontend/src/services/orderDiscount.service.js` | Create new service |
| `frontend/src/services/index.js` | Export new service |
| `frontend/src/pages/client/CreatePaymentPage.jsx` | Add coupon/points UI |
| `frontend/src/pages/admin/OrdersPage.jsx` | Add discount column & modal |
