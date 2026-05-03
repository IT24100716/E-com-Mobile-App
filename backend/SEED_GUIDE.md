# Database Seeding Guide

This guide explains how to seed your database with initial data including roles, admin user, categories, suppliers, products, and coupons.

---

## What Gets Seeded

The seed script (`prisma/seed.js`) automatically creates:

### ✅ Roles (3)
- **Admin** - Full system access
- **Staff** - Staff management access
- **Customer** - Regular user access

### ✅ Users (1)
- **System Admin**
  - Email: `admin@store.com`
  - Password: `admin123`
  - Role: Admin

### ✅ Categories (3)
- Electronics
- Clothing
- Books

### ✅ Suppliers (2)
- Tech Supplies Inc
- Fashion Wholesale Ltd

### ✅ Products (3)
- Wireless Headphones (Electronics)
- Cotton T-Shirt (Clothing)
- JavaScript Guide (Books)

### ✅ Coupons (2)
- WELCOME10 - 10% off (first order only, min $50)
- SUMMER20 - 20% off (min $100)

---

## How to Use

### 1️⃣ First Time Setup

```bash
cd backend

# Install dependencies
npm install

# Push Prisma schema to database
npm run db:push

# Run the seed script
npm run seed
```

### 2️⃣ Run Seed Anytime

```bash
npm run seed
```

The seed script uses **upsert** operations, so:
- ✅ Safe to run multiple times
- ✅ Won't create duplicates (updates existing records)
- ✅ Won't delete other data in the database

### 3️⃣ Alternative: With Prisma CLI

```bash
npx prisma db seed
```

---

## Login After Seeding

Use the admin credentials to login:

```bash
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@store.com",
    "password": "admin123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Use this token for all protected API requests:
```bash
curl -X GET http://localhost:5001/api/v1/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Using the Admin Dashboard

1. Start backend: `npm run dev` (port 5001)
2. Start frontend: `npm run dev` (port 5173)
3. Go to `http://localhost:5173/login`
4. Login with:
   - Email: `admin@store.com`
   - Password: `admin123`
5. Access admin dashboard

---

## Seed Script Details

**File**: `backend/prisma/seed.js`

**What it does**:
- Uses Prisma `upsert` to create or update records
- Won't create duplicates (safe to run multiple times)
- Uses bcrypt to hash the admin password
- Logs each step with emojis for easy tracking

**Key functions**:
```javascript
upsert({
  where: { /* unique field */ },
  update: {},  // No changes if exists
  create: { /* data */ }  // Create if doesn't exist
})
```

---

## Resetting the Database

If you want to start fresh:

### Option 1: Push Schema Again (Recommended)
```bash
npm run db:push
# When prompted, confirm database reset
npm run seed
```

### Option 2: Delete and Recreate
```bash
# Clear MongoDB collection
npx prisma db push --skip-generate --force-reset
npm run seed
```

### Option 3: Manual via Prisma Studio
```bash
npm run studio
# Open http://localhost:5555
# Manually delete records
```

---

## Customizing the Seed

To add more data, edit `prisma/seed.js`:

```javascript
// Example: Add a new product
const product = await prisma.product.upsert({
  where: { name: "Your Product Name" },
  update: {},
  create: {
    name: "Your Product Name",
    description: "Product description",
    price: 99.99,
    stock: 50,
    categoryId: electronics.id,
    supplierId: supplier1.id,
  },
});
console.log("✅ Product created:", product.id);
```

Then run:
```bash
npm run seed
```

---

## Troubleshooting

### ❌ "Cannot find module 'bcrypt'"
```bash
npm install bcrypt
npm run seed
```

### ❌ "Database connection error"
Check your `.env` file:
```
DATABASE_URL="mongodb+srv://root:root@cluster0.zekgg7g.mongodb.net/ecom-2026"
```

### ❌ "Prisma client not generated"
```bash
npm run prisma
npm run seed
```

### ❌ Script hangs or doesn't complete
The seed script should take 5-10 seconds. If it hangs:
1. Press `Ctrl+C` to stop
2. Check if MongoDB is running
3. Verify `DATABASE_URL` in `.env`
4. Try again: `npm run seed`

---

## Script Output Example

```
🌱 Starting database seed...
📋 Creating roles...
✅ Admin role created: 65f2a1b3c4d5e6f7g8h9i0j1
✅ Staff role created: 65f2a1b3c4d5e6f7g8h9i0j2
✅ Customer role created: 65f2a1b3c4d5e6f7g8h9i0j3
👤 Creating admin user...
✅ Admin user created: 65f2a1b3c4d5e6f7g8h9i0j4
🏷️  Creating sample categories...
✅ Electronics category created: 65f2a1b3c4d5e6f7g8h9i0j5
✅ Clothing category created: 65f2a1b3c4d5e6f7g8h9i0j6
✅ Books category created: 65f2a1b3c4d5e6f7g8h9i0j7
🏭 Creating sample suppliers...
✅ Supplier 1 created: 65f2a1b3c4d5e6f7g8h9i0j8
✅ Supplier 2 created: 65f2a1b3c4d5e6f7g8h9i0j9
📦 Creating sample products...
✅ Product 1 created: 65f2a1b3c4d5e6f7g8h9i0ja
✅ Product 2 created: 65f2a1b3c4d5e6f7g8h9i0jb
✅ Product 3 created: 65f2a1b3c4d5e6f7g8h9i0jc
🎟️  Creating sample coupons...
✅ Coupon 1 created: 65f2a1b3c4d5e6f7g8h9i0jd
✅ Coupon 2 created: 65f2a1b3c4d5e6f7g8h9i0je

✨ Database seeding completed successfully!

📝 Login credentials:
   Email: admin@store.com
   Password: admin123

🎯 Test with:
   curl -X POST http://localhost:5001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@store.com","password":"admin123"}'
```

---

## Next Steps

After seeding, you can:

1. **Test API endpoints** - Use Postman or cURL
2. **Login to frontend** - Visit http://localhost:5173/login
3. **Access admin dashboard** - Create admin pages
4. **Add more products** - Via API or by extending the seed script
5. **Add more users** - Via API or register page

---

## Notes

- ✅ Safe to run multiple times (uses upsert)
- ✅ Doesn't delete existing data
- ✅ All users are seeded with hashed passwords
- ✅ Supports MongoDB ObjectId types
- ✅ Easy to customize and extend
