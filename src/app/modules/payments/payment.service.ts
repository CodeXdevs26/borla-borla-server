import axios from 'axios';
import prisma from 'app/shared/prisma';
import AppError from 'app/error/AppError';
import httpStatus from 'http-status';
import crypto from 'crypto';
import config from 'app/config';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

const authToken = `Bearer ${PAYSTACK_SECRET.trim()}`;

interface ICustomerPaymentHistoryQuery {
  page?: number | string;
  limit?: number | string;
  status?: 'pending' | 'success' | 'failed' | 'refunded';
  paymentMethod?: 'hubtel' | 'cash';
}

const getCustomerPaymentHistory = async (
  userId: string,
  query: ICustomerPaymentHistoryQuery,
) => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const requestedLimit = Number(query.limit) > 0 ? Number(query.limit) : 10;
  const limit = Math.min(requestedLimit, 100);
  const skip = (page - 1) * limit;

  const where = {
    userId,
    type: 'RIDE_PAYMENT' as const,
    bookingId: { not: null },
    ...(query.status ? { status: query.status } : {}),
    ...(query.paymentMethod
      ? { booking: { is: { paymentMethod: query.paymentMethod } } }
      : {}),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        booking: {
          select: {
            id: true,
            status: true,
            paymentMethod: true,
            pickupLocation: true,
            pickupAddress: true,
            dropoffLocation: true,
            dropoffAddress: true,
            wasteCategory: true,
            wasteSize: true,
            binSize: true,
            binQuantity: true,
            estimatedDistance: true,
            estimatedTime: true,
            isPaid: true,
            paidAt: true,
            isPaidByCustomer: true,
            isPaidByCustomerAt: true,
            rider: {
              select: {
                id: true,
                name: true,
                profilePicture: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data: transactions.map(transaction => ({
      id: transaction.id,
      bookingId: transaction.bookingId,
      amount: transaction.amount,
      currency: 'GHS',
      status: transaction.status,
      paymentMethod: transaction.booking?.paymentMethod || null,
      description: transaction.description,
      clientReference: transaction.clientReference,
      hubtelId: transaction.hubtelId,
      paidAt:
        transaction.booking?.paidAt ||
        transaction.booking?.isPaidByCustomerAt ||
        null,
      createdAt: transaction.createdAt,
      booking: transaction.booking
        ? {
            id: transaction.booking.id,
            status: transaction.booking.status,
            pickupLocation: transaction.booking.pickupLocation,
            pickupAddress: transaction.booking.pickupAddress,
            dropoffLocation: transaction.booking.dropoffLocation,
            dropoffAddress: transaction.booking.dropoffAddress,
            wasteCategory: transaction.booking.wasteCategory,
            wasteSize: transaction.booking.wasteSize,
            binSize: transaction.booking.binSize,
            binQuantity: transaction.booking.binQuantity,
            estimatedDistance: transaction.booking.estimatedDistance,
            estimatedTime: transaction.booking.estimatedTime,
            isPaid:
              transaction.booking.isPaid ||
              transaction.booking.isPaidByCustomer,
            rider: transaction.booking.rider,
          }
        : null,
    })),
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const normalizeLegacyBookingPaymentMethods = async () => {
  await prisma.$runCommandRaw({
    update: 'bookings',
    updates: [
      {
        q: { paymentMethod: 'momo' },
        u: { $set: { paymentMethod: 'hubtel' } },
        multi: true,
      },
    ],
  });
};

// Initiate payment when Rider arrives at pickup
const initiateBookingPayment = async (bookingId: string, userId: string) => {
  console.log('Initiating payment for bookingId:', bookingId);

  // Backward compatibility: old bookings may still store paymentMethod as "momo".
  // Prisma now expects "hubtel", so normalize legacy records before reading.
  await normalizeLegacyBookingPaymentMethods();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, rider: true },
  });

  if (!booking) throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  if (booking.userId !== userId)
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This booking does not belong to you',
    );

  // Ensure only the assigned rider can trigger the payment
  // if (booking.userId !== userId) {
  //   throw new AppError(
  //     httpStatus.FORBIDDEN,
  //     'You are not assigned to this booking',
  //   );
  // }

  // Ensure payment is only requested after arrival at pickup
  if (booking.status !== 'garbage_collected') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Rider must confirm garbage collection before payment',
    );
  }

  // PayProxy Authentication (Basic Auth)
  // const auth = Buffer.from(
  //   `${config.HUBTEL_CLIENT_ID}:${config.HUBTEL_CLIENT_SECRET}`,
  // ).toString('base64');
  const auth = Buffer.from(
    `${config.HUBTEL_API_ID}:${config.HUBTEL_API_KEY}`,
  ).toString('base64');

  // Payload structure based on Page 4 of your PDF
  const payload = {
    totalAmount: Number(booking.price) < 10 ? Number(booking.price) : 10, // Hubtel may have a minimum amount requirement; adjust as needed
    description: `Borla Service: ${booking.wasteCategory} collection`,
    callbackUrl: `${config.server_url}/api/v1/payments/booking-callback`,
    // returnUrl: `${config.CLIENT_URL}/booking/success`,
    returnUrl: `${config.server_url}/booking/success`,
    // cancellationUrl: `${config.CLIENT_URL}/booking/failed`,
    cancellationUrl: `${config.server_url}/booking/failed`,
    merchantAccountNumber: config.HUBTEL_POS_ID,
    // clientReference: `BK-${bookingId}`,
    clientReference: `BK-${Date.now()}`,
  };
  console.log('Initiating payment with payload:', payload);

  try {
    const response = await axios.post(
      'https://payproxyapi.hubtel.com/items/initiate',
      payload,
      { headers: { Authorization: `Basic ${auth}` } },
    );
    // const response = await axios.post(
    //   'https://webhook.site/036f6f0d-cb17-486d-967f-9eb3de264390',
    //   payload,
    //   { headers: { Authorization: `Basic ${auth}` } },
    // );
    console.log('response', response);
    // Track the transaction in Prisma
    const pendingReference = `RIDE-PAY-INIT-${booking.id}-${Date.now()}`;
    await prisma.transaction.create({
      data: {
        userId: booking.userId,
        riderId: booking.riderId,
        amount: booking.price!,
        type: 'RIDE_PAYMENT',
        clientReference: payload.clientReference,
        bookingId: booking.id,
        reference: payload.clientReference,
        status: 'pending',
      },
    });

    // The PayProxy API returns a checkoutUrl in the response data
    return response.data.data.checkoutUrl;
  } catch (error: any) {
    console.error('Error initiating payment:');
    console.error('error:', error);
    console.error(
      'error.response?.data || error.message:',
      error.response?.data || error.message,
    );
    if (error.response && error.response.data) {
      // This looks for the specific validation messages Hubtel sends
      const hubtelErrors = error.response.data.errors;
      const detailMessage = hubtelErrors
        ? Object.entries(hubtelErrors)
            .map(([key, val]) => `${key}: ${val}`)
            .join(', ')
        : error.response.data.title || 'Hubtel Validation Error';

      console.error(
        'Hubtel Validation Error:',
        JSON.stringify(hubtelErrors, null, 2),
      );

      // This will now send the "Client reference exceeds maximum length" to Postman
      throw new AppError(httpStatus.BAD_REQUEST, detailMessage);
    }

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'External Service Error',
    );
  }
};

