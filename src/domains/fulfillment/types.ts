export type FulfillmentStatus='pending'|'processing'|'ready'|'shipped'|'completed'|'cancelled'|'failed';
export interface FulfillmentTask { id:string; referenceType:string; referenceId:string; status:FulfillmentStatus; assignedTo:string|null; trackingReference:string|null; }
