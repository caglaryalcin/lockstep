import { createContextId, useContext } from "@builder.io/qwik";
import type { Signal } from "@builder.io/qwik";
import type { PriorityKey } from "~/types/PSC";

type LanguageMetadata = {
  label: string;
  nativeLabel: string;
};

const en = {
  "nav.checklists": "Checklists",
  "nav.home": "Home",
  "nav.theme": "Theme",
  "nav.settings": "Settings",
  "nav.viewAllPages": "View all pages",
  "auth.eyebrow": "Personal security cockpit",
  "auth.title": "Continue with your own security profile",
  "auth.subtitle": "Keep checklist progress, preferences, and focus areas under a separate local user profile.",
  "auth.panelTitle": "Sign in",
  "auth.panelSubtitle": "Sign in or create an account to keep progress tied to your user.",
  "auth.loginTab": "Sign in",
  "auth.registerTab": "Create account",
  "auth.usernameLabel": "Username",
  "auth.usernamePlaceholder": "example: alex",
  "auth.usernameError": "Username must be at least 3 characters.",
  "auth.nameLabel": "Profile name",
  "auth.namePlaceholder": "Example: Alex",
  "auth.nameError": "Please enter at least 2 characters.",
  "auth.passwordLabel": "Password",
  "auth.passwordPlaceholder": "At least 6 characters",
  "auth.passwordError": "Password must be at least 6 characters.",
  "auth.login": "Sign in",
  "auth.register": "Create account",
  "auth.loginError": "Username or password is incorrect.",
  "auth.registerError": "This username is already taken or cannot be used.",
  "auth.logout": "Sign out",
  "auth.activeUser": "Active user",
  "auth.userScopedData": "Settings and progress are saved for this user.",
  "auth.profile": "Profile",
  "auth.afterLoginTitle": "What happens next?",
  "auth.afterLoginBody": "After sign in, your dashboard opens with progress, priorities, and checklist state saved only for this account.",
  "auth.cardProgress": "Checklist items tracked",
  "auth.cardPrivate": "Server-backed storage",
  "auth.cardProfile": "Account-based progress",
  "userProfile.title": "User Profile",
  "userProfile.subtitle": "Account details and saved progress overview.",
  "userProfile.username": "Username",
  "userProfile.displayName": "Display name",
  "userProfile.createdAt": "Created",
  "userProfile.lastSeen": "Last seen",
  "userProfile.savedProgress": "Saved progress",
  "userProfile.completed": "{{completed}} / {{total}} completed",
  "userProfile.accountSettings": "Account Settings",
  "userProfile.accountSettingsBody": "Change your username or password. Current password is required.",
  "userProfile.currentPassword": "Current password",
  "userProfile.currentPasswordError": "Enter your current password to save changes.",
  "userProfile.newPassword": "New password",
  "userProfile.newPasswordPlaceholder": "Leave blank to keep current password",
  "userProfile.saveAccount": "Save account",
  "userProfile.updateError": "We could not update the account. Check your current password and username.",
  "userProfile.updateSuccess": "Account updated.",
  "settings.title": "Settings",
  "settings.theme": "Theme",
  "settings.language": "Language",
  "settings.data": "Data",
  "settings.deleteAll": "Delete All",
  "settings.close": "Close",
  "settings.confirmDelete": "Are you sure you want to delete all saved data? This will erase your progress.",
  "progress.title": "Your Progress",
  "progress.completed": "You've completed {{completed}} out of {{total}} items",
  "progress.noStatsTitle": "No stats yet",
  "progress.noStatsBody": "You'll see your progress here once you start ticking items off the checklists.",
  "progress.noStatsAction": "Get started by selecting a checklist below.",
  "progress.chartLabel": "Progress by checklist category and priority",
  "progress.sectionTip": "Completed {{percent}}% of {{total}} items.",
  "priority.basic": "Basic",
  "priority.essential": "Essential",
  "priority.recommended": "Recommended",
  "priority.optional": "Optional",
  "priority.advanced": "Advanced",
  "priorityActions.title": "Priority Actions",
  "priorityActions.subtitle": "Highest-impact unfinished items across your checklist.",
  "priorityActions.all": "All Checklists",
  "profile.title": "Security Profile",
  "profile.suggested": "Suggested Focus",
  "profile.areas": "{{count}} Areas",
  "profile.device": "Device",
  "profile.risk": "Risk",
  "profile.focus": "Focus",
  "profile.mixed": "Mixed",
  "profile.mobile": "Mobile",
  "profile.desktop": "Desktop",
  "profile.normal": "Normal",
  "profile.elevated": "Elevated",
  "profile.high": "High Risk",
  "profile.accounts": "Accounts",
  "profile.privacy": "Privacy",
  "profile.money": "Money",
  "common.items": "{{count}} items",
  "common.done": "Done",
  "common.notStarted": "Not yet started",
  "common.impact": "Impact",
  "common.effort": "Effort",
  "common.high": "High",
  "common.medium": "Medium",
  "common.low": "Low",
  "common.monthly": "Monthly",
  "table.resetFilters": "Reset Filters",
  "table.showFilters": "Show Filters",
  "table.hideFilters": "Hide Filters",
  "table.show": "Show",
  "table.all": "All",
  "table.remaining": "Remaining",
  "table.completed": "Completed",
  "table.filter": "Filter",
  "table.done": "Done?",
  "table.advice": "Advice",
  "table.level": "Level",
  "table.details": "Details",
  "table.ignore": "Ignore",
  "table.completeLine": "{{done}} out of {{total}} ({{percent}}%) complete, {{ignored}} ignored",
  "checklist.viewFull": "View Full Checklist",
} as const;

