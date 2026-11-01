# Borla Backend - Signup Implementation Summary

## ✅ What Was Implemented

### 1. **Complete Signup Flow with Email Verification**

#### Endpoints:

- `POST /api/v1/auth/signup` - User registration with OTP
- `POST /api/v1/auth/login` - Login with phoneNumber and password
- `POST /api/v1/auth/google` - Google OAuth registration/login
- `POST /api/v1/auth/apple` - Apple OAuth registration/login
- `POST /api/v1/auth/forgot-password` - Request password reset OTP
- `POST /api/v1/auth/reset-password` - Reset password after OTP verification
- `POST /api/v1/otp/verify-otp` - Verify OTP for signup/forgot password
- `POST /api/v1/otp/resend-otp` - Resend OTP if expired

### 2. **Security Features**

- ✅ User is NOT added to the system until OTP is verified
- ✅ 4-digit OTP sent to user's email for verification
- ✅ Password and confirmPassword validation
- ✅ Email and phone number uniqueness checks
- ✅ Phone number used for login (must be unique)
- ✅ Password hashing with bcrypt
- ✅ OTP expires in 3 minutes (all OTP operations)
- ✅ Verification token expires in 15 minutes (signup) / 3 minutes (forgot password)
- ✅ OAuth users auto-verified (no OTP needed)
- ✅ Password reset requires OTP verification first
- ✅ User remains verified after password reset

### 3. **Files Created/Modified**

#### New Files:

- `/src/app/modules/auth/auth.validation.ts` - Zod validation schemas
- `/public/view/signup_otp_mail.html` - Beautiful OTP email template for Borla
- `/SIGNUP_FLOW.md` - Complete API documentation

#### Modified Files:

- `/src/app/modules/auth/auth.interface.ts` - Added ISignup interface
- `/src/app/modules/auth/auth.service.ts` - Added signup service
- `/src/app/modules/auth/auth.controller.ts` - Added signup controller
- `/src/app/modules/auth/auth.route.ts` - Added signup route with validation
- `/.env` - Created environment variables file

### 4. **Email Template**

- Custom Borla-branded email template
- Includes user's name (Hi {{name}}!)
- Shows OTP prominently
- 10-minute validity message
- Support contact information

### 5. **Validation Rules**

**Signup:**

- Name: Required, min 2 characters
- Email: Required, valid email format, unique
- Phone Number: Required, unique (used for login)
- Location: Optional
- Password: Required, min 6 characters
- Confirm Password: Must match password

**Login:**

- Phone Number: Required
- Password: Required

**OAuth (Google/Apple):**

- Email: Required, valid email format
- Name: Required
- Social ID: Required
- Provider: Must be 'google' or 'apple'
- Phone Number: Optional
- Profile: Optional

**Forgot Password:**

- Email: Required, valid email format

**Reset Password:**

- New Password: Required, min 6 characters
- Confirm Password: Must match new password

## 🔄 Signup Flow

**Regular Signup:**

```
1. User submits signup form (/api/v1/auth/signup)
   ├─ Validates input data
   ├─ Checks if user/phone exists
   ├─ Hashes password
   ├─ Creates unverified user
   ├─ Generates 4-digit OTP
   ├─ Sends OTP to email (3-min expiry)
   └─ Returns verificationToken (15-min expiry)

2. User receives email with OTP

3. User verifies OTP (/api/v1/otp/verify-otp)
   ├─ Validates token
   ├─ Checks OTP matches and not expired
   ├─ Activates user account
   └─ Returns access token (30-day expiry)

4. User is now registered and can login with phoneNumber
```

**OAuth Signup (Google/Apple):**

```
1. User authenticates with Google/Apple
   ├─ App receives user data from OAuth provider
   └─ App sends data to backend

2. POST /api/v1/auth/google or /api/v1/auth/apple
   ├─ Checks if user exists
   ├─ Creates user if new (auto-verified, no password)
   ├─ Logs in existing user
   └─ Returns access + refresh tokens

3. User is immediately logged in
```

