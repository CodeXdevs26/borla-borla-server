# Borla Backend - Signup Flow Documentation

## Signup Flow Overview

The signup flow consists of two main steps:

1. **User Registration** - User submits signup form and receives OTP via email
2. **OTP Verification** - User verifies their email with the OTP to complete registration

---

## API Endpoints

### 1. Sign Up (Registration)

**Endpoint:** `POST /api/v1/auth/signup`

**Description:** Creates a new user account (unverified) and sends OTP to their email.

**Request Body:**

```json
{
  "name": "Cleopas Owusu",
  "email": "cleopasowusu@gmail.com",
  "phoneNumber": "+233123456789",
  "location": "Accra, Ghana",
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}
```

**Success Response (201 Created):**

```json
{
  "statusCode": 201,
  "success": true,
  "message": "Signup successful! Please check your email for OTP verification.",
  "data": {
    "email": "cleopasowusu@gmail.com",
    "name": "Cleopas Owusu",
    "verificationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "OTP sent to your email. Please verify to complete signup."
  }
}
```

**Error Responses:**

- `400 Bad Request` - Passwords don't match
- `409 Conflict` - User already exists and is verified

**Important Notes:**

- User is NOT added to the system until OTP is verified
- OTP is 4 digits and expires in 3 minutes
- If user exists but isn't verified, their data is updated and new OTP is sent
- Verification token is valid for 15 minutes
- Phone number must be unique (used for login)

---

### 2. Verify OTP

**Endpoint:** `POST /api/v1/otp/verify-otp`

**Description:** Verifies the OTP and activates the user account.

**Headers:**

```
token: <verificationToken from signup response>
```

**Request Body:**

```json
{
  "otp": "123456"
}
```

**Success Response (200 OK):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Cleopas Owusu",
      "email": "cleopasowusu@gmail.com",
      "phoneNumber": "+233123456789",
      "location": "Accra, Ghana",
      "role": "user",
      "status": "active",
      "isDeleted": false,
      "createdAt": "2026-01-11T10:30:00.000Z",
      "updatedAt": "2026-01-11T10:35:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid OTP
- `401 Unauthorized` - Token missing
- `403 Forbidden` - OTP expired or token expired
- `404 Not Found` - User not found

**Important Notes:**

- Upon successful verification:
  - User's `verification.status` is set to `true`
  - User can now login
  - A 30-day access token is returned
  - OTP is reset to 0 and expiration is cleared

---

### 3. Resend OTP

**Endpoint:** `POST /api/v1/otp/resend-otp`

**Description:** Resends OTP if the previous one expired or was lost.

**Request Body:**

```json
{
  "email": "cleopasowusu@gmail.com"
}
```

**Success Response (200 OK):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

- `400 Bad Request` - User not registered
- `403 Forbidden` - User is blocked or deleted

**Important Notes:**

- New OTP expires in 3 minutes (shorter than initial signup OTP)
- New verification token valid for 3 minutes
- Can only be used for users who haven't verified yet

---

### 4. Login (After Verification)

**Endpoint:** `POST /api/v1/auth/login`

**Description:** Login with phone number and password after account is verified.

**Request Body:**

```json
{
  "phoneNumber": "+233123456789",
  "password": "securePassword123"
}
```

**Success Response (200 OK):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Cleopas Owusu",
      "email": "cleopasowusu@gmail.com",
      "role": "user",
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid credentials
- `403 Forbidden` - Account not verified, blocked, or deleted
- `404 Not Found` - User not found

---

### 5. Google OAuth Registration/Login

**Endpoint:** `POST /api/v1/auth/google`

**Description:** Register or login using Google OAuth. No OTP verification required.

**Request Body:**

```json
{
  "email": "user@gmail.com",
  "name": "John Doe",
  "socialId": "google-id-12345",
  "provider": "google",
  "phoneNumber": "+233123456789",
  "profile": "https://profile-url.com/image.jpg"
}
```

**Success Response (200 OK):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Important Notes:**

- OAuth users are auto-verified (no OTP needed)
- Creates new user if doesn't exist
- Logs in existing user
- Password is null for OAuth users

---

### 6. Apple OAuth Registration/Login

**Endpoint:** `POST /api/v1/auth/apple`

**Description:** Register or login using Apple OAuth. No OTP verification required.

**Request Body:**

```json
{
  "email": "user@icloud.com",
  "name": "Jane Doe",
  "socialId": "apple-id-67890",
  "provider": "apple",
  "phoneNumber": "+233123456789",
  "profile": "https://profile-url.com/image.jpg"
}
```

**Success Response (200 OK):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Apple authentication successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Important Notes:**

- OAuth users are auto-verified (no OTP needed)
- Creates new user if doesn't exist
- Logs in existing user
- Password is null for OAuth users

---

### 7. Forgot Password

**Endpoint:** `POST /api/v1/auth/forgot-password`

**Description:** Request password reset OTP via email.

**Request Body:**

```json
{
  "email": "cleopasowusu@gmail.com"
}
```

