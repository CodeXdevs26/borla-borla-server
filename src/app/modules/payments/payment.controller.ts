import { Request, Response } from 'express';
import prisma from 'app/shared/prisma';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { paymentServices } from './payment.service';
import { emitToUser } from '../../utils/socket';
import { notificationService } from '../notifications/notification.service';
import AppError from '../../error/AppError';
import { commissionServices } from '../commissions/commission.service';

const getMyPaymentHistory = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentServices.getCustomerPaymentHistory(
    req.user.userId,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment history retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  console.log('req.body:', req.body);
  console.log('req.user.userId:', req.user.userId);
  const { bookingId } = req.body;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      riderId: true,
    },
  });

  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  }

  const result = await paymentServices.initiateBookingPayment(
    bookingId,
    req.user.userId,
  );
  console.log('Payment initiation result:', result);
  if (booking.riderId) {
    console.log(`Emitting payment:initiated event to Rider ${booking.riderId}`);
    emitToUser(booking.riderId, 'payment:initiated', {
      bookingId: booking.id,
      userId: booking.userId,
      riderId: booking.riderId,
      status: 'pending',
      message: 'Customer initiated online payment for this booking.',
    });
    console.log(`Emitted payment:initiated event to Rider ${booking.riderId}`);
  }

  await notificationService.createNotificationForUsers(
    [booking.userId, booking.riderId].filter(Boolean) as string[],
    {
      type: 'booking_payment_initiated',
      title: 'Payment Initiated',
      message: 'Online payment has been initiated for this booking.',
      data: {
        bookingId: booking.id,
        userId: booking.userId,
        riderId: booking.riderId,
        status: 'pending',
      },
    },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment session initiated successfully.',
    data: result,
  });
});

const handleBookingCallback = catchAsync(
  async (req: Request, res: Response) => {
    console.log('Received payment callback with req.body:', req.body);
    // 1. Extract data from Hubtel's payload
    const { ResponseCode, Data, Message } = req.body;
    const clientReference = Data?.ClientReference;
    // 0000 = Success
    if (ResponseCode === '0000') {
      if (!clientReference) {
        console.error(
          'Callback received success but no ClientReference found in Data',
        );
        return res.sendStatus(200);
      }
      const transaction = await prisma.transaction.findUnique({
        where: { reference: clientReference },
        include: { booking: true },
      });

      console.log('Matching transaction found in DB:', transaction);
      if (!transaction) {
        console.error(
          `No transaction found for ClientReference: ${clientReference}`,
        );
        res.sendStatus(200); // Still return 200 to Hubtel to prevent retries
        return;
      }
      // 2. Prevent double-processing
      if (transaction && transaction.status === 'pending') {
        const totalAmount = Number(transaction.amount);
        const commissionRate =
          await commissionServices.getActiveCommissionRateValue();
        const riderShare = totalAmount * (1 - commissionRate / 100);
        console.log(
          `commissionRate: ${commissionRate}, riderShare: ${riderShare}`,
        );
        // 3. Atomically update all records
        const [updatedTransaction, updatedWallet, updatedBooking] =
          await prisma.$transaction([
            // Update Transaction status and store Hubtel's reference
            prisma.transaction.update({
              where: { reference: clientReference },
              data: {
                status: 'success',
                hubtelId: Data.SalesInvoiceId || Data.CheckoutId,
                salesInvoiceId: Data.SalesInvoiceId,
                checkoutId: Data.CheckoutId,
                commission: totalAmount - riderShare,
                comissionPercentage: commissionRate,
                riderEarnings: riderShare,
              },
            }),
            // Credit the Rider's Virtual Wallet
            prisma.wallet.update({
              where: { userId: transaction.booking?.riderId! },
              data: { balance: { increment: riderShare } },
            }),
            // Mark the Booking as completed
            prisma.booking.update({
              where: { id: transaction.bookingId as string },
              data: {
                // status: 'completed',
                paymentMethod: 'hubtel',
                isPaid: true,
                paidAt: new Date(),
              },
            }),
          ]);
        console.log(
          `Transaction ${updatedTransaction.id} marked as success, Rider wallet credited with ${riderShare}, Booking ${updatedBooking.id} marked as paid.`,
        );
        console.log(
          `Successfully split payment for Booking ${transaction.bookingId}`,
        );

        console.log(
          `updatedTransaction: ${JSON.stringify(updatedTransaction, null, 2)}, updatedWallet: ${JSON.stringify(updatedWallet, null, 2)}, updatedBooking: ${JSON.stringify(updatedBooking, null, 2)}`,
        );

        const targetUsers = [
          updatedBooking.userId,
          transaction.booking?.riderId,
        ].filter(Boolean) as string[];

        await notificationService.createNotificationForUsers(targetUsers, {
          type: 'booking_payment_callback_success',
          title: 'Payment Successful',
          message: 'Booking payment callback confirmed successful payment.',
          data: {
            bookingId: updatedBooking.id,
            transactionId: updatedTransaction.id,
            status: 'success',
          },
        });

        targetUsers.forEach(targetUserId => {
          emitToUser(targetUserId, 'payment:callback', {
            bookingId: updatedBooking.id,
            transactionId: updatedTransaction.id,
            status: 'success',
            message: 'Booking payment callback confirmed successful payment.',
          });
        });
      }
    } else {
      // 4. Handle Failed Payments (e.g., Wrong PIN, Insufficient Funds)
      console.warn(`Payment failed for ${clientReference}: ${Message}`);
      if (clientReference) {
        const failedTransaction = await prisma.transaction.update({
          where: { reference: clientReference },
          data: { status: 'failed' },
          include: {
            booking: {
              select: {
                id: true,
                userId: true,
                riderId: true,
              },
            },
          },
        });

        const targetUsers = [
          failedTransaction.booking?.userId,
          failedTransaction.booking?.riderId,
        ].filter(Boolean) as string[];

        if (targetUsers.length) {
          await notificationService.createNotificationForUsers(targetUsers, {
            type: 'booking_payment_callback_failed',
            title: 'Payment Failed',
            message:
              Message ||
              'Booking payment callback reported a failed payment attempt.',
            data: {
              bookingId: failedTransaction.booking?.id || null,
              transactionId: failedTransaction.id,
              status: 'failed',
            },
          });

          targetUsers.forEach(targetUserId => {
            emitToUser(targetUserId, 'payment:callback', {
              bookingId: failedTransaction.booking?.id || null,
              transactionId: failedTransaction.id,
              status: 'failed',
              message:
                Message ||
                'Booking payment callback reported a failed payment attempt.',
            });
          });
        }
      }
    }

    // 5. Mandatory: Always return 200 OK to Hubtel
    res.sendStatus(200);
  },
);

