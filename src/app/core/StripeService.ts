/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Stripe as StripeType } from 'stripe';
import config from '../config';
interface IProducts {
  amount: number;
  name: string;
  quantity: number;
}
class StripeServices<T> {
  private stripe() {
    return new StripeType(config.stripe?.stripe_api_secret as string, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    });
  }

  private handleError(error: any, message: string): never {
    if (error instanceof StripeType.errors.StripeError) {
      console.error('Stripe Error:', error?.message);
      throw new Error(`Stripe Error: ${message} - ${error?.message}`);
    } else if (error instanceof Error) {
      console.error('Error:', error.message);
      throw new Error(`${message} - ${error.message}`);
    } else {
      // Unknown error types
      console.error('Unknown Error:', error);
      throw new Error(`${message} - An unknown error occurred.`);
    }
  }

  public async connectAccount(
    returnUrl: string,
    refreshUrl: string,
    accountId: string,
  ) {
    console.log({ returnUrl, refreshUrl, accountId });
    try {
      const accountLink = await this.stripe().accountLinks.create({
        account: accountId,
        return_url: returnUrl,
        refresh_url: refreshUrl,
        type: 'account_onboarding',
      });

      return accountLink;
    } catch (error) {
      this.handleError(error, 'Error connecting account');
    }
  }

  public async createPaymentIntent(
    amount: number,
    currency: string,
    payment_method_types: string[] = ['card'],
  ) {
    try {
      return await this.stripe().paymentIntents.create({
        amount: amount * 100, // Convert amount to cents
        currency,
        payment_method_types,
      });
    } catch (error) {
      this.handleError(error, 'Error creating payment intent');
    }
  }

  public async transfer(
    amount: number,
    accountId: string,
    currency: string = 'usd',
  ) {
    try {
      const balance = await this.stripe().balance.retrieve();
      const availableBalance = balance.available.reduce(
        (total: number, bal: { amount: number }) => total + bal.amount,
        0,
      );

      if (availableBalance < amount) {
        console.log('Insufficient funds to cover the transfer.');
        throw new Error('Insufficient funds to cover the transfer.');
      }

      return await this.stripe().transfers.create({
        amount,
        currency,
        destination: accountId,
      });
    } catch (error) {
      this.handleError(error, 'Error transferring funds');
    }
  }

  public async refund(payment_intent: string, amount?: number) {
    try {
      if (amount) {
        return await this.stripe().refunds.create({
          payment_intent: payment_intent,
          amount: Math.round(amount),
        });
      }
      return await this.stripe().refunds.create({
        payment_intent: payment_intent,
      });
    } catch (error) {
      this.handleError(error, 'Error processing refund');
    }
  }
  public async retrieve(session_id: string) {
    try {
      // return await this.stripe().paymentIntents.retrieve(intents_id);
      return await this.stripe().checkout.sessions.retrieve(session_id);
    } catch (error) {
      this.handleError(error, 'Error retrieving session');
    }
  }

  public async getPaymentSession(session_id: string) {
    try {
      return await this.stripe().checkout.sessions.retrieve(session_id);
      // return (await this.stripe().paymentIntents.retrieve(intents_id)).status;
    } catch (error) {
      this.handleError(error, 'Error retrieving payment status');
    }
  }

  public async isPaymentSuccess(session_id: string) {
    try {
      const status = (
        await this.stripe().checkout.sessions.retrieve(session_id)
      ).status;
      return status === 'complete';
    } catch (error) {
      this.handleError(error, 'Error checking payment success');
    }
  }

  public async getCheckoutSession(
    product: IProducts,
    success_url: string,
    cancel_url: string,
    customer: string = '', // Optional: customer ID for Stripe
    currency: string = 'usd',
    payment_method_types: Array<'card' | 'paypal' | 'ideal'> = ['card'],
  ) {
    try {
      if (!product?.name || !product?.amount || !product?.quantity) {
        throw new Error('Product details are incomplete.');
      }
      const stripe = this.stripe();

      return await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: product?.name,
              },
              unit_amount: parseFloat((product?.amount * 100).toFixed(2)),
            },
            quantity: product?.quantity,
          },
        ],

        success_url: success_url,
        cancel_url: cancel_url,
        mode: 'payment',
        // metadata: {
        //   user: JSON.stringify({
        //     paymentId: payment.id,
        //   }),
        // },
        invoice_creation: {
          enabled: true,
        },
        customer,
        // payment_intent_data: {
        //   metadata: {
        //     payment: JSON.stringify({
        //       ...payment,
        //     }),
        //   },
        // },
        // payment_method_types: ['card', 'amazon_pay', 'cashapp', 'us_bank_account'],
        payment_method_types,
      });
    } catch (error) {
      this.handleError(error, 'Error creating checkout session');
    }
  }

  public async getExchangeRateQuote(
    sourceCurrency: string,
    targetCurrency: string,
    amount: number,
  ) {
    try {
      const res = await fetch(
        `https://api.exchangerate.host/convert?access_key=${config.stripe.stripe_api_key}&from=${sourceCurrency}&to=${targetCurrency}&amount=${amount}`,
      );
      const data = await res.json();
      return Math.round(data.result * 100);
    } catch (error) {
      this.handleError(error, 'Error creating checkout session');
    }
  }

  public async createCustomer(email: string, name: string) {
    try {
      return await this.stripe().customers.create({
        email,
        name,
        //   description: 'HandyHub.pro Customer', // Optional: for dashboard reference
        //   metadata: {
        //     platform: 'HandyHub.pro', // Custom metadata for tracking
        //   },
      });
    } catch (error) {
      this.handleError(error, 'customer creation failed');
    }
  }
  public getStripe() {
    return this.stripe();
  }
}
const StripeService = new StripeServices();
export default StripeService;
