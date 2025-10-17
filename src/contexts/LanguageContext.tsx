import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

type LanguageContextValue = {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  loading: boolean;
};

export const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: async () => {},
  loading: false,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLang] = useState<string>('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('profiles').select('language').eq('user_id', user.id).single();
          if (data?.language) setLang(data.language);
        } else {
          // try to read from localStorage
          const stored = localStorage.getItem('preferred_language');
          if (stored) setLang(stored);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    // set document language for accessibility and any client-side libs
    try {
      document.documentElement.lang = language || 'en';
      localStorage.setItem('preferred_language', language);
    } catch (e) {}
  }, [language]);

  const setLanguage = async (lang: string) => {
    setLang(lang);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try update first, if profile doesn't exist insert a minimal record
        try {
          const { data: existing } = await supabase.from('profiles').select('user_id').eq('user_id', user.id).single();
          if (existing) {
            await supabase.from('profiles').update({ language: lang }).eq('user_id', user.id);
          } else {
            await supabase.from('profiles').insert({ user_id: user.id, language: lang, full_name: '' });
          }
        } catch (e) {
          // fallback: attempt a safe insert
          try {
            await supabase.from('profiles').insert({ user_id: user.id, language: lang, full_name: '' });
          } catch (_) {}
        }
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, loading }}>
      {children}
    </LanguageContext.Provider>
  );
};
