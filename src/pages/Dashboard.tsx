import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, MessageCircle, CloudRain, Leaf, LogOut, TrendingUp, FileText, IndianRupee, Calendar, User, BarChart3, ChevronUp, ChevronDown } from 'lucide-react';
// Native HTML5 drag-and-drop will be used; no external DnD library required
import { useToast } from '@/components/ui/use-toast';
import AuthGuard from '@/components/AuthGuard';
import { ThemeToggle } from '@/components/ThemeToggle';
import LanguageSelector from '@/components/LanguageSelector';
import { LanguageContext } from '@/contexts/LanguageContext';
import { translate } from '@/lib/i18n';

const Dashboard = () => {
  const [profile, setProfile] = useState<any>(null);
  const [recentDetections, setRecentDetections] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useContext(LanguageContext);

  const [customizeMode, setCustomizeMode] = useState<boolean>(false);
  const initialTiles = [
    { id: 'disease', route: '/disease-detection', titleKey: 'disease_detection', descKey: 'disease_detection_desc', icon: <Camera className="w-8 h-8 text-primary mb-2" /> },
    { id: 'chatbot', route: '/chatbot', titleKey: 'ai_assistant', descKey: 'ai_assistant_desc', icon: <MessageCircle className="w-8 h-8 text-secondary mb-2" /> },
    { id: 'weather', route: '/weather', titleKey: 'weather_alerts', descKey: 'weather_alerts_desc', icon: <CloudRain className="w-8 h-8 text-accent mb-2" /> },
    { id: 'yield', route: '/yield-prediction', titleKey: 'yield_prediction', descKey: 'yield_prediction_desc', icon: <TrendingUp className="w-8 h-8 text-accent mb-2" /> },
    { id: 'market', route: '/market-prices', titleKey: 'market_prices', descKey: 'market_prices_desc', icon: <IndianRupee className="w-8 h-8 text-secondary mb-2" /> },
    { id: 'analytics', route: '/farm-analytics', titleKey: 'farm_analytics', descKey: 'farm_analytics_desc', icon: <BarChart3 className="w-8 h-8 text-secondary mb-2" /> },
    { id: 'loans', route: '/loan-subsidy', title: 'Loans & Subsidies', desc: 'Find relevant schemes and loans', icon: <FileText className="w-8 h-8 text-secondary mb-2" /> },
    { id: 'govt', route: '/government-schemes', titleKey: 'govt_schemes', descKey: 'govt_schemes_desc', icon: <FileText className="w-8 h-8 text-accent mb-2" /> },
    { id: 'products', route: '/products', titleKey: 'safe_products', descKey: 'safe_products_desc', icon: <Leaf className="w-8 h-8 text-primary mb-2" /> },
    { id: 'calendar', route: '/crop-calendar', titleKey: 'crop_calendar', descKey: 'crop_calendar_desc', icon: <Calendar className="w-8 h-8 text-primary mb-2" /> },
    { id: 'tools', route: '/tool-rentals', titleKey: 'tool_rentals', descKey: 'tool_rentals_desc', icon: <FileText className="w-8 h-8 text-primary mb-2" /> },
  ];

  const [tiles, setTiles] = useState(() => {
    try {
      const raw = localStorage.getItem('dashboard_order');
      if (!raw) return initialTiles;
      const ids: string[] = JSON.parse(raw);
      const map = Object.fromEntries(initialTiles.map((t) => [t.id, t]));
      const ordered = ids.map((id) => map[id]).filter(Boolean);
      // include any missing tiles at the end
      const missing = initialTiles.filter((t) => !ids.includes(t.id));
      return [...ordered, ...missing];
    } catch (e) {
      return initialTiles;
    }
  });

  // Native drag-and-drop state
  const dragItem = { current: -1 } as { current: number };
  const dragOverItem = { current: -1 } as { current: number };

  const handleDragStart = (position: number) => {
    dragItem.current = position;
  };

  const handleDragEnter = (position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = () => {
    const _items = Array.from(tiles);
    const draggedItemContent = _items[dragItem.current];
    _items.splice(dragItem.current, 1);
    _items.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = -1;
    dragOverItem.current = -1;
    setTiles(_items);
  };

  useEffect(() => {
    // persist order
    try {
      localStorage.setItem('dashboard_order', JSON.stringify(tiles.map((t) => t.id)));
    } catch (e) {
      // ignore
    }
  }, [tiles]);

  useEffect(() => {
    loadProfile();
    loadRecentDetections();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      setProfile(data);
    }
  };

  const loadRecentDetections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('disease_detections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setRecentDetections(data || []);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Signed out successfully',
      description: 'Come back soon!',
    });
    navigate('/');
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
            <div>
              <h1 className="text-xl font-bold">Kisaan Mithraa</h1>
              <p className="text-xs text-muted-foreground">Welcome, {profile?.full_name || 'Farmer'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <User className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Quick Actions (customizable) */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">{translate(language as any, 'ready_cta')}</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setTiles(initialTiles);
                try { localStorage.removeItem('dashboard_order'); } catch (e) {}
              }}>Reset</Button>
              <Button variant={customizeMode ? 'secondary' : 'ghost'} size="sm" onClick={() => setCustomizeMode(!customizeMode)}>{customizeMode ? translate(language as any, 'cancel') : 'Customize'}</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {tiles.map((tile, idx) => (
              <div key={tile.id} data-id={tile.id} className="relative"
                draggable={customizeMode}
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => { e.preventDefault(); }}
              >
                <Card
                  className={`cursor-pointer hover:shadow-lg transition-all duration-300 ${customizeMode ? 'opacity-95' : ''}`}
                  onClick={() => { if (!customizeMode) navigate(tile.route); }}
                >
                  <CardHeader>
                    {tile.icon}
                    <CardTitle className="text-lg">{tile.title || translate(language as any, tile.titleKey)}</CardTitle>
                    <CardDescription>{tile.desc || translate(language as any, tile.descKey)}</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <CardTitle>Recent Disease Detections</CardTitle>
              </div>
              <CardDescription>Your latest crop health checks</CardDescription>
            </CardHeader>
            <CardContent>
              {recentDetections.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No detections yet. Start by uploading a crop photo!
                </p>
              ) : (
                <div className="space-y-4">
                  {recentDetections.map((detection) => (
                    <div
                      key={detection.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <img
                        src={detection.image_url}
                        alt="Crop"
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{detection.disease_name || 'Analyzing...'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(detection.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {detection.confidence && (
                        <span className="text-sm font-medium text-primary">
                          {Math.round(detection.confidence)}% confidence
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Dashboard;
