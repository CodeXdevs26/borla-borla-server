import prisma from 'app/shared/prisma';
import AppError from 'app/error/AppError';
import httpStatus from 'http-status';
import axios from 'axios';
import config from 'app/config';

const initiateRiderTopUp = async (userId: string, amount: number) => {
  console.log('Initiating top-up with userId:', userId, 'amount:', amount);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, 'User not found');

  const auth = Buffer.from(
    `${config.HUBTEL_API_ID}:${config.HUBTEL_API_KEY}`,
  ).toString('base64');

  // BK-TOP (6) + userId suffix (8) + timestamp (13) = 27 chars (Safe < 36)
  const clientReference = `BK-TOP-${userId.slice(-8)}-${Date.now()}`;

  const payload = {
    totalAmount: amount,
    description: `Borla Wallet Top-up: ${user.name}`,
    callbackUrl: `${config.server_url}/api/v1/wallets/receive-callback`,
    returnUrl: `${config.server_url}/wallet/success`,
    cancellationUrl: `${config.server_url}/wallet/failed`,
    merchantAccountNumber: config.HUBTEL_POS_ID,
    clientReference: clientReference,
  };

  try {
    const response = await axios.post(
      'https://payproxyapi.hubtel.com/items/initiate',
      payload,
      { headers: { Authorization: `Basic ${auth}` } },
    );
    console.log('response:', response);
    console.log('response.data:', response.data);
    // Track the top-up intent in the transactions table
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: Number(amount),
        type: 'TOPUP',
        status: 'pending',
        clientReference,
        reference: clientReference,
      },
    });
    console.log('Top-up transaction created in DB:', transaction);
    // Return the hosted checkout URL to the frontend
    return response.data.data.checkoutUrl;
  } catch (error: any) {
    console.error('Hubtel Top-up Error:', error);
    console.error('error.response?.data:', error.response?.data);
    console.error('error.message:', error.message);
    if (error.response) {
      console.error(
        'Hubtel Top-up Error:',
        JSON.stringify(error.response.data, null, 2),
      );
      throw new AppError(
        error.response.status,
        'Hubtel failed to initiate top-up',
      );
    }
    throw error;
  }
};

/*
    get or create wallet for user
*/
const getWallet = async (userId: string) => {
  let wallet = await prisma.wallet.findUnique({
    where: { userId },
    // select: { balance: true },
  });
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        balance: 0.0,
      },
    });
  }
  console.log(wallet);
  return wallet;
};

const requestRiderWithdrawal = async (
  userId: string,
  amount: number,
  channel: string,
) => {
  console.log(
    'Requesting withdrawal with userId:',
    userId,
    'amount:',
    amount,
    'channel:',
    channel,
  );
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true },
  });
  if (!user || user.role !== 'rider')
    throw new AppError(httpStatus.FORBIDDEN, 'Only riders can withdraw');
  if (!user.wallet) {
    throw new AppError(httpStatus.NOT_FOUND, 'Wallet not found for this rider');
  }
  // Commission Check: UI requires $20 (approx GH₵ 300) minimum float
  const minFloat = 300;
  const currentBalance = Number(user.wallet.balance);
  if (currentBalance - amount < minFloat) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You must maintain a minimum float of GH₵ ${minFloat}`,
    );
  }

  const clientReference = `WDL-${Date.now()}`;
  const reference = `WDL-INIT-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  const auth = Buffer.from(
    `${config.HUBTEL_API_ID}:${config.HUBTEL_API_KEY}`,
  ).toString('base64');

  const payload = {
    RecipientName: user.name,
    RecipientMsisdn: user.phoneNumber,
    Channel: channel,
    Amount: amount,
    PrimaryCallbackURL: `${config.server_url}/api/v1/wallets/send-callback`,
    Description: `Rider Withdrawal: ${user.name}`,
    ClientReference: clientReference,
  };

  const url = `https://smp.hubtel.com/api/merchants/${config.HUBTEL_PREPAID_ID}/send/mobilemoney`; //
  const response = await axios.post(url, payload, {
    headers: { Authorization: `Basic ${auth}` },
  });
  // const url = `https://webhook.site/a1779570-ea58-4b91-8d08-8b922f0f75ab`; //
  // const response = await axios.post(url, payload, {
  //   headers: { Authorization: `Basic ${auth}` },
  // });

  console.log('Withdrawal response:', response);
  console.log('Withdrawal response.data:', response.data);

  // Log the pending withdrawal
  const transaction = await prisma.transaction.create({
    data: {
      userId,
      amount: Number(amount),
      type: 'WITHDRAWAL',
      clientReference,
      reference: clientReference,
      status: 'pending',
    },
  });

  console.log('Withdrawal transaction created in DB:', transaction);

  return response.data; // ResponseCode 0001 means "Accepted for Processing" [cite: 917]
};

