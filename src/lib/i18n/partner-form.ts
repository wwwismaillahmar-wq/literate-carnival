import type { Language } from '@/components/LanguageSelector';

// Values are API identifiers, not translated strings.
export const partnershipTypes = ['supplier', 'training', 'services', 'business', 'employment', 'other'] as const;
type PartnershipType = (typeof partnershipTypes)[number];
type PartnerFormCopy = {
  contactName: string;
  phone: string;
  email: string;
  organizationName: string;
  partnershipType: string;
  message: string;
  types: Record<PartnershipType, string>;
  submit: string;
  saving: string;
  success: string;
  failed: string;
  networkError: string;
};

export const partnerFormCopy: Record<Language, PartnerFormCopy> = {
  ar: {
    contactName: 'اسم جهة الاتصال', phone: 'رقم الهاتف', email: 'البريد الإلكتروني (اختياري)',
    organizationName: 'اسم الشركة أو المؤسسة', partnershipType: 'مجال الشراكة', message: 'تفاصيل الطلب',
    types: {supplier:'توريد', training:'تكوين وتدريب', services:'تنفيذ الخدمات', business:'تعاون تجاري', employment:'فرص عمل وكفاءات', other:'نوع آخر'},
    submit:'إرسال طلب الشراكة', saving:'جارٍ حفظ طلب الشراكة...',
    success:'تم حفظ طلب الشراكة في النظام. رقم الطلب:', failed:'تعذر تسجيل الطلب. لم نعتبره محفوظًا.',
    networkError:'تعذر الاتصال بالنظام؛ لم نتمكن من تأكيد حفظ الطلب.',
  },
  fr: {
    contactName:'Nom du contact', phone:'Téléphone', email:'E-mail (facultatif)',
    organizationName:'Nom de l’entreprise ou organisation', partnershipType:'Type de partenariat', message:'Détails de la demande',
    types:{supplier:'Fourniture', training:'Formation', services:'Prestations de services', business:'Collaboration commerciale', employment:'Emploi et talents', other:'Autre'},
    submit:'Envoyer la demande de partenariat', saving:'Enregistrement de la demande...',
    success:'Demande enregistrée. Numéro de référence :', failed:'Enregistrement impossible. La demande n’est pas confirmée.',
    networkError:'Connexion impossible ; enregistrement non confirmé.',
  },
  en: {
    contactName:'Contact name', phone:'Phone number', email:'Email (optional)',
    organizationName:'Company or organization', partnershipType:'Partnership type', message:'Request details',
    types:{supplier:'Supply', training:'Training', services:'Service delivery', business:'Business collaboration', employment:'Jobs and talent', other:'Other'},
    submit:'Send partnership request', saving:'Saving partnership request...',
    success:'Partnership request saved. Reference:', failed:'Unable to save the request. It has not been confirmed.',
    networkError:'Connection failed; the request could not be confirmed as saved.',
  },
  es: {
    contactName:'Nombre de contacto', phone:'Teléfono', email:'Correo electrónico (opcional)',
    organizationName:'Empresa u organización', partnershipType:'Tipo de colaboración', message:'Detalles de la solicitud',
    types:{supplier:'Suministro', training:'Formación', services:'Prestación de servicios', business:'Colaboración comercial', employment:'Empleo y talento', other:'Otro'},
    submit:'Enviar solicitud de colaboración', saving:'Guardando la solicitud...',
    success:'Solicitud guardada. Referencia:', failed:'No se pudo guardar la solicitud. No está confirmada.',
    networkError:'Error de conexión; no se pudo confirmar el registro.',
  },
  de: {
    contactName:'Kontaktperson', phone:'Telefonnummer', email:'E-Mail (optional)',
    organizationName:'Unternehmen oder Organisation', partnershipType:'Art der Partnerschaft', message:'Anfragedetails',
    types:{supplier:'Lieferung', training:'Schulung', services:'Dienstleistungen', business:'Geschäftliche Zusammenarbeit', employment:'Stellen und Talente', other:'Sonstiges'},
    submit:'Partnerschaftsanfrage senden', saving:'Anfrage wird gespeichert...',
    success:'Anfrage gespeichert. Referenz:', failed:'Anfrage konnte nicht gespeichert werden. Keine Bestätigung.',
    networkError:'Verbindungsfehler; Speicherung konnte nicht bestätigt werden.',
  },
  pt: {
    contactName:'Nome do contacto', phone:'Telefone', email:'E-mail (opcional)',
    organizationName:'Empresa ou organização', partnershipType:'Tipo de parceria', message:'Detalhes do pedido',
    types:{supplier:'Fornecimento', training:'Formação', services:'Prestação de serviços', business:'Colaboração comercial', employment:'Emprego e talentos', other:'Outro'},
    submit:'Enviar pedido de parceria', saving:'A guardar o pedido...',
    success:'Pedido guardado. Referência:', failed:'Não foi possível guardar o pedido. Sem confirmação.',
    networkError:'Falha de ligação; não foi possível confirmar o registo.',
  },
};
