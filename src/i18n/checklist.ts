import type { Language } from "~/i18n";
import type { Checklist, Section, Sections } from "~/types/PSC";

type ChecklistTranslation = {
  point?: string;
  details?: string;
};

type SectionTranslation = {
  title?: string;
  description?: string;
  intro?: string;
  items?: Record<string, ChecklistTranslation>;
};

const makeItemId = (point: string) => point.toLowerCase().replace(/\s+/g, "-");

const trSections: Record<string, SectionTranslation> = {
  authentication: {
    title: "Kimlik Doğrulama",
    description: "Çevrimiçi hesap giriş bilgilerini güvenceye alma",
    intro:
      "Güçlü, benzersiz parolalar kullan; bunları güvenli bir parola yöneticisinde sakla; mümkün olduğunda passkey veya güçlü MFA etkinleştir; veri ihlallerini takip et ve giriş yaparken dikkatli davran.",
  },
  "web-browsing": {
    title: "Web Gezintisi",
    description: "İnternette takip, sansür ve veri toplamayı azaltma",
    intro:
      "Web siteleri davranışlarını izleyebilir, profil çıkarabilir ve gereksiz veri toplayabilir. Tarayıcı ayarları, eklentiler, DNS, VPN/Tor ve güvenli alışkanlıklar bu riski azaltır.",
  },
  email: {
    title: "E-posta",
    description: "Çevrimiçi hesaplarının giriş kapısını koruma",
    intro:
      "E-posta hesabın parola sıfırlama, bildirim ve kimlik doğrulama akışlarında merkezi rol oynar. Bu yüzden e-posta güvenliği diğer hesapların güvenliğini de belirler.",
  },
  messaging: {
    title: "Mesajlaşma",
    description: "Özel konuşmaları ve iletişim kanallarını koruma",
    intro:
      "Mesajlaşma uygulamaları hem özel bilgileri hem de sosyal mühendislik girişimlerini taşır. Uçtan uca şifreleme, cihaz güvenliği ve kimlik doğrulama önemlidir.",
  },
  "social-media": {
    title: "Sosyal Medya",
    description: "Hesap ele geçirme, takip ve aşırı veri paylaşımını azaltma",
    intro:
      "Sosyal medya profilleri kimlik, ilişki, konum ve alışkanlık bilgisi açığa çıkarabilir. Gizlilik ayarlarını sıkılaştırmak ve hesap güvenliğini güçlendirmek gerekir.",
  },
  networks: {
    title: "Ağlar",
    description: "Ev ağı, Wi-Fi ve bağlantı güvenliğini güçlendirme",
    intro:
      "Yönlendirici, Wi-Fi ve DNS ayarları tüm cihazlarının güvenliğini etkiler. Güçlü parola, güncel firmware ve güvenli ağ yapılandırması temel savunmadır.",
  },
  "mobile-devices": {
    title: "Mobil Cihazlar",
    description: "Telefon ve tabletlerde veri, hesap ve cihaz güvenliği",
    intro:
      "Telefonun hesaplarına, mesajlarına, fotoğraflarına ve MFA kodlarına erişir. Kilit ekranı, güncellemeler, uygulama izinleri ve kayıp cihaz planı kritik önemdedir.",
  },
  "personal-computers": {
    title: "Kişisel Bilgisayarlar",
    description: "Masaüstü ve dizüstü cihazları güvenli tutma",
    intro:
      "Bilgisayarın parolalara, dosyalara, tarayıcı oturumlarına ve geliştirici araçlarına erişebilir. Güncelleme, disk şifreleme, yedek ve zararlı yazılım önlemleri gerekir.",
  },
  "smart-home": {
    title: "Akıllı Ev",
    description: "IoT ve ev otomasyon cihazlarını güvenli kullanma",
    intro:
      "Akıllı ev cihazları kamera, mikrofon, konum ve ağ erişimi taşıyabilir. Varsayılan parolaları değiştirmek, güncellemek ve ayrı ağ kullanmak riski azaltır.",
  },
  "personal-finance": {
    title: "Kişisel Finans",
    description: "Bankacılık, ödeme ve finansal hesapları koruma",
    intro:
      "Finansal hesaplar doğrudan para kaybı ve kimlik hırsızlığı riski taşır. Güçlü MFA, bildirimler, sanal kartlar ve düzenli kontrol büyük fark yaratır.",
  },
  "human-aspect": {
    title: "İnsan Faktörü",
    description: "Dolandırıcılık, sosyal mühendislik ve gündelik güvenlik alışkanlıkları",
    intro:
      "Birçok saldırı teknik açıklardan çok insan davranışını hedefler. Acele ettiren, korkutan veya yetki iddiası taşıyan taleplerde durup doğrulamak gerekir.",
  },
  "physical-security": {
    title: "Fiziksel Güvenlik",
    description: "Gerçek dünyadaki cihaz ve veri risklerini azaltma",
    intro:
      "Fiziksel erişim; güçlü parola, şifreleme ve çevrimiçi güvenlik önlemlerini zayıflatabilir. Cihazları, belgeleri ve kişisel alanları korumak dijital güvenliğin parçasıdır.",
  },
  "passkeys-and-mfa": {
    title: "Passkey ve MFA",
    description: "Kimlik avına dayanıklı modern giriş koruması seçme",
    intro:
      "Modern hesap saldırıları zayıf parola, SMS kodu ve beklenmedik onay bildirimlerini hedefler. Mümkün olduğunda passkey ve donanım destekli kimlik doğrulayıcıları tercih et.",
    items: {
      "prefer-passkeys-for-critical-accounts": {
        point: "Kritik Hesaplarda Passkey Kullan",
        details:
          "Birincil e-posta, parola yöneticisi, bankacılık, bulut, geliştirici ve sosyal hesaplarda destekleniyorsa passkey etkinleştir. Passkey, girişi gerçek servise kriptografik olarak bağladığı için klasik kimlik avını ciddi biçimde zorlaştırır.",
      },
      "keep-passwords-unique-even-when-using-passkeys": {
        point: "Passkey Kullanırken Bile Parolaları Benzersiz Tut",
        details:
          "Passkey parola kullanımını azaltır, ancak birçok servis parola veya kurtarma akışını açık tutar. Servis parola girişini tamamen kaldırmana izin verene kadar güçlü ve benzersiz parolayı parola yöneticisinde sakla.",
      },
      "register-two-strong-authenticators": {
        point: "İki Güçlü Kimlik Doğrulayıcı Kaydet",
        details:
          "Kritik hesaplarda en az iki passkey veya güvenlik anahtarı kaydet: biri günlük kullanım, biri güvenli yerde yedek. Kayıt sonrası ikisini de test et.",
      },
      "use-hardware-security-keys-for-highest-risk-accounts": {
        point: "En Riskli Hesaplarda Donanım Güvenlik Anahtarı Kullan",
        details:
          "Para, altyapı, kimlik veya hassas dosyaları koruyan hesaplarda FIDO2/WebAuthn güvenlik anahtarı düşün. E-posta, parola yöneticisi, bulut yönetimi, domain kayıt ve geliştirici hesapları için çok değerlidir.",
      },
      "avoid-sms-and-email-codes-when-better-options-exist": {
        point: "Daha İyi Seçenek Varken SMS ve E-posta Kodlarından Kaçın",
        details:
          "SMS ve e-posta kodları hiç ikinci faktör olmamasından iyidir, ancak SIM swap, posta kutusu ele geçirme ve sosyal mühendisliğe daha açıktır. Passkey, güvenlik anahtarı veya doğrulayıcı uygulama kodlarını tercih et.",
      },
      "never-enter-device-codes-from-unexpected-messages": {
        point: "Beklenmedik Mesajlardaki Cihaz Kodlarını Asla Girme",
        details:
          "Bazı saldırılar seni gerçek Microsoft, Google veya benzeri giriş sayfasına kod girmeye yönlendirir. Sadece kendi başlattığın ve önündeki cihazda yaptığın girişler için cihaz kodu gir.",
      },
      "review-active-sessions-monthly": {
        point: "Aktif Oturumları Aylık Kontrol Et",
        details:
          "Önemli hesaplarda aktif oturumları ve giriş yapılmış cihazları kontrol et. Tanımadığın cihazları kaldır, eski uygulama parolalarını iptal et ve kayıp/satılmış/paylaşılan cihazlardan çıkış yap.",
      },
      "document-your-authentication-map": {
        point: "Kimlik Doğrulama Haritanı Belgele",
        details:
          "Hangi hesapta passkey, güvenlik anahtarı, doğrulayıcı uygulama, kurtarma e-postası ve yedek kod olduğunu özel bir notta tut. Gizli değerleri değil, hangi yöntemin nerede kullanıldığını kaydet.",
      },
    },
  },
  "account-recovery": {
    title: "Hesap Kurtarma",
    description: "Saldırganların sık kullandığı yedek yolları koruma",
    intro:
      "Hesap kurtarma yolu çoğu zaman ana girişten daha zayıftır. Kurtarma e-postası, telefon numarası, yedek kod, güvenlik sorusu ve eski cihazları düzenli kontrol et.",
    items: {
      "protect-your-primary-email-first": { point: "Önce Birincil E-postanı Koru" },
      "harden-your-password-manager-recovery": { point: "Parola Yöneticisi Kurtarmasını Güçlendir" },
      "store-backup-codes-offline": { point: "Yedek Kodları Çevrimdışı Sakla" },
      "remove-old-phone-numbers": { point: "Eski Telefon Numaralarını Kaldır" },
      "use-random-answers-for-security-questions": { point: "Güvenlik Sorularına Rastgele Cevaplar Kullan" },
      "create-an-emergency-access-plan": { point: "Acil Erişim Planı Hazırla" },
      "revoke-lost-devices-immediately": { point: "Kayıp Cihazları Hemen Yetkisizleştir" },
      "check-recovery-paths-after-major-breaches": { point: "Büyük İhlallerden Sonra Kurtarma Yollarını Kontrol Et" },
    },
  },
  "scam-defense": {
    title: "Dolandırıcılık Savunması",
    description: "Kimlik avı, AI taklidi ve sosyal mühendisliğe direnme",
    intro:
      "Birçok modern saldırı acele, otorite, korku veya merak duygusunu kullanır. Duraklamak, doğrulamak ve kod/para/erişim taleplerini bağımsız kanaldan kontrol etmek en iyi savunmadır.",
    items: {
      "slow-down-urgent-requests": { point: "Acil Taleplerde Yavaşla" },
      "verify-through-a-known-channel": { point: "Bilinen Bir Kanaldan Doğrula" },
      "use-a-family-or-team-verification-phrase": { point: "Aile veya Ekip Doğrulama Cümlesi Kullan" },
      "never-share-one-time-codes": { point: "Tek Kullanımlık Kodları Asla Paylaşma" },
      "treat-qr-codes-like-links": { point: "QR Kodlarını Link Gibi Değerlendir" },
      "do-not-install-remote-access-tools-on-demand": { point: "İstenince Uzaktan Erişim Aracı Kurma" },
      "watch-for-copy-paste-command-scams": { point: "Kopyala-Yapıştır Komut Dolandırıcılıklarına Dikkat Et" },
      "keep-a-scam-log": { point: "Dolandırıcılık Denemelerini Kaydet" },
    },
  },
  "incident-playbooks": {
    title: "Olay Müdahale Planları",
    description: "Yaygın güvenlik acillerinde ilk adımlar",
    intro:
      "Bir olay anında amaç hasarı sınırlamak, kanıtı korumak, hesabı geri almak ve suistimal edilen zayıf noktayı güçlendirmektir.",
    items: {
      "email-account-compromised": { point: "E-posta Hesabı Ele Geçirildi" },
      "phone-lost-or-stolen": { point: "Telefon Kayboldu veya Çalındı" },
      "bank-or-card-fraud-suspected": { point: "Banka veya Kart Dolandırıcılığı Şüphesi" },
      "identity-theft-suspected": { point: "Kimlik Hırsızlığı Şüphesi" },
      "social-media-account-taken-over": { point: "Sosyal Medya Hesabı Ele Geçirildi" },
      "malware-suspected-on-a-computer": { point: "Bilgisayarda Zararlı Yazılım Şüphesi" },
      "password-manager-exposed": { point: "Parola Yöneticisi Açığa Çıktı" },
      "preserve-evidence-before-cleaning-up": { point: "Temizlemeden Önce Kanıtı Koru" },
    },
  },
  "monthly-maintenance": {
    title: "Aylık Bakım",
    description: "Korumanın güncel kalması için tekrar eden rutin",
    intro:
      "Güvenlik zamanla sessizce zayıflar: cihazlar güncelleme kaçırır, oturumlar açık kalır, eklentiler birikir. Kısa bir aylık rutin büyük fark yaratır.",
    items: {
      "update-devices-and-browsers": { point: "Cihazları ve Tarayıcıları Güncelle" },
      "review-password-manager-health": { point: "Parola Yöneticisi Sağlığını Kontrol Et" },
      "clean-browser-extensions": { point: "Tarayıcı Eklentilerini Temizle" },
      "check-cloud-sharing-links": { point: "Bulut Paylaşım Linklerini Kontrol Et" },
      "test-backups": { point: "Yedekleri Test Et" },
      "review-connected-apps": { point: "Bağlı Uygulamaları Gözden Geçir" },
      "check-financial-and-identity-alerts": { point: "Finansal ve Kimlik Uyarılarını Kontrol Et" },
      "refresh-your-top-five-risks": { point: "En Önemli Beş Riskini Yenile" },
    },
  },
  "identity-protection": {
    title: "Kimlik Koruma",
    description: "Kimlik hırsızlığı ve veri açığa çıkmasından doğan zararı azaltma",
    intro:
      "Kimlik koruma, saldırganların senin adına işlem yapmasını zorlaştırmak ve kişisel veri açığa çıktığında hızlı yanıt vermekle ilgilidir.",
    items: {
      "freeze-credit-where-available": { point: "Mümkünse Kredi Kaydını Dondur" },
      "enable-financial-alerts": { point: "Finansal Uyarıları Aç" },
      "use-virtual-cards-for-risky-merchants": { point: "Riskli Satıcılarda Sanal Kart Kullan" },
      "separate-public-and-private-contact-details": { point: "Açık ve Özel İletişim Bilgilerini Ayır" },
      "remove-data-broker-profiles": { point: "Veri Aracısı Profillerini Kaldır" },
      "protect-tax-and-government-accounts": { point: "Vergi ve Resmi Hesapları Koru" },
      "watermark-sensitive-document-uploads": { point: "Hassas Belge Yüklemelerine Filigran Ekle" },
      "keep-an-identity-recovery-folder": { point: "Kimlik Kurtarma Dosyası Tut" },
    },
  },
};

const translations: Record<Language, Partial<Record<string, SectionTranslation>>> = {
  en: {},
  tr: trSections,
};

const localizeItem = (item: Checklist, sectionTranslation?: SectionTranslation): Checklist => {
  const id = item.id || makeItemId(item.point);
  const translated = sectionTranslation?.items?.[id];
  return {
    ...item,
    id,
    ...translated,
  };
};

const localizeSection = (section: Section, language: Language): Section => {
  const sectionTranslation = translations[language][section.slug];
  return {
    ...section,
    title: sectionTranslation?.title || section.title,
    description: sectionTranslation?.description || section.description,
    intro: sectionTranslation?.intro || section.intro,
    checklist: section.checklist.map((item) => localizeItem(item, sectionTranslation)),
  };
};

export const localizeSections = (sections: Sections, language: Language): Sections => {
  return sections.map((section) => localizeSection(section, language));
};