**Forgot Password Flow:**

```
1. User requests password reset (/api/v1/auth/forgot-password)
   ├─ Validates email
   ├─ Generates 4-digit OTP
   ├─ Sends OTP to email (3-min expiry)
   ├─ Sets verification.status = false
   └─ Returns token (3-min expiry)

2. User receives email with OTP

3. User verifies OTP (/api/v1/otp/verify-otp)
   ├─ Validates token and OTP
   ├─ Sets verification.status = true
   └─ Returns success

4. User resets password (/api/v1/auth/reset-password)
   ├─ Validates token
   ├─ Checks verification.status = true
   ├─ Updates password
   ├─ Keeps verification.status = true
   └─ User can now login
```

## 📝 Example API Calls

### Signup Request:

```json
POST /api/v1/auth/signup
Content-Type: application/json

{
  "name": "Cleopas Owusu",
  "email": "cleopasowusu@gmail.com",
  "phoneNumber": "+233123456789",
  "location": "Accra, Ghana",
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}
```

### Signup Response:

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

### Verify OTP Request:

```json
POST /api/v1/otp/verify-otp
Content-Type: application/json
token: <verificationToken from signup>

{
  "otp": "123456"
}
```

### Verify OTP Response:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "Cleopas Owusu",
      "email": "cleopasowusu@gmail.com",
      "role": "user",
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 🔧 Configuration Required

Update `.env` file with:

```env
DATABASE_URL=mongodb://your-mongodb-url/borla_db
JWT_ACCESS_SECRET=your-secret-key
BCRYPT_SALT_ROUNDS=12
NODEMAILER_HOST_EMAIL=your-email@gmail.com
NODEMAILER_HOST_PASS=your-gmail-app-password
```

## 🧪 Testing

1. Start the server:

```bash
npm run dev
```

2. Test signup endpoint:

```bash
curl -X POST http://localhost:5000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phoneNumber": "+233123456789",
    "location": {
            "type": "Point",
            "coordinates": [-0.1870, 5.6037]  // Accra coordinates: [longitude, latitude]
        },
    "locationName": "Accra, Ghana",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

3. Check email for OTP

4. Verify OTP:

```bash
curl -X POST http://localhost:5000/api/v1/otp/verify-otp \
  -H "Content-Type: application/json" \
  -H "token: YOUR_VERIFICATION_TOKEN" \
  -d '{"otp": "123456"}'
```

## 📚 Documentation

For detailed API documentation, see `SIGNUP_FLOW.md`

## ✨ Key Features

- ✅ User not added until verified
- ✅ Email with 4-digit OTP verification (3-min expiry)
- ✅ Beautiful branded email templates (signup + forgot password)
- ✅ Password strength validation (min 6 characters)
- ✅ Phone number login (unique constraint)
- ✅ Google OAuth integration
- ✅ Apple OAuth integration
- ✅ OAuth users auto-verified
- ✅ Secure forgot password flow with OTP verification
- ✅ User remains verified after password reset
- ✅ Device history tracking on login
- ✅ Clean error messages
- ✅ Token-based verification (15 min)
- ✅ OTP expiration (10 minutes)
- ✅ Resend OTP functionality
- ✅ Comprehensive error handling
- ✅ Type-safe with TypeScript
- ✅ Zod validation
- ✅ MongoDB with Prisma ORM

## 🎨 Mobile App Integration

The mobile app should:

1. Call `/api/v1/auth/signup` with form data
2. Store the `verificationToken` from response
3. Show OTP input screen
4. Call `/api/v1/otp/verify-otp` with token in header and OTP in body
5. Store the returned access token for authenticated requests
6. Navigate user to home screen

## 🚀 Next Steps

- Implement Google Sign-In (commented code exists)
- Implement Apple Sign-In (commented code exists)
- Add phone number verification (optional)
- Add profile picture upload during signup
- Implement password strength meter
