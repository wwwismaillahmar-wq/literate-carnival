import { useState } from 'react';
import { Menu, X, ShieldCheck, MessageCircle, Phone } from 'lucide-react';
import { site, whatsappLink, phoneLink } from '../lib/config';

interface NavbarProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  onOpenAudit: () => void;
}

export function Navbar({ activeSection, onNavigate, onOpenAudit }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'products', label: 'المنتجات' },
    { id: 'services', label: 'الخدمات' },
    { id: 'courses', label: 'الأكاديمية' },
    { id: 'partners', label: 'الشركاء' },
    { id: 'gallery', label: 'الأعمال' },
    { id: 'contact', label: 'التواصل' },
  ];

  const handleLinkClick = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#111417]/95 backdrop-blur-md border-b border-[#c5a059]/20 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleLinkClick('home')}
              className="text-right flex flex-col focus:outline-none group"
            >
              <span className="text-2xl font-extrabold tracking-wider text-[#c5a059] font-latin-display group-hover:text-[#d6b36e] transition-colors">
                ASLAN
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#a8abad] -mt-1 font-sans">
                modelling
              </span>
            </button>
            <div className="hidden lg:block h-6 w-[1px] bg-[#c5a059]/30 mx-2" />
            <span className="hidden lg:inline text-xs text-[#a8abad] font-medium">
              {site.tagline}
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {links.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleLinkClick(link.id)}
                  className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'text-[#c5a059] bg-[#c5a059]/10'
                      : 'text-[#f5f2ea] hover:text-[#c5a059] hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Repo Audit Button */}
            <button
              onClick={onOpenAudit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#c5a059] border border-[#c5a059]/40 bg-[#c5a059]/5 hover:bg-[#c5a059]/15 rounded-full transition-all"
              title="التحقق من صحة بيانات المستودع والمرفقات"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>فحص المستودع والمرفقات</span>
            </button>

            {/* Direct WhatsApp Call */}
            <a
              href={whatsappLink('مرحباً ASLAN MODELLING، أود الاستفسار عن المنتجات والخدمات.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#c5a059] text-[#111417] hover:bg-[#d6b36e] rounded-full transition-all shadow-md shadow-[#c5a059]/15"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>تواصل فوري</span>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenAudit}
              className="p-2 text-[#c5a059] hover:bg-white/5 rounded-lg"
              title="فحص المستودع"
            >
              <ShieldCheck className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-[#f5f2ea] hover:text-[#c5a059] focus:outline-none"
              aria-label="القائمة"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-b border-[#c5a059]/20 bg-[#171b1e] px-4 pt-2 pb-6 space-y-2">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => handleLinkClick(link.id)}
              className={`w-full text-right px-4 py-2.5 rounded-lg text-sm font-bold ${
                activeSection === link.id
                  ? 'bg-[#c5a059]/15 text-[#c5a059]'
                  : 'text-[#f5f2ea] hover:bg-white/5'
              }`}
            >
              {link.label}
            </button>
          ))}

          <div className="pt-4 mt-2 border-t border-white/10 flex flex-col gap-2">
            <button
              onClick={() => {
                onOpenAudit();
                setMobileOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#c5a059]/40 text-[#c5a059] text-xs font-bold"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>تقرير فحص المستودع والمرفقات</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={whatsappLink('مرحباً ASLAN MODELLING')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#25d366] text-black text-xs font-bold"
              >
                <MessageCircle className="w-4 h-4" />
                <span>واتساب</span>
              </a>
              <a
                href={phoneLink()}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#c5a059] text-[#111417] text-xs font-bold"
              >
                <Phone className="w-4 h-4" />
                <span>اتصال هاتف</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
