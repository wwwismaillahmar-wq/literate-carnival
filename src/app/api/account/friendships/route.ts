import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const allowedStatuses = new Set(['pending', 'accepted', 'rejected', 'cancelled', 'blocked']);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status, created_at, updated_at, accepted_at')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'تعذر تحميل علاقات الصداقة.' }, { status: 500 });
  }

  return NextResponse.json({ friendships: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });
    }

    const body = await request.json();
    const addresseeId = typeof body.addresseeId === 'string' ? body.addresseeId.trim() : '';

    if (!addresseeId || addresseeId === user.id) {
      return NextResponse.json({ error: 'المستخدم المستهدف غير صالح.' }, { status: 400 });
    }

    const { data: existing, error: lookupError } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${user.id})`,
      )
      .in('status', ['pending', 'accepted', 'blocked'])
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({ error: 'تعذر التحقق من علاقة الصداقة.' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(
        { error: 'توجد علاقة صداقة نشطة أو طلب قائم بين الحسابين.', friendship: existing },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from('friendships')
      .insert({
        requester_id: user.id,
        addressee_id: addresseeId,
        status: 'pending',
      })
      .select('id, requester_id, addressee_id, status, created_at, updated_at, accepted_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'تعذر إرسال طلب الصداقة.' }, { status: 500 });
    }

    return NextResponse.json({ friendship: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة طلب الصداقة.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });
    }

    const body = await request.json();
    const friendshipId = typeof body.friendshipId === 'string' ? body.friendshipId.trim() : '';
    const status = typeof body.status === 'string' ? body.status : '';

    if (!friendshipId || !allowedStatuses.has(status)) {
      return NextResponse.json({ error: 'بيانات علاقة الصداقة غير صالحة.' }, { status: 400 });
    }

    const { data: friendship, error: readError } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .eq('id', friendshipId)
      .single();

    if (readError || !friendship) {
      return NextResponse.json({ error: 'علاقة الصداقة غير موجودة.' }, { status: 404 });
    }

    const isRequester = friendship.requester_id === user.id;
    const isAddressee = friendship.addressee_id === user.id;

    if (!isRequester && !isAddressee) {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل هذه العلاقة.' }, { status: 403 });
    }

    const validTransition =
      (status === 'accepted' && isAddressee && friendship.status === 'pending') ||
      (status === 'rejected' && isAddressee && friendship.status === 'pending') ||
      (status === 'cancelled' && isRequester && friendship.status === 'pending') ||
      (status === 'blocked' && (isRequester || isAddressee) && friendship.status !== 'rejected' && friendship.status !== 'cancelled');

    if (!validTransition) {
      return NextResponse.json({ error: 'انتقال حالة الصداقة غير مسموح.' }, { status: 409 });
    }

    const update = {
      status,
      accepted_at: status === 'accepted' ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from('friendships')
      .update(update)
      .eq('id', friendshipId)
      .select('id, requester_id, addressee_id, status, created_at, updated_at, accepted_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'تعذر تحديث علاقة الصداقة.' }, { status: 500 });
    }

    return NextResponse.json({ friendship: data });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة علاقة الصداقة.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });
    }

    const body = await request.json();
    const friendshipId = typeof body.friendshipId === 'string' ? body.friendshipId.trim() : '';

    if (!friendshipId) {
      return NextResponse.json({ error: 'معرّف علاقة الصداقة مطلوب.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) {
      return NextResponse.json({ error: 'تعذر إزالة علاقة الصداقة.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة إزالة الصداقة.' }, { status: 400 });
  }
}
