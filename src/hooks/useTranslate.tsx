import { useContext } from 'react';
import { LanguageContext } from '@/contexts/LanguageContext';
import { translate } from '@/lib/i18n';

export default function useTranslate() {
  const { language } = useContext(LanguageContext);
  return (key: string) => translate(language as any, key);
}
