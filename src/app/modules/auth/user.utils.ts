import bcrypt from 'bcrypt';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

export const isPasswordMatched = async (
  plainTextPassword: string,
  hashedPassword: string | null,
) => {
  if (!hashedPassword) return false;
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

export const createToken = (
  jwtPayload: string | object | Buffer,
  secret: string,
  expiresIn: string | number,
): string => {
  return jwt.sign(jwtPayload, secret, { expiresIn } as SignOptions);
};

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret) as JwtPayload;
};