const tr = {
  "nav.checklists": "Kontrol Listeleri",
  "nav.home": "Ana Sayfa",
  "nav.theme": "Tema",
  "nav.settings": "Ayarlar",
  "nav.viewAllPages": "Tüm sayfaları görüntüle",
  "auth.eyebrow": "Kişisel güvenlik merkezi",
  "auth.title": "Kendi güvenlik profilinle devam et",
  "auth.subtitle": "Kontrol listesi ilerlemeni, tercihlerini ve odak alanlarını ayrı bir yerel kullanıcı profili altında tut.",
  "auth.panelTitle": "Giriş yap",
  "auth.panelSubtitle": "İlerlemeni kullanıcı hesabına bağlamak için giriş yap veya hesap oluştur.",
  "auth.loginTab": "Giriş yap",
  "auth.registerTab": "Hesap oluştur",
  "auth.usernameLabel": "Kullanıcı adı",
  "auth.usernamePlaceholder": "örnek: mert",
  "auth.usernameError": "Kullanıcı adı en az 3 karakter olmalı.",
  "auth.nameLabel": "Profil adı",
  "auth.namePlaceholder": "Örnek: Mert",
  "auth.nameError": "Lütfen en az 2 karakter gir.",
  "auth.passwordLabel": "Şifre",
  "auth.passwordPlaceholder": "En az 6 karakter",
  "auth.passwordError": "Şifre en az 6 karakter olmalı.",
  "auth.login": "Giriş yap",
  "auth.register": "Hesap oluştur",
  "auth.loginError": "Kullanıcı adı veya şifre hatalı.",
  "auth.registerError": "Bu kullanıcı adı alınmış veya kullanılamıyor.",
  "auth.logout": "Çıkış yap",
  "auth.activeUser": "Aktif kullanıcı",
  "auth.userScopedData": "Ayarlar ve ilerleme bu kullanıcı için kaydedilir.",
  "auth.profile": "Profil",
  "auth.afterLoginTitle": "Sonrasında ne olur?",
  "auth.afterLoginBody": "Girişten sonra panelin açılır; ilerleme, öncelikler ve liste durumu yalnızca bu hesaba kaydedilir.",
  "auth.cardProgress": "Kontrol maddesi takipte",
  "auth.cardPrivate": "Sunucu destekli kayıt",
  "auth.cardProfile": "Hesap bazlı ilerleme",
  "userProfile.title": "Kullanıcı Profili",
  "userProfile.subtitle": "Hesap detayları ve kayıtlı ilerleme özeti.",
  "userProfile.username": "Kullanıcı adı",
  "userProfile.displayName": "Görünen ad",
  "userProfile.createdAt": "Oluşturulma",
  "userProfile.lastSeen": "Son görülme",
  "userProfile.savedProgress": "Kayıtlı ilerleme",
  "userProfile.completed": "{{completed}} / {{total}} tamamlandı",
  "userProfile.accountSettings": "Hesap Ayarları",
  "userProfile.accountSettingsBody": "Kullanıcı adını veya şifreni değiştir. Mevcut şifre zorunludur.",
  "userProfile.currentPassword": "Mevcut şifre",
  "userProfile.currentPasswordError": "Değişiklikleri kaydetmek için mevcut şifreni gir.",
  "userProfile.newPassword": "Yeni şifre",
  "userProfile.newPasswordPlaceholder": "Mevcut şifreyi korumak için boş bırak",
  "userProfile.saveAccount": "Hesabı kaydet",
  "userProfile.updateError": "Hesap güncellenemedi. Mevcut şifreyi ve kullanıcı adını kontrol et.",
  "userProfile.updateSuccess": "Hesap güncellendi.",
  "settings.title": "Ayarlar",
  "settings.theme": "Tema",
  "settings.language": "Dil",
  "settings.data": "Veri",
  "settings.deleteAll": "Hepsini Sil",
  "settings.close": "Kapat",
  "settings.confirmDelete": "Kayıtlı tüm verileri silmek istediğine emin misin? İlerlemen silinecek.",
  "progress.title": "İlerlemen",
  "progress.completed": "{{completed}} / {{total}} madde tamamlandı",
  "progress.noStatsTitle": "Henüz istatistik yok",
  "progress.noStatsBody": "Kontrol listelerinden maddeleri işaretlemeye başladığında ilerlemeni burada göreceksin.",
  "progress.noStatsAction": "Başlamak için aşağıdan bir kontrol listesi seç.",
  "progress.chartLabel": "Kontrol listesi kategorisi ve önceliğe göre ilerleme",
  "progress.sectionTip": "{{percent}}% tamamlandı, toplam {{total}} madde.",
  "priority.basic": "Temel",
  "priority.essential": "Kritik",
  "priority.recommended": "Önerilen",
  "priority.optional": "İsteğe Bağlı",
  "priority.advanced": "İleri Seviye",
  "priorityActions.title": "Öncelikli Aksiyonlar",
  "priorityActions.subtitle": "Tüm listelerdeki en yüksek etkili tamamlanmamış maddeler.",
  "priorityActions.all": "Tüm Kontrol Listeleri",
  "profile.title": "Güvenlik Profili",
  "profile.suggested": "Önerilen Odak",
  "profile.areas": "{{count}} Alan",
  "profile.device": "Cihaz",
  "profile.risk": "Risk",
  "profile.focus": "Odak",
  "profile.mixed": "Karışık",
  "profile.mobile": "Mobil",
  "profile.desktop": "Masaüstü",
  "profile.normal": "Normal",
  "profile.elevated": "Yüksek",
  "profile.high": "Çok Yüksek",
  "profile.accounts": "Hesaplar",
  "profile.privacy": "Gizlilik",
  "profile.money": "Para",
  "common.items": "{{count}} madde",
  "common.done": "Tamamlandı",
  "common.notStarted": "Henüz başlanmadı",
  "common.impact": "Etki",
  "common.effort": "Efor",
  "common.high": "Yüksek",
  "common.medium": "Orta",
  "common.low": "Düşük",
  "common.monthly": "Aylık",
  "table.resetFilters": "Filtreleri Sıfırla",
  "table.showFilters": "Filtreleri Göster",
  "table.hideFilters": "Filtreleri Gizle",
  "table.show": "Göster",
  "table.all": "Hepsi",
  "table.remaining": "Kalan",
  "table.completed": "Tamamlanan",
  "table.filter": "Filtre",
  "table.done": "Bitti mi?",
  "table.advice": "Öneri",
  "table.level": "Seviye",
  "table.details": "Detaylar",
  "table.ignore": "Yok say",
  "table.completeLine": "{{done}} / {{total}} tamamlandı (%{{percent}}), {{ignored}} yok sayıldı",
  "checklist.viewFull": "Tam Listeyi Aç",
} as const;

