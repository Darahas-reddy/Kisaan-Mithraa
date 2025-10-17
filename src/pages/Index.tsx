import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sprout, Camera, MessageCircle, CloudRain, Shield, TrendingUp, Globe } from 'lucide-react';
import { useEffect, useState, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LanguageContext } from '@/contexts/LanguageContext';
import { translate } from '@/lib/i18n';

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { language } = useContext(LanguageContext);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        navigate('/dashboard');
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-primary/5">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
              <Sprout className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">{translate(language as any, 'app_tagline')}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent">
              {translate(language as any, 'app_name')}: {translate(language as any, 'app_tagline')}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {translate(language as any, 'hero_subtitle')}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button variant="hero" size="lg" onClick={() => navigate('/auth')}>
                {translate(language as any, 'get_started')}
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate('/auth')}>
                {translate(language as any, 'learn_more')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{translate(language as any, 'app_tagline')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {translate(language as any, 'hero_subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center mb-4">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Disease Detection</h3>
            <p className="text-muted-foreground">
              Upload crop photos and get AI-powered disease diagnosis with localized treatment recommendations in seconds
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border">
            <div className="w-12 h-12 bg-gradient-to-br from-secondary to-accent rounded-lg flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multilingual Voice Assistant</h3>
            <p className="text-muted-foreground">
              Chat in Hindi, English, or your native language with text and voice support for all your farming queries
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border">
            <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-lg flex items-center justify-center mb-4">
              <CloudRain className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-Time Weather Alerts</h3>
            <p className="text-muted-foreground">
              Get location-specific weather updates to plan irrigation, spraying, and harvesting at the perfect time
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Government-Approved Products</h3>
            <p className="text-muted-foreground">
              Access verified pesticide and fertilizer recommendations ensuring safe and effective crop protection
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border">
            <div className="w-12 h-12 bg-gradient-to-br from-accent to-primary-glow rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Analytics Dashboard</h3>
            <p className="text-muted-foreground">
              Track your crop health history, chat queries, and get insights on regional disease trends
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow border">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Offline-Ready</h3>
            <p className="text-muted-foreground">
              Mobile-first design works even in low connectivity areas, ensuring help is always available
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
          <div className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-8 md:p-12 text-center border">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{translate(language as any, 'ready_cta')}</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            {translate(language as any, 'join_message')}
          </p>
          <Button variant="hero" size="lg" onClick={() => navigate('/auth')}>
            {translate(language as any, 'get_started')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