**Success Response (200 OK):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "An OTP sent to your email!",
  "data": {
    "email": "cleopasowusu@gmail.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Important Notes:**

- Sends 4-digit OTP to email
- OTP expires in 3 minutes
- Token expires in 3 minutes
- Must verify OTP before resetting password

---

### 8. Reset Password

**Endpoint:** `POST /api/v1/auth/reset-password`

**Description:** Reset password after verifying OTP.

**Headers:**

```
token: <token from forgot-password response>
```

**Request Body:**

```json
{
  "newPassword": "newSecurePassword123",
  "confirmPassword": "newSecurePassword123"
}
```

**Success Response (200 OK):**

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Password reset successfully",
  "data": { ... }
}
```

**Error Responses:**

- `403 Forbidden` - OTP is not verified yet
- `401 Unauthorized` - Session has expired

**Important Notes:**

- Must verify OTP at `/api/v1/otp/verify-otp` first
- Token must be valid
- User remains verified after password reset

---

## Complete Signup Flow Sequence

```
1. User fills signup form on mobile app
   ↓
2. POST /api/v1/auth/signup
   - Backend creates unverified user
   - Generates 6-digit OTP
   - Sends OTP to user's email
   - Returns verificationToken
   ↓
3. User receives email with OTP
   ↓
4. User enters OTP in app
   ↓
5. POST /api/v1/otp/verify-otp (with verificationToken in header)
   - Backend validates OTP
   - Activates user account (verification.status = true)
   - Returns access token
   ↓
6. User is now registered and logged in
   ↓
7. User can now access protected routes
```

---

## Security Features

1. **Password Hashing:** bcrypt with configurable salt rounds
2. **JWT Tokens:** Separate tokens for verification (15min) and access (30 days)
3. **OTP Expiration:** 3 minutes for all OTP operations
4. **OTP Length:** 4 digits for easier mobile input
5. **Account Status Check:** Blocks deleted/blocked users
6. **Device Tracking:** Records IP, browser, OS on login
7. **Email Verification Required:** Users cannot login without verification (except OAuth)
8. **Unique Phone Number:** Phone numbers must be unique (used for login)
9. **OAuth Support:** Google and Apple sign-in with auto-verification
10. **Password Reset Protection:** Must verify OTP before resetting password

---

## Database Schema

### User Model

```prisma
model User {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  email       String   @unique
  password    String?
  status      status   @default(active)
  role        Role     @default(user)
  profile     String?
  phoneNumber String?  @unique
  location    Json?
  isDeleted   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  verification Verification?
}

model Verification {
  userId    String   @map("_id") @db.ObjectId
  otp       Int
  expiredAt DateTime?
  status    Boolean  @default(false)

  user User @relation(fields: [userId], references: [id])
  @@id([userId])
}
```

---

## Email Templates

OTP emails are sent using HTML templates:

**Signup OTP:** `public/view/signup_otp_mail.html`
**Forgot Password OTP:** `public/view/forgot_pass_mail.html`

Template variables:

- `{{otp}}` - The 4-digit OTP code
- `{{email}}` - User's email address
- `{{name}}` - User's name (signup only)

---

## Testing the Flow

### Using cURL:

**1. Signup:**

```bash
curl -X POST http://localhost:5000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cleopas Owusu",
    "email": "cleopasowusu@gmail.com",
    "phoneNumber": "+233123456789",
    "location": "Accra, Ghana",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

**2. Verify OTP:**

```bash
curl -X POST http://localhost:5000/api/v1/otp/verify-otp \
  -H "Content-Type: application/json" \
  -H "token: YOUR_VERIFICATION_TOKEN" \
  -d '{
    "otp": "123456"
  }'
```

**3. Login:**

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+233123456789",
    "password": "password123"
  }'
```

**4. Google OAuth:**

```bash
curl -X POST http://localhost:5000/api/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@gmail.com",
    "name": "John Doe",
    "socialId": "google-id-12345",
    "provider": "google",
    "phoneNumber": "+233123456789"
  }'
```

**5. Forgot Password:**

```bash
curl -X POST http://localhost:5000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cleopasowusu@gmail.com"
  }'
```

---

## Environment Variables Required

```env
DATABASE_URL=mongodb://localhost:27017/borla_db
JWT_ACCESS_SECRET=your-secret-key
BCRYPT_SALT_ROUNDS=12
NODEMAILER_HOST_EMAIL=your-email@gmail.com
NODEMAILER_HOST_PASS=your-app-password
```

---

## Common Issues & Solutions

1. **OTP not received:**
   - Check email credentials in .env
   - Verify SMTP settings
   - Check spam folder
   - Use resend OTP endpoint

2. **"User already exists" error:**
   - User is already verified
   - Use login endpoint instead
   - Or use OAuth (Google/Apple)

3. **"OTP expired" error:**
   - Request new OTP via resend endpoint
   - OTP valid for only 3 minutes

4. **"Session expired" error:**
   - Verification token expired (15 min for signup, 3 min for forgot password)
   - Start signup/forgot password process again

5. **"User account is not verified" on login:**
   - Complete OTP verification first
   - Check email for OTP

6. **"Phone number already exists" error:**
   - Phone number must be unique
   - Use different phone number or login instead

7. **"OTP is not verified yet" on password reset:**
   - Must verify OTP at `/api/v1/otp/verify-otp` before resetting password
   - Token in header must match forgot password token

---

## Next Steps

After successful signup and verification, users can:

- Update their profile
- Upload profile picture
- Access protected routes
- Use the app features

For profile updates, see the User module documentation.
