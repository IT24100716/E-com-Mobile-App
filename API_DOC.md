# 🛒 Simple E-Commerce Backend API Documentation

**Base URL**

```
http://localhost:5000/api/v1
```

**Authentication**

Protected endpoints require JWT.

```
Authorization: Bearer <token>
```

---

# 🔐 Authentication APIs

## Register User

**POST**

```
/auth/register
```

### Request Body

```json
{
  "name": "John Doe",
  "email": "john@email.com",
  "password": "123456"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "john@email.com"
  }
}
```

---

## Login

**POST**

```
/auth/login
```

### Request

```json
{
  "email": "john@email.com",
  "password": "123456"
}
```

### Response

```json
{
  "token": "jwt_token_here"
}
```

---

## Get Profile

**GET**

```
/auth/profile
```

### Response

```json
{
  "id": "user_id",
  "name": "John Doe",
  "email": "john@email.com"
}
```

---

## Forgot Password

**POST**

```
/auth/forgot-password
```

### Request

```json
{
  "email": "john@email.com"
}
```

---

## Reset Password

**POST**

```
/auth/reset-password
```

### Request

```json
{
  "token": "reset_token",
  "password": "newpassword"
}
```

---

# 👤 Roles API

## Create Role

**POST**

```
/roles
```

```json
{
  "name": "Admin"
}
```

---

## Get Roles

**GET**

```
/roles
```

---

## Update Role

**PUT**

```
/roles/:id
```

```json
{
  "name": "Manager"
}
```

---

## Delete Role

**DELETE**

```
/roles/:id
```

(Soft delete)

---

# 👥 Staff API

## Create Staff

**POST**

```
/staff
```

```json
{
  "name": "Staff User",
  "email": "staff@email.com",
  "password": "123456",
  "roleId": "role_id"
}
```

---

## Get Staff List

**GET**

```
/staff
```

---

## Update Staff

**PUT**

```
/staff/:id
```

---

## Delete Staff

**DELETE**

```
/staff/:id
```

---

# 📦 Categories API

## Create Category

**POST**

```
/categories
```

```json
{
  "name": "Electronics"
}
```

---

## Get Categories

**GET**

```
/categories
```

---

## Update Category

**PUT**

```
/categories/:id
```

---

## Delete Category

**DELETE**

```
/categories/:id
```

---

# 🛍 Products API

## Create Product

**POST**

```
/products
```

Form Data

```
name
description
price
stock
categoryId
supplierId
image
```

---

## Get Products

**GET**

```
/products
```

---

## Get Product By ID

**GET**

```
/products/:id
```

---

## Update Product

**PUT**

```
/products/:id
```

---

## Delete Product

**DELETE**

```
/products/:id
```

(Soft delete)

---

# 🛒 Cart API

## Add Item To Cart

**POST**

```
/cart
```

```json
{
  "productId": "product_id",
  "quantity": 2
}
```

---

## Get Cart

**GET**

```
/cart
```

---

## Update Cart Item

**PUT**

```
/cart/:itemId
```

```json
{
  "quantity": 3
}
```

---

## Remove Cart Item

**DELETE**

```
/cart/:itemId
```

(Hard delete)

---

# 📦 Orders API

## Create Order

**POST**

```
/orders
```

```json
{
  "cartId": "cart_id"
}
```

### Response

```json
{
  "orderId": "order_id",
  "status": "Pending"
}
```

---

## Get Orders

**GET**

```
/orders
```

---

## Get Order

**GET**

```
/orders/:id
```

---

## Update Order Status

**PUT**

```
/orders/:id/status
```

```json
{
  "status": "Shipped"
}
```

Statuses

```
Pending
Confirmed
Shipped
Delivered
```

---

## Delete Order

**DELETE**

```
/orders/:id
```

(Admin only)

---

# 💳 Payments API

## Create Payment

**POST**

```
/payments
```

```json
{
  "orderId": "order_id",
  "amount": 500
}
```

---

## Get Payments

**GET**

```
/payments
```

---

## Update Payment Status

**PUT**

```
/payments/:id
```

```json
{
  "status": "Paid"
}
```

---

## Delete Payment

**DELETE**

```
/payments/:id
```

---

# ⭐ Reviews API

## Create Review

**POST**

```
/reviews
```

Form Data

```
productId
rating
comment
image
```

---

## Get Reviews

**GET**

```
/reviews
```

---

## Update Review

**PUT**

```
/reviews/:id
```

---

## Delete Review

**DELETE**

```
/reviews/:id
```

(Soft delete)

---

# ↩ Returns API

## Create Return Request

**POST**

```
/returns
```

```json
{
  "orderId": "order_id",
  "reason": "Damaged item"
}
```

---

## Get Returns

**GET**

```
/returns
```

---

## Update Return Status

**PUT**

```
/returns/:id
```

```json
{
  "status": "Approved"
}
```

Statuses

```
Pending
Approved
Rejected
```

---

## Delete Return

**DELETE**

```
/returns/:id
```

---

# 🎁 Coupons API

## Create Coupon

**POST**

```
/coupons
```

```json
{
  "code": "WELCOME10",
  "discount": 10,
  "minCartValue": 500
}
```

---

## Get Coupons

**GET**

```
/coupons
```

---

## Update Coupon

**PUT**

```
/coupons/:id
```

---

## Delete Coupon

**DELETE**

```
/coupons/:id
```

(Soft delete)

---

# 🪙 Loyalty API

## Add Points

**POST**

```
/loyalty
```

```json
{
  "userId": "user_id",
  "points": 50,
  "type": "EARN"
}
```

---

## Get Loyalty Transactions

**GET**

```
/loyalty
```

---

## Update Loyalty Record

**PUT**

```
/loyalty/:id
```

---

## Delete Loyalty Record

**DELETE**

```
/loyalty/:id
```

(Hard delete)

---

# 🚚 Suppliers API

## Create Supplier

**POST**

```
/suppliers
```

```json
{
  "name": "ABC Supplier",
  "email": "supplier@email.com",
  "phone": "0771234567"
}
```

---

## Get Suppliers

**GET**

```
/suppliers
```

---

## Update Supplier

**PUT**

```
/suppliers/:id
```

---

## Delete Supplier

**DELETE**

```
/suppliers/:id
```

---

# 📊 Dashboard API

## Get Dashboard Data

**GET**

```
/dashboard
```

### Response

```json
{
  "totalUsers": 120,
  "totalOrders": 540,
  "totalRevenue": 450000,
  "lowStockProducts": 5
}
```

---

# 📌 API Summary

| Module     | Endpoints |
| ---------- | --------- |
| Auth       | 5         |
| Roles      | 4         |
| Staff      | 4         |
| Categories | 4         |
| Products   | 5         |
| Cart       | 4         |
| Orders     | 5         |
| Payments   | 4         |
| Reviews    | 4         |
| Returns    | 4         |
| Coupons    | 4         |
| Loyalty    | 4         |
| Suppliers  | 4         |
| Dashboard  | 1         |

**Total APIs ≈ 52 endpoints**

---

# ✅ Ready For Frontend

Frontend can use these APIs using:

```
Axios
Fetch
React Query
```

Example base URL

```
http://localhost:5000/api/v1
```
