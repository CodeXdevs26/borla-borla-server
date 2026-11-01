export type HistoryFilter = 'today' | 'weekly' | 'monthly' | 'all';

// Ghana uses UTC throughout the year; never depend on the server's local timezone.
export const getHistoryRange = (filter: HistoryFilter, now = new Date()) => {
  if (filter === 'all') return null;
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  if (filter === 'weekly')
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (filter === 'monthly') start.setUTCDate(1);
  return { gte: start, lte: now };
};
