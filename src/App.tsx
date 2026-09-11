import { useState, useEffect } from 'react';
import { CinematicIntro } from './components/CinematicIntro';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ProductGrid } from './components/ProductGrid';
import { ServicesSection } from './components/ServicesSection';
import { AcademySection } from './components/AcademySection';
import { PartnersPortal } from './components/PartnersPortal';
import { WorkGallery } from './components/WorkGallery';
import { ContactForm } from './components/ContactForm';
import { RepoAuditModal } from './components/RepoAuditModal';
import { Footer } from './components/Footer';
import { WhatsAppButton } from './components/WhatsAppButton';
import { INITIAL_PRODUCTS } from './lib/data';

export function App() {
  const [activeSection, setActiveSection] = useState<string>('home');
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [contactInitialType, setContactInitialType] = useState('طلب منتج');
  const [contactInitialMessage, setContactInitialMessage] = useState('');

  // Handle section scrolling
  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Pre-fill contact form when clicking a service or course
  const handleSelectServiceForContact = (serviceTitle: string) => {
    setContactInitialType('طلب خدمة');
    setContactInitialMessage(`أود الاستفسار وطلب دراسة لمشروع: ${serviceTitle}`);
    scrollToSection('contact');
  };

  const handleRegisterCourseInterest = (courseTitle: string) => {
    setContactInitialType('دورة تكوينية');
    setContactInitialMessage(`أود التسجيل والاستفسار عن مقاعد دورة: ${courseTitle}`);
    scrollToSection('contact');
  };

  const handleApplyPartner = () => {
    setContactInitialType('طلب شراكة');
    setContactInitialMessage('أود تقديم طلب شراكة وتزويدكم ببيانات ورشتنا/مؤسستنا.');
    scrollToSection('contact');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#111417] text-[#f5f2ea] font-sans selection:bg-[#c5a059]/30 selection:text-[#c5a059]" dir="rtl">
      {/* Cinematic Luxury Intro */}
      <CinematicIntro />

      {/* Main Sticky Navbar */}
      <Navbar
        activeSection={activeSection}
        onNavigate={scrollToSection}
        onOpenAudit={() => setAuditModalOpen(true)}
      />

      {/* Main Content Sections */}
      <main className="flex-1">
        <HeroSection
          onNavigate={scrollToSection}
          onOpenAudit={() => setAuditModalOpen(true)}
        />

        <ProductGrid
          products={INITIAL_PRODUCTS}
          onSelectProduct={(product) => {
            setContactInitialType('طلب منتج');
            setContactInitialMessage(`أود طلب واستفسار عن المنتج: ${product.name}`);
            scrollToSection('contact');
          }}
        />

        <ServicesSection
          onSelectServiceForContact={handleSelectServiceForContact}
        />

        <AcademySection
          onRegisterInterest={handleRegisterCourseInterest}
        />

        <PartnersPortal
          onApplyPartner={handleApplyPartner}
        />

        <WorkGallery />

        <ContactForm
          initialType={contactInitialType}
          initialMessage={contactInitialMessage}
        />
      </main>

      {/* Footer */}
      <Footer
        onNavigate={scrollToSection}
        onOpenAudit={() => setAuditModalOpen(true)}
      />

      {/* Floating WhatsApp Action */}
      <WhatsAppButton />

      {/* Interactive Repository Audit & Verification Modal */}
      <RepoAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
      />
    </div>
  );
}

export default App;
