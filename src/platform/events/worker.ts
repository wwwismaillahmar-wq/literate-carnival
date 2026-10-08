import { claimNextPlatformEvent, completePlatformEvent, failPlatformEvent } from './recovery';

export type PlatformEventHandler = (event:{id:string;event_name:string;aggregate_type:string;aggregate_id:string|null;payload:Record<string,unknown>;attempts:number})=>Promise<void>;

export async function processNextPlatformEvent(handler:PlatformEventHandler,maxAttempts=5) {
  const event=await claimNextPlatformEvent(maxAttempts);
  if(!event) return null;
  try {
    await handler(event);
    await completePlatformEvent(event.id);
    return {id:event.id,status:'processed'} as const;
  } catch(error) {
    const message=error instanceof Error?error.message:'Unknown event failure';
    const delayMs=Math.min(60_000,2 ** Math.max(0,event.attempts-1)*1_000);
    await failPlatformEvent(event.id,message,new Date(Date.now()+delayMs));
    return {id:event.id,status:'failed',retryAt:new Date(Date.now()+delayMs)} as const;
  }
}
