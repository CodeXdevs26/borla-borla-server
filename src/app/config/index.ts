import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join((process.cwd(), '.env')) });

const aws = {
  accessKeyId: process.env.S3_BUCKET_ACCESS_KEY,
  secretAccessKey: process.env.S3_BUCKET_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_BUCKET_NAME,
};

const stripe = {
  stripe_api_key: process.env.STRIPE_API_KEY,
  stripe_api_secret: process.env.STRIPE_API_SECRET,
};

const admin_credentials = {
  email: process.env.ADMIN_MAIL,
  password: process.env.ADMIN_PASSWORD,
};

export default {
  NODE_ENV: process.env.NODE_ENV,
  port: process.env.PORT,
  ip: process.env.IP,
  database_url: process.env.DATABASE_URL,
  server_url: process.env.SERVER_URL,
  client_Url: process.env.CLIENT_URL,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
  nodemailer_host_email: process.env.NODEMAILER_HOST_EMAIL,
  nodemailer_host_pass: process.env.NODEMAILER_HOST_PASS,
  socket_port: process.env.SOCKET_PORT,
  stripe_secret: process.env.STRIPE_API_SECRET,
  stripe_key: process.env.STRIPE_API_KEY,
  TERMII_API_KEY: process.env.TERMII_API_KEY,
  TERMII_SENDER_ID: process.env.TERMII_SENDER_ID,
  TERMII_CHANNEL: process.env.TERMII_CHANNEL,
  HUBTEL_POS_ID: process.env.HUBTEL_POS_ID,
  HUBTEL_PREPAID_ID: process.env.HUBTEL_PREPAID_ID,
  HUBTEL_CLIENT_ID: process.env.HUBTEL_CLIENT_ID,
  HUBTEL_CLIENT_SECRET: process.env.HUBTEL_CLIENT_SECRET,
  HUBTEL_SENDER_ID: process.env.HUBTEL_SENDER_ID,
  HUBTEL_API_ID: process.env.HUBTEL_API_ID,
  HUBTEL_API_KEY: process.env.HUBTEL_API_KEY,
  aws,
  stripe,
  admin_credentials,
};
