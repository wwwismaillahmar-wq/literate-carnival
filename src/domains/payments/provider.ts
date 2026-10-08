export interface PaymentProvider {
  readonly name:string;
  createPayment(input:{invoiceId:string;amount:number;currency:string;idempotencyKey:string}):Promise<{providerReference:string;status:'pending'|'authorized'|'paid'|'failed'}>;
  refund(input:{providerReference:string;amount:number}):Promise<{status:'refunded'|'failed'}>;
}
