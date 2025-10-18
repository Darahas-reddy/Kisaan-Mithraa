import { useEffect, useState, useRef, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AuthGuard from '@/components/AuthGuard';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageContext } from '@/contexts/LanguageContext';
import { translate } from '@/lib/i18n';

type Tool = {
  id: string;
  name: string;
  description?: string;
  available: boolean;
  renter?: string | null;
  hourly_rate?: number;
  daily_rate?: number;
  rent_type?: string;
  rent_duration?: number;
  rent_rate?: number;
  rent_total?: number;
};

// Default/sample tools used when backend is unavailable (offline/demo mode)
const DEFAULT_TOOLS: Tool[] = [
  { id: 't1', name: 'Rotavator', description: 'Small rotavator for tilling', available: true, hourly_rate: 300, daily_rate: 1800 },
  { id: 't2', name: 'Cultivator', description: 'Tractor-mounted cultivator', available: true, hourly_rate: 400, daily_rate: 2400 },
  { id: 't3', name: 'Power Tiller', description: 'Two-wheel power tiller', available: true, hourly_rate: 200, daily_rate: 1200 },
  { id: 't4', name: 'Seed Drill', description: 'Mechanical seed drill for uniform seeding', available: true, hourly_rate: 150, daily_rate: 900 },
  { id: 't5', name: 'Sprayer', description: 'Battery sprayer for pesticides and fertilizers', available: true, hourly_rate: 80, daily_rate: 480 },
];

