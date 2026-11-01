import cron from 'node-cron';
import prisma from 'app/shared/prisma';
import { paymentServices } from '../../modules/payments/payment.service';
import { walletServices } from '../../modules/wallets/wallet.service';
// Schedule to run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Running Cron: Checking for stuck pending transactions...');

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  // Find transactions still pending after 10 minutes
  const pendingTransactions = await prisma.transaction.findMany({
    where: {
      status: 'pending',
      createdAt: { lte: tenMinutesAgo },
      type: 'RIDE_PAYMENT',
    },
    take: 10, // Process in small batches
  });

  for (const tx of pendingTransactions) {
    try {
      console.log(`Syncing status for: ${tx.clientReference}`);
      //   await paymentServices.syncTransactionStatus(tx.clientReference);
      // HANDLE INCOMING (Ride Payments & Top-ups) [cite: 397, 406]
      if (tx.type === 'RIDE_PAYMENT' || tx.type === 'TOPUP') {
        console.log(`Checking Incoming Status: ${tx.clientReference}`);
        const syncTransactionStatus =
          await paymentServices.syncTransactionStatus(tx.clientReference);
        console.log(
          `Status after sync for ${tx.clientReference}:`,
          syncTransactionStatus,
        );
      }

      // HANDLE OUTGOING (Withdrawals & Bonuses) [cite: 855, 864]
      if (tx.type === 'WITHDRAWAL' || tx.type === 'BONUS') {
        console.log(`Checking Outgoing Status: ${tx.clientReference}`);
        const syncWithdrawalOrBonusStatus =
          await walletServices.syncWithdrawalOrBonusStatus(tx.clientReference);
        console.log(
          `Status after sync for ${tx.clientReference}:`,
          syncWithdrawalOrBonusStatus,
        );
      }
    } catch (error) {
      console.error(`Cron failed for ${tx.clientReference}:`, error);
    }
  }
});
