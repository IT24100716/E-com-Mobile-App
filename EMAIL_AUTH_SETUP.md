# Email-Based OTP Authentication Implementation

## Overview
Complete email-based OTP authentication system with staff member creation notification and password reset functionality.

---

## Features Implemented

### 1. Staff Member Creation with Email Notification & Transaction Rollback
- When admin creates a staff member, a random password is generated
- Email is sent with login credentials and instructions to change password
- **Transaction Rollback:** If email sending fails, the created user is deleted from database
- **Files Modified:**
  - `backend/src/modules/staff/staff.service.js` - Added email sending with rollback on failure

### 2. Forgot Password with OTP
- User requests password reset on login page
- 6-digit OTP sent to email (valid for 15 minutes)
- OTP stored in new `OTP` database table
- **Endpoints:**
  - `POST /api/v1/auth/forgot-password` - Send OTP to email
  - `POST /api/v1/auth/verify-otp` - Verify OTP validity

### 3. Reset Password with OTP Verification
- User enters OTP received in email
- After OTP verification, user sets new password
- OTP deleted after successful password reset
- **Endpoint:**
  - `POST /api/v1/auth/reset-password` - Reset password with OTP

### 4. Password Change from Profile
- Authenticated users can change password from profile page
- Follows same OTP verification flow
- User is logged out after successful reset

---

## Backend Changes

### Database Schema
**New OTP Model** (`backend/prisma/schema.prisma`):
```prisma
model OTP {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  email     String
  code      String
  purpose   String   @default("password_reset")
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([email])
}
```

### Files Modified

1. **`backend/prisma/schema.prisma`**
   - Added OTP model for storing temporary OTP codes

2. **`backend/src/modules/auth/auth.service.js`**
   - Added `generateOTP()` - Generates 6-digit random code
   - Updated `forgotPassword()` - Stores OTP in DB, sends email
   - Added `verifyOTP()` - Validates OTP and expiration
   - Updated `resetPassword()` - Now uses OTP instead of token

3. **`backend/src/modules/auth/auth.controller.js`**
   - Added `verifyOTP()` handler

4. **`backend/src/modules/auth/auth.routes.js`**
   - Added `POST /verify-otp` route

5. **`backend/src/modules/auth/auth.validation.js`**
   - Updated `resetPasswordSchema` - Now requires email and OTP
   - Added `verifyOTPSchema` - Validates email and 6-digit OTP

6. **`backend/src/modules/staff/staff.service.js`**
   - Added `generatePassword()` - Random 10-char password
   - Updated `create()` - Sends welcome email with credentials
   - **Rollback Logic:**
     - Step 1: Create user in database
     - Step 2: Try to send email
     - Step 3 (on failure): Delete user and throw error
     - Logs rollback attempts to console for debugging

---

## Frontend Changes

### Files Created

1. **`frontend/src/pages/client/components/ResetPasswordForm.jsx`**
   - 3-step password reset form:
     - Step 1: Verify email (send OTP)
     - Step 2: Enter OTP (6 digits)
     - Step 3: Enter new password
   - Automatically logs out user after successful reset

### Files Modified

1. **`frontend/src/pages/auth/LoginPage.jsx`**
   - Added "Forgot password?" button on login
   - Added 3-step forgot password modal:
     - Step 1: Enter email
     - Step 2: Enter 6-digit OTP
     - Step 3: Set new password
   - OTP input restricted to 6 characters

2. **`frontend/src/pages/client/ProfilePage.jsx`**
   - Imported and added `ResetPasswordForm` component
   - Users can change password from profile section

3. **`frontend/src/services/auth.service.js`**
   - Added `verifyOTP()` method
   - Updated `resetPassword()` to use new signature

---

## API Endpoints

### Authentication Endpoints

#### Forgot Password (Step 1)
```
POST /api/v1/auth/forgot-password
Body: { email: "user@example.com" }
Response: { message: "OTP sent to your email" }
```

#### Verify OTP (Step 2)
```
POST /api/v1/auth/verify-otp
Body: { email: "user@example.com", otp: "123456" }
Response: { message: "OTP verified successfully" }
```

#### Reset Password (Step 3)
```
POST /api/v1/auth/reset-password
Body: {
  email: "user@example.com",
  otp: "123456",
  password: "newpassword123"
}
Response: { message: "Password reset successfully" }
```

---

## Database Migration Required

Run the following command in the backend directory to apply schema changes:

```bash
cd backend
npm run db:push
```

This will:
1. Create the OTP collection in MongoDB
2. Create index on email field for faster lookups

---

## Email Configuration

Ensure your `.env` file has:
```
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:5173
```

**For Gmail:**
1. Enable 2-Factor Authentication
2. Create App Password (not regular password)
3. Use App Password in EMAIL_PASSWORD

---

## Testing Checklist

### Backend
- [ ] Login as admin
- [ ] Create new staff member
- [ ] Check staff email for login credentials
- [ ] Login with provided credentials
- [ ] Test forgot password flow
- [ ] Test OTP verification
- [ ] Test password reset

### Frontend (Login Page)
- [ ] Click "Forgot password?" button
- [ ] Enter email, receive OTP
- [ ] Verify 6-digit OTP entry restriction
- [ ] Enter new password and confirm
- [ ] Verify redirect to login after reset

### Frontend (Profile Page)
- [ ] Navigate to profile
- [ ] Click "Change Password"
- [ ] Verify email OTP flow
- [ ] Verify automatic logout after reset
- [ ] Try logging in with new password

---

## Password Requirements

- **Generated Staff Password:** 10 random characters
- **OTP Code:** 6 digits (0-9)
- **OTP Validity:** 15 minutes
- **User Password:** Minimum 6 characters

---

## Features

✅ OTP stored in database with expiration
✅ 6-digit OTP generation
✅ Email sending via Gmail SMTP
✅ 15-minute OTP validity
✅ Multi-step password reset process
✅ Staff welcome email with credentials
✅ **Transaction Rollback** - If email fails, user creation is rolled back
✅ User-friendly 3-step forms
✅ Toast notifications for all actions
✅ Proper error handling
✅ OTP cleanup after use

---

## Rollback Logic

### Staff Creation Transaction
```javascript
1. Create user in database
   ↓
2. Try to send welcome email
   ├─ Success → Return user (transaction committed)
   └─ Failure → Delete user (rollback) → Throw error
```

**Why Rollback?**
- Ensures data integrity
- No orphaned users without email notification
- Admin is aware email failed (can retry or fix config)
- Prevents confusion if user was created but doesn't receive credentials

**Error Message When Rollback Occurs:**
```
"Failed to send welcome email. Staff creation rolled back. Error: [SMTP Error Details]"
```

**Logging:**
- All rollback attempts are logged to console with error details
- Admin can debug email configuration issues