export type TranslationKey = keyof typeof en;

const languageRegistry = {
  en: {
    label: "English",
    nativeLabel: "English",
    dictionary: en,
  },
  tr: {
    label: "Turkish",
    nativeLabel: "Türkçe",
    dictionary: tr,
  },
} as const satisfies Record<string, LanguageMetadata & { dictionary: Record<TranslationKey, string> }>;

export type Language = keyof typeof languageRegistry;

export const defaultLanguage: Language = "en";

export const languages = Object.entries(languageRegistry).map(([code, definition]) => ({
  code: code as Language,
  label: definition.label,
  nativeLabel: definition.nativeLabel,
}));

export const LanguageContext = createContextId<Signal<Language>>("lockstep.language");

const dictionaries = Object.fromEntries(
  Object.entries(languageRegistry).map(([code, definition]) => [code, definition.dictionary])
) as Record<Language, Record<TranslationKey, string>>;

export const isLanguage = (language: string | null | undefined): language is Language => {
  return Boolean(language && language in languageRegistry);
};

export const translate = (
  language: Language,
  key: TranslationKey,
  values: Record<string, string | number> = {}
) => {
  const template = dictionaries[language][key];
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{{${name}}}`, String(value)),
    template
  );
};

const priorityKeys: Record<PriorityKey, TranslationKey> = {
  basic: "priority.basic",
  essential: "priority.essential",
  recommended: "priority.recommended",
  optional: "priority.optional",
  advanced: "priority.advanced",
};

const levelKeys: Partial<Record<string, TranslationKey>> = {
  high: "common.high",
  medium: "common.medium",
  low: "common.low",
};

const cadenceKeys: Partial<Record<string, TranslationKey>> = {
  monthly: "common.monthly",
};

export const translatePriority = (language: Language, priority: PriorityKey) => {
  return translate(language, priorityKeys[priority]);
};

export const translateLevel = (language: Language, value: string | undefined) => {
  if (!value) return "";
  const key = levelKeys[value.toLowerCase()];
  return key ? translate(language, key) : value;
};

export const translateCadence = (language: Language, value: string | undefined) => {
  if (!value) return "";
  const key = cadenceKeys[value.toLowerCase()];
  return key ? translate(language, key) : value;
};

export const useI18n = () => {
  const language = useContext(LanguageContext);
  return { language };
};