// Admin Refund Logic (Full or Partial)
// payment.service.ts

/**
 * processRefund
 * Strictly follows the Hubtel Refund API
 * URL: https://refund-api.hubtel.com/refund/{Hubtel_POS_Sales_ID}/order/{orderId}
 */
const processRefund = async (
  orderId: string, // This is the CheckoutId from your callback Data
  reason: string, // Description for the refund
) => {
  console.log(
    `Processing refund for Order ID: ${orderId} with reason: ${reason}`,
  );
  const auth = Buffer.from(
    `${config.HUBTEL_API_ID}:${config.HUBTEL_API_KEY}`,
  ).toString('base64');

  // Your Hubtel POS ID from config (e.g., 2038240)
  const posId = config.HUBTEL_POS_ID;

  // The endpoint path variable structure from your sample request
  const url = `https://refund-api.hubtel.com/refund/${posId}/order/${orderId}`;

  // Constructing payload based on your Sample Request snippets
  const payload = {
    callbackUrl: `${config.server_url}/api/v1/payments/refund-callback`, // Optional as per sample
    description: reason, // Explanation for the refund
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
    });
    console.log('Refund API response:', response);
    // Handle Hubtel Success Response Codes
    // 0000 = Success, 0001 = Pending
    return response.data;
  } catch (error: any) {
    let errorMessage = 'An unknown error occurred';
    let errorData = null;

    if (error.response) {
      console.error('Hubtel Refund API error:', error);
      console.error('Hubtel Refund API error.response:', error.response);
      console.error(
        'Hubtel Refund API error.response.data:',
        error.response.data,
      );

      errorData = error.response.data;

      // Check if Hubtel sent an HTML error (like the 403 Forbidden AWS block)
      if (typeof errorData === 'string' && errorData.includes('<html>')) {
        errorMessage = `Infrastructure Block (403 Forbidden): Your Server IP is likely not whitelisted on Hubtel's Firewall.`;
      }
      // Check if Hubtel sent a JSON validation error
      else if (errorData && typeof errorData === 'object') {
        errorMessage =
          errorData.message ||
          JSON.stringify(errorData.errors) ||
          'Hubtel API rejected the request';
      }

      // Hubtel Refund API specific error handling
      const hubtelData = error.response.data;

      // Error 3000 = Order not found, 4000 = Amount < 1 cedi, etc.
      // const errorMessage = hubtelData.errors
      //   ? JSON.stringify(hubtelData.errors)
      //   : hubtelData.message || 'Refund API rejected the request';

      console.error(
        `Hubtel Refund API Error [${error.response.status}]:`,
        errorMessage,
      );

      throw new AppError(
        error.response.status,
        `Refund Failed: ${errorMessage}`,
      );
    } else {
      errorMessage = error.message;
    }

    // --- CONSOLE LOG FOR HUBTEL DEVELOPERS ---
    console.log('\n--- DEBUG INFO FOR HUBTEL SUPPORT ---');
    console.log(`URL: ${url}`);
    console.log(`Status: ${error.response?.status}`);
    console.log(
      `Response Data: ${typeof errorData === 'object' ? JSON.stringify(errorData) : errorData}`,
    );
    console.log(`Headers: ${JSON.stringify(error.config?.headers)}`);
    console.log('-------------------------------------\n');

    // --- RESPONSE FOR POSTMAN ---
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, errorMessage);
  }
};

