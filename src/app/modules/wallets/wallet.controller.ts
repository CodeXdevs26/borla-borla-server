import { Request, Response } from 'express';
import prisma from 'app/shared/prisma';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { walletServices } from './wallet.service';

// 1. Initiate Top Up (Customer/Rider)
const topUp = catchAsync(async (req: Request, res: Response) => {
  console.log('Initiating top-up with req.body:', req.body);
  const { amount, phoneNumber, channel } = req.body;
  const userId = req.user.userId;
  const checkoutUrl = await walletServices.initiateRiderTopUp(
    userId,
    amount,
    // req.user.phoneNumber,
    // phoneNumber,
    // channel,
  );
  console.log('Top-up initiated, checkoutUrl:', checkoutUrl);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Top-up initiated',
    data: { checkoutUrl },
  });
});

const handleTopUpCallback = catchAsync(async (req: Request, res: Response) => {
  console.log('Received Top-up Callback:', JSON.stringify(req.body, null, 2));

  const { ResponseCode, Data, Message } = req.body;
  const clientReference = Data?.ClientReference;
  console.log('clientReference:', clientReference);
  console.log('ResponseCode:', ResponseCode);
  console.log('Data:', Data);
  console.log('Message:', Message);
  if (!clientReference) {
    console.error(
      'Callback received success but no ClientReference found in Data',
    );
    return res.sendStatus(200);
  }

  // 0000 = Successful payment
  if (ResponseCode === '0000') {
    const transaction = await prisma.transaction.findUnique({
      where: { clientReference },
    });

    console.log('Matching transaction found in DB:', transaction);

    if (!transaction) {
      console.error(
        `No transaction found for ClientReference: ${clientReference}`,
      );
      res.sendStatus(200); // Still return 200 to Hubtel to prevent retries
      return;
    }

    if (transaction && transaction.status === 'pending') {
      // Use a Prisma transaction to ensure both records update together
      const [updatedTransaction, updatedWallet] = await prisma.$transaction([
        prisma.transaction.update({
          where: { clientReference },
          data: {
            status: 'success',
            hubtelId: Data.SalesInvoiceId || Data.CheckoutId,
            salesInvoiceId: Data.SalesInvoiceId,
            checkoutId: Data.CheckoutId,
          },
        }),
        prisma.wallet.update({
          where: { userId: transaction.userId },
          data: { balance: { increment: transaction.amount } },
        }),
      ]);
      console.log(`Wallet topped up for User: ${transaction.userId}`);
      console.log(
        `updatedTransaction: ${JSON.stringify(updatedTransaction, null, 2)}`,
      );
      console.log(`updatedWallet: ${JSON.stringify(updatedWallet, null, 2)}`);
    }
  }

  // Mandatory: Always return 200 to Hubtel
  res.sendStatus(200);
});

// 2. Initiate Withdrawal (Rider)
const withdraw = catchAsync(async (req: Request, res: Response) => {
  const { amount, channel } = req.body;
  const userId = req.user.userId;
  const result = await walletServices.requestRiderWithdrawal(
    userId,
    amount,
    channel,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Withdrawal successful',
    data: result,
  });
});