const initiateRefund = catchAsync(async (req: Request, res: Response) => {
  const { orderId, reason } = req.body;
  const result = await paymentServices.processRefund(orderId, reason);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Refund session initiated successfully.',
    data: result,
  });
});

const handleRefundCallback = catchAsync(async (req: Request, res: Response) => {
  console.log('Received Refund Callback:', JSON.stringify(req.body, null, 2));
  console.log('Received Refund Callback:', req.body);

  const { responseCode, data, message } = req.body;
  console.log('Extracted responseCode:', responseCode);
  console.log('Extracted data:', data);
  console.log('Extracted message:', message);
  // responseCode "0000" means the refund is complete
  if (responseCode === '0000' && data?.orderId) {
    const orderId = data.orderId;

    // Find the original transaction using the SalesInvoiceId (orderId)
    const transaction = await prisma.transaction.findFirst({
      where: { checkoutId: orderId },
    });

    if (!transaction) {
      console.error(`No transaction found for Order ID: ${orderId}`);
      return res.sendStatus(200); // Still return 200 to prevent retries
    }

    if (transaction) {
      const [updatedTransaction, updatedBooking] = await prisma.$transaction([
        // 1. Update Transaction status
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'refunded' },
        }),
        // 2. Update Booking payment status if applicable
        ...(transaction.bookingId
          ? [
              prisma.booking.update({
                where: { id: transaction.bookingId },
                data: { isRefunded: true, refundedAt: new Date() },
              }),
            ]
          : []),
      ]);

      console.log(`Successfully processed refund for Order: ${orderId}`);

      console.log(
        `updatedTransaction: ${JSON.stringify(updatedTransaction, null, 2)}, updatedBooking: ${JSON.stringify(updatedBooking, null, 2)}`,
      );
    }
  } else {
    console.warn(
      `Refund callback returned non-success: ${responseCode} - ${message}`,
    );
  }

  // Mandatory: Always return 200 OK to Hubtel
  res.sendStatus(200);
});

const initiateBookingPaymentCash = catchAsync(
  async (req: Request, res: Response) => {
    // This function can be expanded to handle cash payments if neededconsole.log('req.body:', req.body);
    console.log('req.body:', req.body);
    console.log('req.user.userId:', req.user.userId);

    const { bookingId } = req.body;
    const result = await paymentServices.initiateBookingPaymentCash(
      bookingId,
      req.user.userId,
    );

    if (result.riderId) {
      const emittedAt = new Date().toISOString();
      const connectedSocketCount = emitToUser(
        result.riderId,
        'payment:cash_completed',
        {
          bookingId: result.id,
          userId: result.userId,
          riderId: result.riderId,
          status: 'success',
          message: 'Customer completed payment by cash.',
          emittedAt,
        },
      );
      console.log(
        `Cash-payment event for booking ${result.id} emitted at ${emittedAt}; rider sockets: ${connectedSocketCount}.`,
      );
    }

    await notificationService.createNotificationForUsers(
      [result.userId, result.riderId].filter(Boolean) as string[],
      {
        type: 'booking_payment_cash_completed',
        title: 'Cash Payment Completed',
        message: 'Customer completed payment by cash for this booking.',
        data: {
          bookingId: result.id,
          userId: result.userId,
          riderId: result.riderId,
          status: 'success',
        },
      },
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Cash payment initiated successfully.',
      data: result,
    });
  },
);

// payment.controller.ts
const verifyPaymentStatus = catchAsync(async (req: Request, res: Response) => {
  const { clientReference } = req.params;
  console.log('Verifying payment status for clientReference:', clientReference);
  const result = await paymentServices.syncTransactionStatus(
    clientReference as string,
  );

  // If there was an error communicating with Hubtel, show it clearly
  if (result.status === 'Error') {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: result.message,
      data: result.hubtelRaw,
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.success
      ? 'Payment verified and updated.'
      : `Current status: ${result.status}`,
    data: result,
  });
});

export const paymentControllers = {
  getMyPaymentHistory,
  initiatePayment,
  handleBookingCallback,
  initiateRefund,
  handleRefundCallback,
  initiateBookingPaymentCash,
  verifyPaymentStatus,
};
