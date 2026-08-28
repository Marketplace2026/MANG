import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  fr: {
    translation: {
      settings: "Paramètres",
      myAccount: "Mon Compte",
      appearanceLanguage: "Apparence & Langue",
      language: "Langue de l'application",
      theme: "Thème",
      themeLight: "Mode clair",
      themeDark: "Mode sombre",
      logout: "Se déconnecter"
    }
  },
  en: {
    translation: {
      settings: "Settings",
      myAccount: "My Account",
      appearanceLanguage: "Appearance & Language",
      language: "App language",
      theme: "Theme",
      themeLight: "Light mode",
      themeDark: "Dark mode",
      logout: "Log out"
    }
  },
  fon: {
    translation: {
      settings: "Tòtó",
      myAccount: "Kɔntu ce",
      appearanceLanguage: "Nukunmɛ & Gbe",
      language: "App Gbe",
      theme: "Sinmɛ",
      themeLight: "Kɛ́nnɛ",
      themeDark: "Zinzin",
      logout: "Tóntón"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    interpolation: { escapeValue: false }
  });

export default i18n;