const handleSendCallback = catchAsync(async (req: Request, res: Response) => {
  // Callback for Withdrawals (Direct Send Money) [cite: 786, 791]
  const { ResponseCode, Data, Message } = req.body;
  const clientReference = Data?.ClientReference;
  console.log('Received Hubtel send callback req.body:', req.body);
  // console.log('ClientReference:', ClientReference);
  console.log('ClientReference:', clientReference);
  console.log('ResponseCode:', ResponseCode);
  console.log('Data:', Data);
  console.log('Message:', Message);

  if (!clientReference) {
    console.error('No ClientReference found in callback Data');
    return res.sendStatus(200); // Still return 200 to prevent retries
  }
  if (ResponseCode === '0000') {
    console.log(
      'Successful withdrawal callback received from Hubtel for ClientReference:',
      clientReference,
    );
    const transaction = await prisma.transaction.update({
      where: { reference: clientReference },
      data: { status: 'success', hubtelId: Data.TransactionId },
    });
    console.log('Matching transaction updated in DB:', transaction);
    console.log(`transaction.status: ${transaction.status}`);
    console.log(`transaction.hubtelId ${transaction.hubtelId}`);
    // Note: We already deducted the balance when the rider clicked "Withdraw"
    // to prevent "double spending" while the transaction was processing.
  } else {
    console.log(
      'Failed withdrawal callback received from Hubtel for ClientReference:',
      clientReference,
    );
    // If the withdrawal fails at the Hubtel/Network level, REFUND the rider's wallet
    const transaction = await prisma.transaction.findUnique({
      where: { reference: clientReference },
    });
    console.log(
      'Matching transaction found in DB for failed withdrawal:',
      transaction,
    );
    if (transaction && transaction.status === 'pending') {
      const [updatedTransaction, updatedWallet] = await prisma.$transaction([
        prisma.transaction.update({
          where: { reference: clientReference },
          data: { status: 'failed' },
        }),
        prisma.wallet.update({
          where: { userId: transaction.userId },
          data: { balance: { increment: transaction.amount } },
        }),
      ]);
      console.log(
        `Transaction status updatedTransaction.status: ${updatedTransaction.status}`,
      );
      console.log(
        `Wallet credited for Rider updatedWallet.balance: ${updatedWallet.balance}`,
      );
      console.log(
        `updatedTransaction: ${JSON.stringify(updatedTransaction, null, 2)}`,
        `updatedWallet: ${JSON.stringify(updatedWallet, null, 2)}`,
      );
    }
  }
  res.sendStatus(200);
});

const getWallet = catchAsync(async (req: Request, res: Response) => {
  const wallet = await walletServices.getWallet(req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Wallet balance retrieved successfully',
    data: wallet,
  });
});

const assignBonusToRider = catchAsync(async (req: Request, res: Response) => {
  const { riderId, amount, reason } = req.body;
  const response = await walletServices.assignBonusToRider(
    riderId,
    amount,
    reason,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Bonus assigned successfully',
    data: response,
  });
});

const handleBonusCallback = catchAsync(async (req: Request, res: Response) => {
  console.log('Received Bonus Callback:', JSON.stringify(req.body, null, 2));

  const { ResponseCode, Data, Message } = req.body;
  const clientReference = Data?.ClientReference;

  console.log('clientReference:', clientReference);
  console.log('ResponseCode:', ResponseCode);
  console.log('Data:', Data);
  console.log('Message:', Message);

  if (ResponseCode === '0000' && clientReference) {
    // Bonus successfully reached the rider's phone
    const transaction = await prisma.transaction.update({
      where: { reference: clientReference },
      data: { status: 'success' },
    });
    console.log(
      `Bonus successfully disbursed for ClientReference: ${clientReference}, Transaction ID: ${transaction.id}`,
    );
    console.log(`transaction: ${JSON.stringify(transaction, null, 2)}`);
    console.log(
      `Bonus successfully disbursed for reference: ${clientReference}`,
    );
  } else {
    // Log the failure reason (e.g., Network timeout, wrong number)
    console.warn(`Bonus disbursement failed [${ResponseCode}]: ${Message}`);
    if (clientReference) {
      const transaction = await prisma.transaction.update({
        where: { reference: clientReference },
        data: { status: 'failed' },
      });
      console.log(
        `Failed transaction logged: ${JSON.stringify(transaction, null, 2)}`,
      );
    }
  }

  res.sendStatus(200);
});

const verifyWithdrawalStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { clientReference } = req.params;
    const result = await walletServices.syncWithdrawalOrBonusStatus(
      clientReference as string,
    );

    if (!result.success && result.status === 'error') {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST, // Or 404 based on your preference
        success: false,
        message: 'Hubtel status check failed',
        data: {
          hubtelMessage: result.message,
          hubtelCode: result.code,
        },
      });
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: result.success,
      message: result.success
        ? 'Sync complete'
        : 'Sync performed, transaction not found or pending.',
      data: result,
    });
  },
);

export const walletControllers = {
  topUp,
  withdraw,
  getWallet,
  assignBonusToRider,
  // handleReceiveCallback,
  handleTopUpCallback,
  handleSendCallback,
  handleBonusCallback,
  verifyWithdrawalStatus,
};
