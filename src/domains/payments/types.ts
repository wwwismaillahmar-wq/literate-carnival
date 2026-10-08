export type PaymentStatus='pending'|'authorized'|'paid'|'failed'|'refunded';
export interface PaymentIntent { invoiceId:string; amount:number; currency:string; provider:string; idempotencyKey:string; }