/**
 * assignBonusToRider
 * Strictly follows Hubtel Direct Send Money API
 * URL: https://smp.hubtel.com/api/merchants/{MerchantID}/send/mobilemoney
 */
const assignBonusToRider = async (
  riderId: string,
  amount: number,
  reason: string,
) => {
  console.log(
    'Assigning bonus with riderId:',
    riderId,
    'amount:',
    amount,
    'reason:',
    reason,
  );
  const rider = await prisma.user.findUnique({
    where: { id: riderId },
    include: { wallet: true },
  });

  console.log('Rider found for bonus assignment:', rider);

  if (!rider || rider.role !== 'rider') {
    throw new AppError(httpStatus.NOT_FOUND, 'Rider not found');
  }

  const auth = Buffer.from(
    `${config.HUBTEL_API_ID}:${config.HUBTEL_API_KEY}`,
  ).toString('base64');

  // Format phone to international 233 format without '+'
  const formattedPhone = rider.phoneNumber?.replace('+', '') || '';

  console.log('Formatted phone number for Hubtel:', formattedPhone);

  // ClientReference must be unique and max 36 chars
  const clientReference = `BNS-${riderId.slice(-8)}-${Date.now()}`.slice(0, 36);

  const payload = {
    RecipientName: rider.name,
    RecipientMsisdn: formattedPhone,
    CustomerEmail: rider.email,
    Channel: 'tigo-gh', // Defaulting to Tigo-GH or make dynamic based on rider data
    Amount: Number(amount),
    PrimaryCallbackURL: `${config.server_url}/api/v1/wallets/bonus-callback`,
    Description: `Bonus: ${reason}`,
    ClientReference: clientReference,
  };

  // Endpoint uses the MerchantID (Prepaid ID)
  const url = `https://smp.hubtel.com/api/merchants/${config.HUBTEL_PREPAID_ID}/send/mobilemoney`;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
    });

    console.log('Bonus assignment response:', response);
    console.log('Bonus assignment response.data:', response.data);
    console.log('Number(amount)', Number(amount));
    console.log('Number(amount)', typeof Number(amount));
    // Track the bonus in your database
    const transaction = await prisma.transaction.create({
      data: {
        userId: riderId,
        amount: Number(amount),
        type: 'BONUS',
        status: 'pending',
        clientReference,
        reference: clientReference,
        description: reason,
      },
    });

    console.log('Bonus transaction created in DB:', transaction);

    return response.data;
  } catch (error: any) {
    console.error('Hubtel Bonus Assignment Error:', error);
    console.error('error.response?.data:', error.response?.data);
    console.error('error.message:', error.message);
    if (error.response) {
      // Check for 4075: Insufficient prepaid balance
      const errorMessage =
        error.response.data.message || 'Bonus initiation failed';
      console.error(
        'Hubtel Bonus Error:',
        JSON.stringify(error.response.data, null, 2),
      );
      throw new AppError(
        error.response.status,
        `Bonus Failed: ${errorMessage}`,
      );
    }
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Hubtel SMP Service Unreachable',
    );
  }
};

