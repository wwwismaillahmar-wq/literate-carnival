import { GraduationCap, Clock, Award, BookOpen, MessageCircle } from 'lucide-react';
import { COURSES_DATA } from '../lib/data';
import { whatsappLink } from '../lib/config';

interface AcademySectionProps {
  onRegisterInterest: (courseTitle: string) => void;
}

export function AcademySection({ onRegisterInterest }: AcademySectionProps) {
  return (
    <section id="courses" className="py-20 border-b border-[#c5a059]/20 bg-[#14181b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c5a059] tracking-widest uppercase mb-1">
              <GraduationCap className="w-4 h-4" />
              <span>ACADEMY & TRAINING</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#f5f2ea]">
              أكاديمية ASLAN للتكوين الحرفي والتقني
            </h2>
          </div>
          <div className="text-xs text-[#a8abad] max-w-sm">
            برامج تطبيقية مكنت المئات من المتدربين من ولوج سوق العمل وتأسيس ورشاتهم المستقلة
          </div>
        </div>

        {/* Overview Banner Card */}
        <div className="p-6 md:p-8 rounded-2xl bg-[#171b1e] border border-[#c5a059]/30 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h3 className="text-xl font-bold text-[#c5a059]">منصة التكوين المهني التطبيقي</h3>
            <p className="text-xs sm:text-sm text-[#a8abad] leading-relaxed">
              نبدأ بدورات تطبيقية وإلكترونية منظمة، مع مرافقة تقنية مستمرة لتمكين المتدرب من إتقان أسرار الصنعة، استخدام أحدث المعدات، والحصول على شهادة كفاءة مهنية.
            </p>
          </div>
          <a
            href={whatsappLink('مرحباً ASLAN MODELLING، أود الاستفسار عن مواعيد وباقات الدورات التكوينية.')}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-full bg-[#c5a059] text-[#111417] font-bold text-xs hover:bg-[#d6b36e] transition-all whitespace-nowrap self-start md:self-auto flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>سجل اهتمامك في الدورة القادمة</span>
          </a>
        </div>

        {/* 4 Courses Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {COURSES_DATA.map((course) => (
            <div
              key={course.id}
              className="p-6 sm:p-7 rounded-2xl bg-[#171b1e] border border-white/10 hover:border-[#c5a059]/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20">
                    {course.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-[#a8abad]">
                    <Clock className="w-3.5 h-3.5 text-[#c5a059]" />
                    <span>{course.duration}</span>
                  </div>
                </div>

                <h4 className="text-lg font-bold text-[#f5f2ea] mb-2">{course.title}</h4>
                <p className="text-xs text-[#a8abad] leading-relaxed mb-4">{course.description}</p>

                {/* Modules */}
                <div className="bg-[#111417] rounded-xl p-4 border border-white/5 mb-6">
                  <span className="text-[11px] font-bold text-[#c5a059] block mb-2">محاور البرنامج:</span>
                  <ul className="space-y-1.5 text-xs text-[#f5f2ea]/80">
                    {course.modules.map((m, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-[#a8abad]">
                  <Award className="w-4 h-4 text-[#c5a059]" />
                  <span>شهادة مشاركة تطبيقية</span>
                </div>
                <button
                  onClick={() => onRegisterInterest(course.title)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-[#c5a059] text-[#c5a059] hover:bg-[#c5a059] hover:text-[#111417] transition-all"
                >
                  حجز مقعد
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
