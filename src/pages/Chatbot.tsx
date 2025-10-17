import { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Mic, Volume2, Loader2, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AuthGuard from '@/components/AuthGuard';
import useTranslate from '@/hooks/useTranslate';
import { LanguageContext } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { language, setLanguage } = useContext(LanguageContext);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = useTranslate();
  const [voiceChatEnabled, setVoiceChatEnabled] = useState(false);
  const awaitingReplyRef = useRef(false);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(20);

      if (data) {
        const chatMessages: Message[] = data.flatMap((msg) => [
          {
            id: `${msg.id}-user`,
            role: 'user' as const,
            content: msg.message,
            timestamp: new Date(msg.created_at),
          },
          ...(msg.response
            ? [
                {
                  id: `${msg.id}-assistant`,
                  role: 'assistant' as const,
                  content: msg.response,
                  timestamp: new Date(msg.created_at),
                },
              ]
            : []),
        ]);
        setMessages(chatMessages);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const langCodeShort = (language || 'en').split('-')[0];
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: {
          message: input,
          // explicit signals for the function: user language and desired response/tts language
          language: langCodeShort,
          response_language: langCodeShort,
          tts_language: langCodeShort,
          history: messages.slice(-5).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Play TTS for the assistant response. If voice-chat is enabled, stop listening, play, then restart listening.
      try {
        if (voiceChatEnabled) {
          awaitingReplyRef.current = true;
          stopListening();
        }
        await playTtsFromServer(data.response, langCodeShort, () => {
          awaitingReplyRef.current = false;
          if (voiceChatEnabled) startListening();
        });
      } catch (_){ }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to get response',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { isListening, startListening, stopListening } = useVoiceInput({
    onTranscript: (text) => {
      setInput(text);
      handleSend();
    },
    language: (language || 'en').split('-')[0],
  });

  // Restart recognition when language changes while voice-chat is enabled so recognizer uses new lang.
  useEffect(() => {
    if (voiceChatEnabled) {
      try {
        stopListening();
        startListening();
      } catch (_) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const sanitizeForSpeech = (raw: string): string => {
    let s = raw;
    // Remove code blocks and inline code
    s = s.replace(/```[\s\S]*?```/g, ' ');
    s = s.replace(/`([^`]*)`/g, '$1');
    // Strip markdown links, keep label
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    // Remove images syntax ![alt](url)
    s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
    // Remove bare URLs
    s = s.replace(/https?:\/\/\S+/g, ' ');
    // Replace common symbols with words
    s = s.replace(/&/g, ' and ');
    s = s.replace(/%/g, ' percent ');
    s = s.replace(/\*/g, ' ');
    s = s.replace(/[#_~^><`|]/g, ' ');
    s = s.replace(/•/g, ' ');
    s = s.replace(/\+/g, ' plus ');
    s = s.replace(/\//g, ' slash ');
    // Remove emoji and non-word pictographs
    s = s.replace(/[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F02F}\u{2600}-\u{27BF}]/gu, ' ');
    // Collapse multiple punctuation
    s = s.replace(/[.,!?;:]{2,}/g, '. ');
    // Normalize whitespace and newlines to pauses
    s = s.replace(/[\r\t]+/g, ' ');
    s = s.replace(/\n{2,}/g, '. ');
    s = s.replace(/\n/g, ', ');
    s = s.replace(/\s{2,}/g, ' ');
    return s.trim();
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
      const languageMap: Record<string, string> = {
        'en': 'en-IN',
        'hi': 'hi-IN',
        'ta': 'ta-IN',
        'te': 'te-IN',
        'bn': 'bn-IN',
        'mr': 'mr-IN',
        'gu': 'gu-IN',
        'kn': 'kn-IN',
        'ml': 'ml-IN',
        'pa': 'pa-IN'
      };
      const targetLang = languageMap[language] || 'en-IN';

      const setAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find(v => v.lang?.toLowerCase() === targetLang.toLowerCase())
          || voices.find(v => v.lang?.toLowerCase().startsWith(targetLang.split('-')[0].toLowerCase()))
          || null;
        if (match) utterance.voice = match;
        utterance.lang = match?.lang || targetLang;
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => setAndSpeak();
      } else {
        setAndSpeak();
      }
    }
  };

  // New helper: play TTS from backend (Flask /api/voice). Accepts an optional onFinished callback.
  const playTtsFromServer = async (text: string, langCode?: string, onFinished?: () => void) => {
    try {
      const base = ((import.meta as any).env?.VITE_PREDICT_URL) || 'http://127.0.0.1:5000';
      const langParam = (langCode || language) || 'en';
      const url = `${base.replace(/\/$/, '')}/api/voice?text=` + encodeURIComponent(text) + '&lang=' + encodeURIComponent(langParam);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('TTS server failed');
      const blob = await resp.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        try { URL.revokeObjectURL(audioUrl); } catch (_) {}
        if (onFinished) onFinished();
      };
      await audio.play();
    } catch (e) {
      // fallback to client-side Web Speech API
      try {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(sanitizeForSpeech(text));
          const languageMap: Record<string, string> = {
            'en': 'en-IN',
            'hi': 'hi-IN',
            'ta': 'ta-IN',
            'te': 'te-IN',
            'bn': 'bn-IN',
            'mr': 'mr-IN',
            'gu': 'gu-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
            'pa': 'pa-IN'
          };
          const targetLang = languageMap[langCode || language] || 'en-IN';
          utterance.lang = targetLang;
          utterance.onend = () => { if (onFinished) onFinished(); };
          window.speechSynthesis.speak(utterance);
        } else {
          if (onFinished) onFinished();
        }
      } catch (_) { /* ignore */ }
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{t('ai_assistant_title') || 'AI Assistant'}</h1>
                <p className="text-xs text-muted-foreground">{t('ai_assistant_subtitle') || 'Ask anything about farming'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={voiceChatEnabled ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={async () => {
                    if (voiceChatEnabled) {
                      setVoiceChatEnabled(false);
                      stopListening();
                    } else {
                      setVoiceChatEnabled(true);
                      // start listening immediately
                      try { startListening(); } catch (_) {}
                    }
                  }}
                >
                  {voiceChatEnabled ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 ? (
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
                <CardContent className="py-8">
                  <h2 className="text-xl font-semibold text-center mb-4">{t('assistant_welcome')}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      t('suggestion_rice'),
                      t('suggestion_tomato_yellow'),
                      t('suggestion_compost'),
                      t('suggestion_pests'),
                    ].map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="text-left h-auto py-3 px-4"
                        onClick={() => setInput(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <Card
                    className={`max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card'
                    }`}
                  >
                    <CardContent className="py-3 px-4">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.role === 'assistant' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-6 px-2"
                          onClick={async () => playTtsFromServer(message.content)}
                        >
                          <Volume2 className="w-3 h-3 mr-1" />
                          {t('listen') || 'Listen'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <Card className="bg-card">
                  <CardContent className="py-3 px-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </CardContent>
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              placeholder={t('chat_input_placeholder') || 'Type your question here...'}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              variant="default"
              size="icon"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              <Send className="w-5 h-5" />
            </Button>
            <Button 
              variant={isListening ? "destructive" : "outline"} 
              size="icon"
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => playTtsFromServer(messages[messages.length - 1]?.content || '')}
            >
              <Volume2 className="w-5 h-5" />
            </Button>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Chatbot;
