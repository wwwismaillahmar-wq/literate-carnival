import { whatsappLink } from '@/lib/config';

export function WhatsAppButton() {
  return (
    <a
      href={whatsappLink('مرحباً ASLAN MODELLING، أريد الاستفسار عن خدماتكم.')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      style={{ position: 'fixed', left: 20, bottom: 20, zIndex: 90, width: 56, height: 56, borderRadius: '50%', background: '#25d366', color: '#07170c', display: 'grid', placeItems: 'center', fontWeight: 900 }}
    >
      WA
    </a>
  );
}