const initiateBookingPaymentCash = async (
  bookingId: string,
  userId: string,
) => {
  console.log(`Initiating cash payment for bookingId: ${bookingId}`);

  // Do not run the legacy MoMo-to-Hubtel collection migration here. Cash
  // payments do not use that value, and running a collection-wide update on
  // every tap delayed the rider's real-time cash confirmation event.
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new AppError(httpStatus.NOT_FOUND, 'Booking not found');
  if (booking.userId !== userId)
    throw new AppError(
      httpStatus.FORBIDDEN,
      'This booking does not belong to you',
    );
  if (booking.status !== 'garbage_collected')
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Rider must confirm garbage collection before payment',
    );
  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId, userId, status: 'garbage_collected' },
    data: {
      paymentMethod: 'cash',
      isPaidByCustomer: true,
      isPaidByCustomerAt: new Date(),
    },
  });

  const transaction = await prisma.transaction.create({
    data: {
      userId: booking.userId,
      riderId: booking.riderId,
      amount: booking.price!,
      type: 'RIDE_PAYMENT',
      clientReference: `BK-${bookingId}`,
      bookingId: booking.id,
      reference: `BK-${bookingId}`,
      status: 'pending',
    },
  });

  console.log('Created transaction for cash payment:', transaction);

  // return booking details or transaction details as needed
  return updatedBooking;
};

