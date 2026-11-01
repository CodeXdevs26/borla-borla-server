import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const HashPassword = async (plainPassword: string): Promise<string> =>
  await bcrypt.hash(plainPassword, SALT_ROUNDS);

export default HashPassword;
