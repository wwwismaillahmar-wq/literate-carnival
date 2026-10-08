export type InventoryMovementType='in'|'out'|'reserve'|'release'|'adjustment';
export interface InventoryItem { id:string; productId:number; quantityOnHand:number; quantityReserved:number; reorderLevel:number; status:'active'|'inactive'; }
