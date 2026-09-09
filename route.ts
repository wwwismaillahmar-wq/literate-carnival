import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const allowedTypes = new Set([
  'طلب منتج',
  'طلب خدمة',
  'دورة تكوينية',
  'طلب شراكة',
  'استعلام',
  'شكوى / اقتراح',
]);

const classifications = ['hot_lead', 'warm_lead', 'normal', 'complaint', 'inquiry'] as const;
const priorities = ['high', 'medium', 'low'] as const;

type LeadInput = {
  name?: unknown;
  phone?: unknown;
  type?: unknown;
  message?: unknown;
};

type Classification = {
  classification: (typeof classifications)[number];
  priority: (typeof priorities)[number];
  reason: string;
};

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function isClassification(value: unknown): value is Classification {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.reason === 'string' &&
    classifications.includes(candidate.classification as Classification['classification']) &&
    priorities.includes(candidate.priority as Classification['priority'])
  );
}

async function classifyLead(input: Required<LeadInput>): Promise<Classification | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content:
              'أنت مساعد داخلي لـ ASLAN MODELLING. صنّف طلب العميل فقط إلى: hot_lead, warm_lead, normal, complaint, inquiry. أعد JSON بالمفاتيح classification, priority, reason. لا تضف بيانات شخصية جديدة ولا تغيّر محتوى العميل.',
          },
          {
            role: 'user',
            content: JSON.stringify(input),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'aslan_lead_classification',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                classification: { type: 'string', enum: [...classifications] },
                priority: { type: 'string', enum: [...priorities] },
                reason: { type: 'string', maxLength: 240 },
              },
              required: ['classification', 'priority', 'reason'],
            },
          },
        },
        max_output_tokens: 220,
      }),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      console.error('OpenAI classification failed:', upstream.status);
      return null;
    }

    const result = (await upstream.json()) as { output_text?: unknown };
    if (typeof result.output_text !== 'string') return null;

    const parsed: unknown = JSON.parse(result.output_text);
    return isClassification(parsed) ? parsed : null;
  } catch (error) {
    console.error('OpenAI classification request failed:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  let body: LeadInput;
  try {
    body = (await request.json()) as LeadInput;
  } catch {
    return NextResponse.json({ error: 'بيانات الطلب غير صالحة.' }, { status: 400 });
  }

  const lead = {
    name: clean(body.name, 120),
    phone: clean(body.phone, 30),
    type: clean(body.type, 50),
    message: clean(body.message, 4000),
  };

  if (
    lead.name.length < 2 ||
    lead.phone.length < 6 ||
    lead.message.length < 5 ||
    !allowedTypes.has(lead.type)
  ) {
    return NextResponse.json({ error: 'بيانات الطلب ناقصة أو غير صالحة.' }, { status: 400 });
  }

  const aiClassification = await classifyLead(lead);
  const db = await createClient();
  const { error } = await db.from('leads').insert({
    type: lead.type,
    name: lead.name,
    phone: lead.phone,
    message: lead.message,
    metadata: {
      source: 'website_contact',
      ai_classification: aiClassification,
    },
  });

  if (error) {
    console.error('lead insert failed:', error.message);
    return NextResponse.json({ error: 'تعذر تسجيل الطلب في النظام.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ai_enabled: Boolean(process.env.OPENAI_API_KEY),
    classification: aiClassification,
  });
}
