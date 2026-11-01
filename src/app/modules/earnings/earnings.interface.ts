export interface IEarningsListQuery {
  search?: string;
  page?: number | string;
  limit?: number | string;
}

export interface IEarningRow {
  key?: string;
  serial: number;
  passengerName: string;
  riderName: string;
  passengerEmail: string;
  riderEmail: string;
  date: string;
  amount: string;
  commission: string;
  riderEarning: string;
  status: string;
}

export interface IEarningDetails {
  transactionId: string;
  hubtelId: string;
  salesInvoiceId: string;
  checkoutId: string;
  id?: string;
  passengerName: string;
  riderName: string;
  passengerEmail: string;
  riderEmail: string;
  date: string;
  amount: string;
  commission: string;
  riderEarning: string;
  status: string;
  paymentMethod: string;
  pickupLocation: unknown;
  pickupAddress: string;
  dropoffLocation?: unknown | null;
  dropoffAddress?: string | null;
  reference: string;
  clientReference: string;
  paymentStatus: string;
}

export interface IRiderEarningsSummary {
  totalEarnings: number;
  ridesCompleted: number;
  totalCommission: number;
  cashReceived: number;
}

export interface IRiderEarningsTransaction {
  key: string;
  serial: number;
  userName: string;
  date: string;
  paymentMethod: string;
  amount: string;
  commission: string;
  riderEarnings: string;
}

export interface IRiderEarningsResponse {
  summary: IRiderEarningsSummary;
  transactions: IRiderEarningsTransaction[];
}
