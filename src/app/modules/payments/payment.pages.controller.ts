import { Request, Response } from 'express';
import catchAsync from 'app/utils/catchAsync';
import prisma from 'app/shared/prisma';
import config from 'app/config';

const renderBookingSuccessPage = catchAsync(
  async (req: Request, res: Response) => {
    const checkoutId = String(req.query.checkoutid || '');

    const transaction = checkoutId
      ? await prisma.transaction.findFirst({
          where: {
            checkoutId,
          },
          include: {
            booking: {
              select: {
                id: true,
                status: true,
                paymentMethod: true,
              },
            },
          },
        })
      : null;

    res.status(200).render('bookingSuccess', {
      checkoutId,
      clientUrl: config.client_Url || '/',
      transaction,
    });
  },
);

const renderBookingFailedPage = catchAsync(
  async (req: Request, res: Response) => {
    const checkoutId = String(req.query.checkoutid || '');
    const message = String(
      req.query.message || 'Payment was cancelled or failed.',
    );

    res.status(200).render('bookingFailed', {
      checkoutId,
      clientUrl: config.client_Url || '/',
      message,
    });
  },
);

export const paymentPagesControllers = {
  renderBookingSuccessPage,
  renderBookingFailedPage,
};
