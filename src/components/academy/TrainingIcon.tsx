import { BookOpen, Scissors, Sofa, Wind, Wrench, Zap } from 'lucide-react';
import type { AcademyCourse } from '@/lib/academy/catalog';
export function TrainingIcon({ field, size = 28 }: { field: AcademyCourse['field']; size?: number }) {
  const Icon = { upholstery: Sofa, sewing: Scissors, electrical: Zap, cooling: Wind, plumbing: Wrench, general: BookOpen }[field];
  return <Icon size={size} aria-hidden="true" strokeWidth={1.5} />;
}