/**
 * syncWithdrawalOrBonusStatus
 * Checks status for outbound transactions (Withdrawals/Bonuses)
 * URL: https://smrsc.hubtel.com/api/merchants/{PrepaidID}/transactions/status
 */
const syncWithdrawalOrBonusStatus = async (clientReference: string) => {
  const auth = Buffer.from(
    `${config.HUBTEL_API_ID}:${config.HUBTEL_API_KEY}`,
  ).toString('base64');

  const prepaidId = config.HUBTEL_PREPAID_ID;
  const url = `https://smrsc.hubtel.com/api/merchants/${prepaidId}/transactions/status?clientReference=${clientReference}`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${auth}` },
    });

    console.log('Status check response:', response);
    console.log('Status check response.data:', response.data);

    const hubtelData = response.data.data;

    // "success" is the transactionStatus for completed outbound transfers [cite: 926]
    if (hubtelData?.transactionStatus === 'success') {
      const transaction = await prisma.transaction.findUnique({
        where: { reference: clientReference },
      });

      console.log('Transaction found for status sync:', transaction);

      if (transaction && transaction.status === 'pending') {
        const updatedTransaction = await prisma.transaction.update({
          where: { reference: clientReference },
          data: {
            status: 'success',
            hubtelId: hubtelData.TransactionId,
          },
        });
        console.log('Transaction updated for status sync:', updatedTransaction);
        return { success: true, status: 'success', data: hubtelData };
      }
    }

    // If it failed at the network level, we need to handle the refund
    if (hubtelData?.transactionStatus === 'failed') {
      // Logic to refund rider's virtual wallet if it was a withdrawal
      const transaction = await prisma.transaction.findUnique({
        where: { reference: clientReference },
      });

      // Only refund if the current status is still 'pending' to avoid duplicate credits
      if (transaction && transaction.status === 'pending') {
        const [updatedTransaction, updatedWallet] = await prisma.$transaction([
          // 1. Mark the transaction as failed
          prisma.transaction.update({
            where: { reference: clientReference },
            data: { status: 'failed' },
          }),
          // 2. Credit the amount back to the rider's wallet if it was a withdrawal
          prisma.wallet.update({
            where: { userId: transaction.userId },
            data: { balance: { increment: transaction.amount } },
          }),
        ]);

        console.log(`--- Withdrawal Sync Failure (Refunded) ---`);
        console.log(`Transaction ID: ${updatedTransaction.id} set to failed.`);
        console.log(
          `Rider ${transaction.userId} wallet incremented by ${transaction.amount}.`,
        );
        console.log(`New Balance: ${updatedWallet.balance}`);

        return {
          success: false,
          status: 'failed',
          message: 'Transaction failed and rider refunded.',
        };
      }
    }

    return {
      success: false,
      status: hubtelData?.transactionStatus || 'pending',
      data: hubtelData,
    };
  } catch (error: any) {
    console.error('Withdrawal Status Check Error:', error);

    // Structured Error Parsing
    const hubtelError = error.response?.data;
    const errorMessage = hubtelError?.Data || error.message;
    const responseCode = hubtelError?.ResponseCode || 'UNKNOWN_CODE';

    // Readable Console Log
    console.error(`\n--- HUBTEL STATUS CHECK FAILED ---`);
    console.error(`ClientRef: ${clientReference}`);
    console.error(`ResponseCode: ${responseCode}`);
    console.error(`Message: ${errorMessage}`);
    console.error(`URL: ${url}`);
    console.error(`----------------------------------\n`);

    return {
      success: false,
      status: 'error',
      message: errorMessage,
      code: responseCode,
    };
  }
};

export const walletServices = {
  initiateRiderTopUp,
  requestRiderWithdrawal,
  getWallet,
  assignBonusToRider,
  syncWithdrawalOrBonusStatus,
};
