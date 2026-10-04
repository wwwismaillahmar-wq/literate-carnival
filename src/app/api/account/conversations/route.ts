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

  const visible=data??[];
  const otherIds=visible.map(item=>item.participant_a===user.id?item.participant_b:item.participant_a);
  const {data:profiles}=otherIds.length?await supabase.from('profiles').select('id,full_name,username,avatar_path,role').in('id',otherIds):{data:[]};
  const profileMap=new Map((profiles??[]).map(p=>[p.id,p]));
  const conversations=[];
  for(const item of visible){
    const otherId=item.participant_a===user.id?item.participant_b:item.participant_a;
    const other=profileMap.get(otherId);
    let avatar_url=null;
    if(other?.avatar_path){const s=await supabase.storage.from('aslan-media').createSignedUrl(other.avatar_path,3600);avatar_url=s.data?.signedUrl??null;}
    const {data:last}=await supabase.from('messages').select('id,body,created_at,read_at,sender_id').eq('conversation_id',item.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
    conversations.push({...item,other,avatar_url,last_message:last??null,unread:!!last&&last.sender_id!==user.id&&!last.read_at});
  }
  return NextResponse.json({ conversations });
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

    const { data: target } = await supabase.from('profiles').select('id,message_privacy').eq('id',participantId).maybeSingle();
    if (!target) return NextResponse.json({ error: 'الحساب المستهدف غير موجود.' }, { status: 404 });
    let allowed=target.message_privacy!=='friends' && target.message_privacy!=='none';
    if(target.message_privacy==='friends'){
      const {data:friendship}=await supabase.from('friendships').select('id').eq('status','accepted').or(`and(requester_id.eq.${user.id},addressee_id.eq.${participantId}),and(requester_id.eq.${participantId},addressee_id.eq.${user.id})`).limit(1).maybeSingle();
      allowed=!!friendship;
    }
    if(!allowed) return NextResponse.json({error:'هذا العضو يسمح بالرسائل للأصدقاء فقط.'},{status:403});

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
