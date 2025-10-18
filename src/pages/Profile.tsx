import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AuthGuard from '@/components/AuthGuard';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import { translate } from '@/lib/i18n';
import { LanguageContext } from '@/contexts/LanguageContext';

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    language: 'en',
    state: '',
    district: '',
  });
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setProfile({
            full_name: data.full_name || '',
            phone: data.phone || '',
            language: data.language || 'en',
            state: data.state || '',
            district: data.district || '',
          });
        }
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load profile',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          language: profile.language,
          state: profile.state,
          district: profile.district,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const { language } = useContext(LanguageContext);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold">{translate(language as any, 'welcome_to_app')}</h1>
              </div>
            </div>
            <LanguageSelector />
            <ThemeToggle />
          </div>
        </header>

          <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>{translate(language as any, 'app_name')}</CardTitle>
              <CardDescription>{translate(language as any, 'app_tagline')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} disabled className="bg-muted" />
                <p className="text-sm text-muted-foreground">{translate(language as any, 'offline_ready_desc')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Preferred Language</Label>
                <Select value={profile.language} onValueChange={(value) => setProfile({ ...profile, language: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                    <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                    <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                    <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                    <SelectItem value="mr">मराठी (Marathi)</SelectItem>
                    <SelectItem value="gu">ગુજરાતી (Gujarati)</SelectItem>
                    <SelectItem value="kn">ಕನ್ನಡ (Kannada)</SelectItem>
                    <SelectItem value="ml">മലയാളം (Malayalam)</SelectItem>
                    <SelectItem value="pa">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  type="text"
                  value={profile.state}
                  onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                  placeholder="Your state"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  type="text"
                  value={profile.district}
                  onChange={(e) => setProfile({ ...profile, district: e.target.value })}
                  placeholder="Your district"
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {translate(language as any, 'loading')}
                  </>
                ) : (
                  translate(language as any, 'get_started')
                )}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Profile;
