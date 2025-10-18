import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CloudRain, Wind, Droplets, Sun, Cloud, MapPin, AlertTriangle, Thermometer, Leaf } from 'lucide-react';
import { getSeason, cropRecommendations } from '@/lib/season';
import { useToast } from '@/components/ui/use-toast';
import AuthGuard from '@/components/AuthGuard';

interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  rainfall: number;
}

const Weather = () => {
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadWeatherAlerts();
    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // If geolocation fails, use default location and fetch weather
          setLocation('New Delhi, India');
          fetchWeatherByLocation('New Delhi, India');
        }
      );
    } else {
      // If geolocation not supported, use default location
      setLocation('New Delhi, India');
      fetchWeatherByLocation('New Delhi, India');
    }
  }, []);

  const loadWeatherAlerts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('weather_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setAlerts(data || []);
    }
  };

  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-weather', {
        body: { lat, lon },
      });

      if (error) throw error;

      setWeather(data.weather);
      setLocation(data.weather.location);
      
      // Save alert if conditions are severe
      if (data.weather.rainfall > 50 || data.weather.windSpeed > 40) {
        await saveWeatherAlert(data.weather);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch weather data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWeatherByLocation = async (loc: string) => {
    if (!loc.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-weather', {
        body: { location: loc },
      });

      if (error) throw error;

      setWeather(data.weather);
      
      // Save alert if conditions are severe
      if (data.weather.rainfall > 50 || data.weather.windSpeed > 40) {
        await saveWeatherAlert(data.weather);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch weather data',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWeather = async () => {
    fetchWeatherByLocation(location);
  };

  const saveWeatherAlert = async (weatherData: WeatherData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let alertType = 'info';
    let message = '';

    if (weatherData.rainfall > 50) {
      alertType = 'warning';
      message = `Heavy rainfall expected: ${weatherData.rainfall}mm. Avoid spraying pesticides.`;
    } else if (weatherData.windSpeed > 40) {
      alertType = 'warning';
      message = `Strong winds: ${weatherData.windSpeed}km/h. Secure crops and equipment.`;
    }

    if (message) {
      const { error } = await supabase.from('weather_alerts').insert({
        user_id: user.id,
        location: weatherData.location,
        alert_type: alertType,
        message,
        severity: alertType,
      });
      
      if (!error) {
        loadWeatherAlerts();
      }
    }
  };

  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('rain')) return <CloudRain className="w-12 h-12 text-primary" />;
    if (desc.includes('cloud')) return <Cloud className="w-12 h-12 text-muted-foreground" />;
    return <Sun className="w-12 h-12 text-accent" />;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Weather Alerts</h1>
                <p className="text-xs text-muted-foreground">Real-time weather for farming</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Location Search */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchWeather()}
                  placeholder="Enter city name..."
                  className="flex-1"
                />
                <Button onClick={fetchWeather} disabled={isLoading}>
                  {isLoading ? 'Loading...' : 'Get Weather'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Weather */}
          {weather && (
            <Card className="mb-6 bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardHeader>
                <CardTitle className="text-2xl">{weather.location}</CardTitle>
                <CardDescription className="capitalize">{weather.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center p-4 bg-card rounded-lg">
                    <Thermometer className="w-8 h-8 text-destructive mb-2" />
                    <p className="text-3xl font-bold">{weather.temperature}°C</p>
                    <p className="text-sm text-muted-foreground">Temperature</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-card rounded-lg">
                    <Droplets className="w-8 h-8 text-primary mb-2" />
                    <p className="text-3xl font-bold">{weather.humidity}%</p>
                    <p className="text-sm text-muted-foreground">Humidity</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-card rounded-lg">
                    <Wind className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-3xl font-bold">{weather.windSpeed}</p>
                    <p className="text-sm text-muted-foreground">Wind (km/h)</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-card rounded-lg">
                    <CloudRain className="w-8 h-8 text-primary mb-2" />
                    <p className="text-3xl font-bold">{weather.rainfall}</p>
                    <p className="text-sm text-muted-foreground">Rainfall (mm)</p>
                  </div>
                </div>

                {/* Farming Recommendations (weather + season-aware) */}
                <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Leaf className="w-4 h-4" />
                    Farming Recommendations
                  </h3>
                  <div className="text-sm space-y-2">
                    <ul className="space-y-1">
                      {weather.rainfall > 50 && (
                        <li>⚠️ Heavy rain expected - avoid pesticide application</li>
                      )}
                      {weather.windSpeed > 40 && (
                        <li>⚠️ Strong winds - secure crops and equipment</li>
                      )}
                      {weather.temperature > 35 && (
                        <li>🌡️ High temperature - increase irrigation frequency</li>
                      )}
                      {weather.humidity > 80 && (
                        <li>💧 High humidity - monitor for fungal diseases</li>
                      )}
                      {weather.rainfall === 0 && weather.temperature < 35 && (
                        <li>✅ Good conditions for field work and spraying</li>
                      )}
                    </ul>

                    {/* Season-based crop suggestions */}
                    <div className="mt-3">
                      <h4 className="font-medium">Season-based crop suggestions</h4>
                      <p className="text-xs text-muted-foreground mb-2">Based on current season</p>
                      {
                        (() => {
                          const season = getSeason(new Date());
                          const crops = cropRecommendations[season] || [];
                          return (
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 text-xs rounded bg-muted/20">Season: {season.toUpperCase()}</span>
                              {crops.map((c) => (
                                <span key={c} className="px-2 py-1 text-xs rounded bg-secondary/10">{c}</span>
                              ))}
                            </div>
                          );
                        })()
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weather Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Recent Alerts
              </CardTitle>
              <CardDescription>Weather notifications for your area</CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No weather alerts at the moment
                </p>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${
                        alert.alert_type === 'warning'
                          ? 'bg-destructive/10 border-destructive/20'
                          : 'bg-primary/10 border-primary/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 mt-0.5 text-accent" />
                        <div className="flex-1">
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {alert.location} • {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
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

export default Weather;
