export type IPaymentPayload = {
  bookingId: string;
  amount: number;
  email: string;
};

export type IPaystackWebhookEvent = {
  event: string;
  data: {
    reference: string;
    amount: number;
    metadata: {
      bookingId: string;
      userId: string;
    };
    status: string;
  };
};
