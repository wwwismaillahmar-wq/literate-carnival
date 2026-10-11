import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AssessmentRunner } from '@/components/academy/AssessmentRunner';

export default async function AcademyAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) notFound();
  return <main className="section"><div className="wrap">
    <Link href="/academy">← العودة إلى الأكاديمية</Link>
    <AssessmentRunner assessmentId={id} />
  </div></main>;
}
