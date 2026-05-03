# 🛒 Simple E-Commerce Backend Development Plan

**Stack:** Node.js + Express + Prisma + MongoDB + JavaScript
**Architecture:** Modular Architecture
**Project Goal:** Build a simple but complete backend for a university e-commerce system with 12 modules, authentication, dashboard, file uploads, and email features.

---

# 📦 Tech Stack

| Layer            | Technology |
| ---------------- | ---------- |
| Runtime          | Node.js    |
| Framework        | Express.js |
| Database         | MongoDB    |
| ORM              | Prisma     |
| Language         | JavaScript |
| Authentication   | JWT        |
| Password Hashing | bcrypt     |
| Validation       | Zod        |
| File Uploads     | Multer     |
| Email            | Nodemailer |
| Dev Tool         | Nodemon    |

---

# 📁 Backend Project Structure (Modular Architecture)

```
backend
│
├── prisma
│   └── schema.prisma
│
├── src
│   ├── config
│   │   ├── prisma.js
│   │   ├── multer.js
│   │   └── mailer.js
│   │
│   ├── middleware
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   ├── error.middleware.js
│   │   └── validate.middleware.js
│   │
│   ├── modules
│   │
│   │   ├── auth
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.routes.js
│   │   │   └── auth.validation.js
│   │
│   │   ├── users
│   │   ├── roles
│   │   ├── staff
│   │   ├── categories
│   │   ├── products
│   │   ├── orders
│   │   ├── payments
│   │   ├── reviews
│   │   ├── returns
│   │   ├── coupons
│   │   ├── loyalty
│   │   ├── cart
│   │   ├── suppliers
│   │   └── dashboard
│
│   ├── routes
│   │   └── index.js
│   │
│   ├── utils
│   │   ├── response.js
│   │   └── softDelete.js
│   │
│   └── app.js
│
├── uploads
├── .env
├── server.js
└── package.json
```

---

# ⚙️ Step 1 — Initialize Project

```bash
mkdir ecommerce-backend
cd ecommerce-backend
npm init -y
```

---

# 📦 Step 2 — Install Dependencies

### Core packages

```bash
npm install express cors dotenv bcrypt jsonwebtoken multer nodemailer zod
```

### Prisma + MongoDB

```bash
npm install prisma @prisma/client
```

### Dev dependency

```bash
npm install nodemon --save-dev
```

---

# 📄 Step 3 — Package.json Scripts

```json
"scripts": {
 "dev": "nodemon server.js",
 "start": "node server.js",
 "prisma": "prisma generate",
 "db:push": "prisma db push",
 "studio": "prisma studio"
}
```

---

# ⚙️ Step 4 — Prisma Setup

Initialize Prisma

```bash
npx prisma init
```

Update `.env`

```
DATABASE_URL="mongodb+srv://USER:PASSWORD@cluster.mongodb.net/ecommerce"
```

---

# 🗄 Prisma Schema

`prisma/schema.prisma`

