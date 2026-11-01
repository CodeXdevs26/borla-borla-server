import { randomInt } from 'crypto';
import prisma from '../shared/prisma';

const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_GENERATION_ATTEMPTS = 10;

const createCandidate = () => {
  let suffix = '';

  for (let index = 0; index < 8; index += 1) {
    suffix += REFERRAL_ALPHABET[randomInt(REFERRAL_ALPHABET.length)];
  }

  return `BRL${suffix}`;
};

export const generateUniqueReferralCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const referralCode = createCandidate();
    const existingCode = await prisma.referralProfile.findUnique({
      where: { code: referralCode },
      select: { id: true },
    });

    if (!existingCode) return referralCode;
  }

  throw new Error('Unable to generate a unique referral code');
};
