import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

  const conversationId = new URL(request.url).searchParams.get('conversationId')?.trim();
  if (!conversationId) return NextResponse.json({ error: 'معرّف المحادثة مطلوب.' }, { status: 400 });

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('id, participant_a, participant_b')
    .eq('id', conversationId)
    .maybeSingle();
  if (conversationError || !conversation || ![conversation.participant_a, conversation.participant_b].includes(user.id)) {
    return NextResponse.json({ error: 'المحادثة غير موجودة أو غير متاحة.' }, { status: 404 });
  }

  const otherId = conversation.participant_a === user.id ? conversation.participant_b : conversation.participant_a;
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .eq('status','accepted')
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${user.id})`)
    .limit(1)
    .maybeSingle();
  if (!friendship) return NextResponse.json({ error: 'المراسلة متاحة فقط بين الأصدقاء المقبولين.' }, { status: 403 });

  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at, read_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'تعذر تحميل الرسائل.' }, { status: 500 });

  const unreadIds=(data??[]).filter(item=>item.sender_id!==user.id && !item.read_at).map(item=>item.id);
  if(unreadIds.length){
    await supabase.from('messages').update({read_at:new Date().toISOString()}).in('id',unreadIds);
  }
  return NextResponse.json({ messages: (data??[]).map(item=>unreadIds.includes(item.id)?{...item,read_at:new Date().toISOString()}:item) });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

    const body = await request.json();
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId.trim() : '';
    const messageBody = typeof body.body === 'string' ? body.body.trim() : '';

    if (!conversationId || !messageBody) {
      return NextResponse.json({ error: 'معرّف المحادثة ونص الرسالة مطلوبان.' }, { status: 400 });
    }
    if (messageBody.length > 5000) {
      return NextResponse.json({ error: 'الرسالة تتجاوز الحد المسموح.' }, { status: 400 });
    }

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .maybeSingle();

    if (conversationError) return NextResponse.json({ error: 'تعذر التحقق من المحادثة.' }, { status: 500 });
    if (!conversation) return NextResponse.json({ error: 'المحادثة غير موجودة أو غير متاحة.' }, { status: 404 });

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: messageBody,
      })
      .select('id, conversation_id, sender_id, body, created_at, read_at')
      .single();

    if (error) return NextResponse.json({ error: 'تعذر إرسال الرسالة.' }, { status: 500 });

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return NextResponse.json({ message: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة الرسالة.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

    const body = await request.json();
    const messageId = typeof body.messageId === 'string' ? body.messageId.trim() : '';

    if (!messageId) return NextResponse.json({ error: 'معرّف الرسالة مطلوب.' }, { status: 400 });

    const { data, error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .select('id, conversation_id, sender_id, body, created_at, read_at')
      .single();

    if (error) return NextResponse.json({ error: 'تعذر تحديث حالة الرسالة.' }, { status: 500 });
    return NextResponse.json({ message: data });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة حالة الرسالة.' }, { status: 400 });
  }
}