```prisma
generator client {
 provider = "prisma-client-js"
}

datasource db {
 provider = "mongodb"
 url      = env("DATABASE_URL")
}

model Role {
 id        String @id @default(auto()) @map("_id")
 name      String
 users     User[]
 isDeleted Boolean @default(false)
}

model User {
 id        String   @id @default(auto()) @map("_id")
 name      String
 email     String   @unique
 password  String
 roleId    String?
 role      Role?    @relation(fields: [roleId], references: [id])
 isDeleted Boolean  @default(false)
 createdAt DateTime @default(now())
}

model Category {
 id        String @id @default(auto()) @map("_id")
 name      String
 isDeleted Boolean @default(false)
 products  Product[]
}

model Supplier {
 id        String @id @default(auto()) @map("_id")
 name      String
 email     String
 phone     String
 products  Product[]
}

model Product {
 id          String @id @default(auto()) @map("_id")
 name        String
 description String
 price       Float
 stock       Int
 imageUrl    String?
 categoryId  String
 supplierId  String?

 category    Category @relation(fields: [categoryId], references: [id])
 supplier    Supplier? @relation(fields: [supplierId], references: [id])

 reviews     Review[]
 orderItems  OrderItem[]

 isDeleted   Boolean @default(false)
 createdAt   DateTime @default(now())
}

model Cart {
 id       String @id @default(auto()) @map("_id")
 userId   String
 user     User   @relation(fields: [userId], references: [id])
 items    CartItem[]
}

model CartItem {
 id        String @id @default(auto()) @map("_id")
 cartId    String
 productId String
 quantity  Int

 cart      Cart    @relation(fields: [cartId], references: [id])
 product   Product @relation(fields: [productId], references: [id])
}

model Order {
 id        String @id @default(auto()) @map("_id")
 userId    String
 user      User   @relation(fields: [userId], references: [id])

 status    String
 total     Float
 createdAt DateTime @default(now())

 items     OrderItem[]
 payment   Payment?

 isDeleted Boolean @default(false)
}

model OrderItem {
 id        String @id @default(auto()) @map("_id")
 orderId   String
 productId String
 quantity  Int
 price     Float

 order     Order   @relation(fields: [orderId], references: [id])
 product   Product @relation(fields: [productId], references: [id])
}

model Payment {
 id        String @id @default(auto()) @map("_id")
 orderId   String @unique
 amount    Float
 status    String
 createdAt DateTime @default(now())

 order     Order @relation(fields: [orderId], references: [id])
}

model Review {
 id        String @id @default(auto()) @map("_id")
 userId    String
 productId String
 rating    Int
 comment   String
 imageUrl  String?

 user      User @relation(fields: [userId], references: [id])
 product   Product @relation(fields: [productId], references: [id])

 isDeleted Boolean @default(false)
}

model Return {
 id        String @id @default(auto()) @map("_id")
 orderId   String
 reason    String
 status    String

 order     Order @relation(fields: [orderId], references: [id])
}

model Coupon {
 id           String @id @default(auto()) @map("_id")
 code         String @unique
 discount     Float
 minCartValue Float
 firstOrder   Boolean @default(false)
 isDeleted    Boolean @default(false)
}

model LoyaltyTransaction {
 id        String @id @default(auto()) @map("_id")
 userId    String
 points    Int
 type      String
 createdAt DateTime @default(now())

 user      User @relation(fields: [userId], references: [id])
}
```

Push schema

```bash
npx prisma db push
```

Generate client

```bash
npx prisma generate
```

---

# 📂 File Upload (Multer)

`src/config/multer.js`

```js
const multer = require("multer")

const storage = multer.diskStorage({
 destination: "uploads/",
 filename: (req, file, cb) => {
  cb(null, Date.now() + "-" + file.originalname)
 }
})

module.exports = multer({ storage })
```

Used for:

* Product images
* Review images
* Return images

---

# 🔐 Authentication System

Features:

```
Register
Login
JWT authentication
Forgot password email
Reset password
Role based access
```

---

# 🧹 Soft Delete vs Hard Delete

### Soft Delete

Used for important records.

```
Users
Products
Orders
Reviews
Coupons
```

Implementation:

```
isDeleted = true
```

---

### Hard Delete

Used for temporary records.

```
Cart items
Loyalty transactions
```

Example:

```
prisma.cartItem.delete()
```

---

# 📧 Email Service

Use **Nodemailer**

Emails sent for:

```
Password reset
Order confirmation
Low stock alert
```

---

# 📊 Dashboard Queries

Dashboard is **read-only**

Shows:

```
Total Users
Total Orders
Total Revenue
Low Stock Products
Monthly Sales
```

---

# 🚀 Development Workflow

```
1 Initialize project
2 Install dependencies
3 Setup Prisma
4 Design database schema
5 Setup Express server
6 Implement authentication
7 Implement categories + products
8 Implement cart
9 Implement orders + payments
10 Implement reviews + returns
11 Implement coupons + loyalty
12 Implement suppliers
13 Implement dashboard
14 Add multer uploads
15 Add email service
16 Add role middleware
17 Testing APIs
```

---

# ▶ Run Development Server

```bash
npm run dev
```

Server runs at:

```
http://localhost:5000
```

---

# 🎯 Backend Capabilities

✔ Modular architecture
✔ Prisma ORM + MongoDB
✔ JWT authentication
✔ Multer file uploads
✔ Nodemailer email service
✔ Soft delete + hard delete
✔ Role based access
✔ REST API for React frontend
✔ Complete CRUD for all modules

---

# 📌 API Base URL

```
http://localhost:5000/api/v1
```

Ready to connect with **React frontend**.