export default function ToolRentals() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [rentingTool, setRentingTool] = useState<Tool | null>(null);
  const [rentType, setRentType] = useState<'hourly' | 'daily'>('hourly');
  const [duration, setDuration] = useState<number>(1);
  const [renting, setRenting] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const { toast } = useToast();
  const { language } = useContext(LanguageContext);

  // compute base URL (strip trailing slash)
  const baseUrl = ((import.meta as any).env?.VITE_PREDICT_URL && (import.meta as any).env.VITE_PREDICT_URL.replace(/\/$/, '')) || '';

  useEffect(() => {
    fetchTools();

    // Try server-sent events for realtime updates
    try {
      const url = baseUrl ? `${baseUrl}/api/tool-rentals/stream` : '/api/tool-rentals/stream';
      import { useEffect, useState, useRef, useContext } from 'react';
      import { Button } from '@/components/ui/button';
      import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
      import AuthGuard from '@/components/AuthGuard';
      import { useToast } from '@/components/ui/use-toast';
      import { supabase } from '@/integrations/supabase/client';
      import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
      import { Input } from '@/components/ui/input';
      import { Label } from '@/components/ui/label';
      import { LanguageContext } from '@/contexts/LanguageContext';
      import { translate } from '@/lib/i18n';

      type Tool = {
        id: string;
        name: string;
        description?: string;
        available: boolean;
        renter?: string | null;
        hourly_rate?: number;
        daily_rate?: number;
      };

      const DEFAULT_TOOLS: Tool[] = [
        { id: 't1', name: 'Rotavator', description: 'Small rotavator for tilling', available: true, hourly_rate: 300, daily_rate: 1800 },
        { id: 't2', name: 'Cultivator', description: 'Tractor-mounted cultivator', available: true, hourly_rate: 400, daily_rate: 2400 },
        { id: 't3', name: 'Power Tiller', description: 'Two-wheel power tiller', available: true, hourly_rate: 200, daily_rate: 1200 },
        { id: 't4', name: 'Seed Drill', description: 'Mechanical seed drill for uniform seeding', available: true, hourly_rate: 150, daily_rate: 900 },
        { id: 't5', name: 'Sprayer', description: 'Battery sprayer for pesticides and fertilizers', available: true, hourly_rate: 80, daily_rate: 480 },
      ];

      export default function ToolRentals() {
        const [tools, setTools] = useState<Tool[]>([]);
        const [loading, setLoading] = useState(false);
        const [offline, setOffline] = useState(false);
        const [rentingTool, setRentingTool] = useState<Tool | null>(null);
        const [rentType, setRentType] = useState<'hourly' | 'daily'>('hourly');
        const [duration, setDuration] = useState<number>(1);
        const [renting, setRenting] = useState(false);
        const esRef = useRef<EventSource | null>(null);
        const { toast } = useToast();
        const { language } = useContext(LanguageContext);

        const baseUrl = ((import.meta as any).env?.VITE_PREDICT_URL && (import.meta as any).env.VITE_PREDICT_URL.replace(/\/$/, '')) || '';

        useEffect(() => {
          fetchTools();
          try {
            const url = baseUrl ? `${baseUrl}/api/tool-rentals/stream` : '/api/tool-rentals/stream';
            const es = new EventSource(url);
            es.onmessage = (e) => {
              try {
                const data = JSON.parse(e.data);
                setTools(data.tools || []);
                setOffline(false);
              } catch (_) {}
            };
            es.onerror = () => es.close();
            esRef.current = es;
          } catch (e) {
            // ignore
          }
          return () => esRef.current?.close();
        }, []);

        const fetchTools = async () => {
          setLoading(true);
          try {
            const resp = await fetch(baseUrl ? `${baseUrl}/api/tool-rentals` : '/api/tool-rentals');
            if (!resp.ok) throw new Error('Failed to load');
            const data = await resp.json();
            setTools(data.tools || []);
            setOffline(false);
          } catch (err) {
            setTools(DEFAULT_TOOLS);
            setOffline(true);
            toast({ variant: 'destructive', title: translate(language as any, 'offline_ready'), description: translate(language as any, 'offline_notice') });
          } finally {
            setLoading(false);
          }
        };

        const rentTool = async (toolId: string, rentTypeParam: 'hourly' | 'daily' = 'hourly', durationParam: number = 1) => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id || 'guest';
            const rentTypeLocal = rentTypeParam;
            const durationLocal = durationParam;

            if (offline) {
              setTools((prev) => prev.map(t => {
                if (t.id === toolId && t.available) {
                  const rate_key = rentTypeLocal === 'hourly' ? 'hourly_rate' : 'daily_rate';
                  const rate = Number((t as any)[rate_key] || 0);
                  const total = Math.round(rate * durationLocal * 100) / 100;
                  return { ...t, available: false, renter: userId } as any;
                }
                return t;
              }));
              toast({ title: translate(language as any, 'rented_demo'), description: translate(language as any, 'rented_demo') });
              return;
            }

            const resp = await fetch(baseUrl ? `${baseUrl}/api/tool-rentals/rent` : '/api/tool-rentals/rent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ toolId, userId, rentType: rentTypeLocal, duration: durationLocal }),
            });
            if (!resp.ok) throw new Error('Rent failed');
            toast({ title: 'Rented', description: `Tool rented` });
            fetchTools();
          } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message || 'Rent failed' });
          }
        };

        const returnTool = async (toolId: string) => {
          try {
            const resp = await fetch(baseUrl ? `${baseUrl}/api/tool-rentals/return` : '/api/tool-rentals/return', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ toolId }),
            });
            if (!resp.ok) throw new Error('Return failed');
            toast({ title: 'Returned', description: 'Tool returned' });
            fetchTools();
          } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to return' });
          }
        };

        return (
          <AuthGuard>
            <div className="min-h-screen container mx-auto px-4 py-8">
              <Card>
                <CardHeader>
                  <CardTitle>{translate(language as any, 'tool_rentals_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loading && <div>{translate(language as any, 'loading')}</div>}
                    {tools.map((t) => (
                      <div key={t.id} className="p-3 border rounded flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{t.name}</div>
                          <div className="text-sm text-muted-foreground">{t.description}</div>
                          <div className="text-sm mt-1">{t.available ? translate(language as any, 'available') : `${translate(language as any, 'rented_by')} ${t.renter || ''}`}</div>
                          {(t.hourly_rate || t.daily_rate) && (
                            <div className="text-sm mt-1 text-muted-foreground">Hourly: ₹{t.hourly_rate} — Daily: ₹{t.daily_rate}</div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {t.available ? (
                            <Button onClick={() => rentTool(t.id)}>{translate(language as any, 'add_rent')}</Button>
                          ) : (
                            <Button variant="outline" onClick={() => returnTool(t.id)}>{translate(language as any, 'return_rent')}</Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {tools.length === 0 && !loading && <div>{translate(language as any, 'no_tools')}</div>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </AuthGuard>
        );
      }
                    <div className="text-sm mt-1">{t.available ? 'Available' : `Rented by ${t.renter}`}</div>
