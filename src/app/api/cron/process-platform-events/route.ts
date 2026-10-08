import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!cronSecret || auth !== 'Bearer ' + cronSecret) return NextResponse.json({ok:false}, {status:401});
  const workerSecret = process.env.ASLAN_M08_WORKER_SECRET;
  if (!workerSecret) return NextResponse.json({ok:false,error:'worker secret missing'}, {status:500});
  const response = await fetch('https://zyenfobyorjfwkdgeube.supabase.co/functions/v1/process-platform-events', {
    method:'POST',
    headers:{'x-aslan-worker-secret':workerSecret},
    cache:'no-store'
  });
  const body = await response.text();
  return new NextResponse(body,{status:response.status,headers:{'content-type':'application/json'}});
}
