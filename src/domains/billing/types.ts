export type InvoiceStatus='draft'|'issued'|'paid'|'void'|'overdue';
export interface Invoice { id:string; invoiceNumber:string; customerId:string; sourceType:string; sourceId:string|null; status:InvoiceStatus; totalAmount:number; currency:string; }
