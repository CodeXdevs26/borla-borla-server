# Signup and login with email or phone

Signup and login require at least one of email or phoneNumber. Both are allowed; password remains required. Blank contact strings are treated as omitted. Email is trimmed and lowercased; phone is trimmed. Use the same phone format on signup and login, preferably an international number.

## Signup

POST `/api/v1/auth/signup`, Content-Type application/json:

```json
{
  "name": "Test User",
  "email": "user@example.com",
  "password": "secret123",
  "confirmPassword": "secret123"
}
```

Or phone only:

```json
{
  "name": "Test User",
  "phoneNumber": "+233201234567",
  "password": "secret123",
  "confirmPassword": "secret123"
}
```

Use multipart/form-data for rider signup with documents as before. Rider capacity/document requirements still apply; riders may also supply either contact method.

OTP email is sent only when an email was supplied; SMS is attempted only when a phone was supplied. If both were supplied, both channels are used. The response retains otp and verificationToken and includes email/phoneNumber. An absent contact may appear as null or be omitted. Signup completion still requires the existing OTP verification endpoint; it identifies the account using verificationToken, so it does not require an email.

Duplicate supplied contacts remain unique. Supplying contacts that match two different existing accounts returns 409. Existing blocked/deleted accounts cannot be re-registered through this flow.

## Login

POST `/api/v1/auth/login`:

```json
{ "email": "user@example.com", "password": "secret123" }
```

Or:

```json
{ "phoneNumber": "+233201234567", "password": "secret123" }
```

When both identifiers are supplied, both must belong to the same account. Empty/missing identifiers return 400. Password and account verification checks remain in place; this is not passwordless login.

## Resend verification OTP

The existing OTP resend API now accepts either email or phoneNumber in its body. It looks up the supplied contact(s) and uses the corresponding delivery channel. Existing OTP verification still uses the signed token and user ID.

Forgot-password remains the existing email-based endpoint; this change concerns signup, login and signup-verification resend.

## Apply the database changes

MongoDB ordinary unique indexes treat absent/null contacts as indexed values. To support multiple email-only or phone-only accounts, email and phoneNumber no longer have Prisma @unique annotations. Their supplied string values are protected by MongoDB partial unique indexes created by scripts/ensure-contact-indexes.cjs.

Stop the backend while applying these changes, then run:

```sh
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

The prisma:migrate script now runs prisma db push followed by the contact index setup script. Do not start the backend unless both steps succeed. When applying the schema with another deployment command, also run:

```sh
npm run prisma:contact-indexes
```

Run the index setup after every schema push. The script creates partial unique indexes before removing any remaining ordinary single-field unique contact indexes. It does not delete user records. Existing duplicate non-null string contacts must be resolved if MongoDB refuses index creation. No live database changes were performed during implementation.

## Verify

```sh
node --test tests/auth-contacts.test.cjs
node node_modules/typescript/bin/tsc --noEmit
```

On a development database, create at least two distinct phone-only users and two email-only users, verify their OTPs, and log in with the corresponding identifier/password. Confirm duplicate email/phone registrations fail and missing-both payloads fail. Confirm resend works for the phone-only account. This manual check verifies the actual MongoDB indexes and provider delivery; automated tests mock those integrations.