// verify initiateBookingPayment's payment status with Hubtel and update records accordingly

const syncTransactionStatus = async (clientReference: string) => {
  const auth = Buffer.from(
    `${config.HUBTEL_API_ID}:${config.HUBTEL_API_KEY}`,
  ).toString('base64');

  const url = `https://api-txnstatus.hubtel.com/transactions/${config.HUBTEL_POS_ID}/status?clientReference=${clientReference}`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    console.log('Transaction status response:', response);
    const hubtelData = response.data.data;

    // status can be "Paid", "Unpaid", or "Refunded" [cite: 880, 900]
    if (hubtelData?.status === 'Paid') {
      const transaction = await prisma.transaction.findUnique({
        where: { reference: clientReference },
        include: { booking: true },
      });

      console.log('Transaction found for status sync:', transaction);

      if (transaction && transaction.status === 'pending') {
        const totalAmount = Number(transaction.amount);
        // Assuming a 20% commission rate as per previous logic
        const riderShare = totalAmount * 0.8;

        const [updatedTransaction, updatedWallet, updatedBooking] =
          await prisma.$transaction([
            prisma.transaction.update({
              where: { reference: clientReference },
              data: {
                status: 'success',
                hubtelId: hubtelData.transactionId,
                salesInvoiceId: hubtelData.externalTransactionId,
              },
            }),
            prisma.wallet.update({
              where: { userId: transaction.booking?.riderId! },
              data: { balance: { increment: riderShare } },
            }),
            prisma.booking.update({
              where: { id: transaction.bookingId as string },
              data: { isPaid: true, paidAt: new Date() },
            }),
          ]);
        console.log(
          `Updated transaction after successful payment updatedTransaction: ${JSON.stringify(updatedTransaction, null, 2)}`,
        );
        console.log(
          `Updated rider wallet after successful payment updatedWallet: ${JSON.stringify(updatedWallet, null, 2)}`,
        );
        console.log(
          `Updated booking after successful payment updatedBooking: ${JSON.stringify(updatedBooking, null, 2)}`,
        );
        return { success: true, status: 'Paid' };
      }
    }
    return {
      success: false,
      status: hubtelData?.status || 'Unpaid',
      data: hubtelData,
    };
  } catch (error: any) {
    let errorMessage = 'Status Check Failed';
    let hubtelResponse = null;

    console.error('Error syncing transaction status:', error);

    if (error.response) {
      // Extract specific message from Hubtel [cite: 880, 149]
      hubtelResponse = error.response.data;
      errorMessage =
        hubtelResponse.message || `Hubtel Error: ${error.response.status}`;

      // Detailed Console Log for Debugging
      console.log('\n--- HUBTEL STATUS CHECK ERROR ---');
      console.log(`URL: ${url}`);
      console.log(`Status Code: ${error.response.status}`);
      console.log(`Hubtel Message: ${errorMessage}`);
      console.log(
        `Payload Returned: ${JSON.stringify(hubtelResponse, null, 2)}`,
      );
      console.log('---------------------------------\n');
    }

    // Return structured error to the controller
    return {
      success: false,
      status: 'Error',
      message: errorMessage,
      hubtelRaw: hubtelResponse,
    };
  }
};

export const paymentServices = {
  getCustomerPaymentHistory,
  initiateBookingPayment,
  initiateBookingPaymentCash,
  processRefund,
  syncTransactionStatus,
};
