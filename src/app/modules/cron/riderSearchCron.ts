import cron from 'node-cron';
import { bookingServices } from '../bookings/booking.service';

let started = false;

export const startRiderSearchJob = () => {
  if (started) return;
  started = true;

  // Poll each minute so persisted 15-minute deadlines are handled promptly.
  // The database lock in processDueRiderSearches makes this safe when the app
  // is deployed with more than one process.
  cron.schedule('* * * * *', async () => {
    try {
      await bookingServices.processDueRiderSearches();
    } catch (error) {
      console.error('Rider search scheduler failed:', error);
    }
  });
};
