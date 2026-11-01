export interface ICommissionRatePayload {
  rate: number;
}

export interface ICommissionRate {
  id: string;
  rate: number;
  createdAt: Date;
  updatedAt: Date;
}
