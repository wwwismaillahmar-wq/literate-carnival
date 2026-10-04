import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

  const { data, error } = await supabase
    .from('conversations')
    .select('id, participant_a, participant_b, created_at, updated_at')
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'تعذر تحميل المحادثات.' }, { status: 500 });

  const otherIds=[...new Set((data??[]).map(item=>item.participant_a===user.id?item.participant_b:item.participant_a))];
  const accepted=new Set<string>();
  if(otherIds.length){
    const {data:friends}=await supabase.from('friendships').select('requester_id,addressee_id').eq('status','accepted').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    for(const f of friends??[]){accepted.add(f.requester_id===user.id?f.addressee_id:f.requester_id);}
  }
  return NextResponse.json({ conversations:(data??[]).filter(item=>accepted.has(item.participant_a===user.id?item.participant_b:item.participant_a)) });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

    const body = await request.json();
    const participantId = typeof body.participantId === 'string' ? body.participantId.trim() : '';

    if (!participantId || participantId === user.id) {
      return NextResponse.json({ error: 'المستخدم المستهدف غير صالح.' }, { status: 400 });
    }

    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .select('id')
      .eq('status', 'accepted')
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${participantId}),and(requester_id.eq.${participantId},addressee_id.eq.${user.id})`,
      )
      .limit(1)
      .maybeSingle();

    if (friendshipError) {
      return NextResponse.json({ error: 'تعذر التحقق من الصداقة.' }, { status: 500 });
    }
    if (!friendship) {
      return NextResponse.json({ error: 'لا يمكن بدء محادثة إلا مع صديق مقبول.' }, { status: 403 });
    }

    const [a, b] = [user.id, participantId].sort();

    const { data: existing } = await supabase
      .from('conversations')
      .select('id, participant_a, participant_b, created_at, updated_at')
      .eq('participant_a', a)
      .eq('participant_b', b)
      .maybeSingle();

    if (existing) return NextResponse.json({ conversation: existing });

    const { data, error } = await supabase
      .from('conversations')
      .insert({ participant_a: a, participant_b: b })
      .select('id, participant_a, participant_b, created_at, updated_at')
      .single();

    if (error) return NextResponse.json({ error: 'تعذر إنشاء المحادثة.' }, { status: 500 });
    return NextResponse.json({ conversation: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة المحادثة.' }, { status: 400 });
  }
}
