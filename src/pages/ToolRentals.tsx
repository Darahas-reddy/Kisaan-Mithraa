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
      const es = new EventSource(url);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setTools(data.tools || []);
          setOffline(false);
        } catch (_) {}
      };
      es.onerror = () => {
        es.close();
      };
      esRef.current = es;
    } catch (e) {
      // ignore - SSE might not be available
    }

    return () => {
      esRef.current?.close();
    };
  }, []);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const resp = await fetch(baseUrl ? `${baseUrl}/api/tool-rentals` : '/api/tool-rentals');
      if (!resp.ok) throw new Error('Failed to load');
      const data = await resp.json();
      setTools(data.tools || []);
      setOffline(false);
    } catch (e: any) {
      // fallback to offline demo data
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
      const rentType = rentTypeParam;
      const duration = durationParam;

      if (offline) {
        // simulate rent locally
        setTools((prev) => prev.map(t => {
          if (t.id === toolId && t.available) {
            const rate_key = rentType === 'hourly' ? 'hourly_rate' : 'daily_rate';
            const rate = Number((t as any)[rate_key] || 0);
            const total = Math.round(rate * duration * 100) / 100;
            return { ...t, available: false, renter: userId, rent_type: rentType, rent_duration: duration, rent_rate: rate, rent_total: total };
          }
          return t;
        }));
        toast({ title: translate(language as any, 'rented_demo'), description: translate(language as any, 'rented_demo') });
        // record expense in Supabase (if user available)
        if (user) {
          try {
            await supabase.from('farm_expenses').insert({
              user_id: user.id,
              category: 'equipment',
              amount: Number((DEFAULT_TOOLS.find(x => x.id === toolId) as any)?.hourly_rate || 0) * (rentType === 'hourly' ? duration : duration),
              description: `Rental - ${toolId} (${rentType} x ${duration})`,
              expense_date: new Date().toISOString().split('T')[0]
            });
          } catch (_) {}
        }
        return;
      }

      const resp = await fetch(baseUrl ? `${baseUrl}/api/tool-rentals/rent` : '/api/tool-rentals/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, userId, rentType, duration }),
      });
      if (!resp.ok) throw new Error('Rent failed');
      const data = await resp.json();
      const total = data.total ?? (data.tool?.rent_total ?? 0);
      toast({ title: 'Rented', description: `Tool rented — ₹${total}` });
      // record expense in Supabase
      try {
        if (user) {
          await supabase.from('farm_expenses').insert({
            user_id: user.id,
            category: 'equipment',
            amount: Number(total),
            description: `Rental - ${toolId} (${rentType} x ${duration})`,
            expense_date: new Date().toISOString().split('T')[0]
          });
        }
      } catch (_) {}
      fetchTools();
    } catch (e: any) {
      if (!offline) {
        // network or server error -> switch to offline demo
        setTools(DEFAULT_TOOLS);
        setOffline(true);
        toast({ variant: 'destructive', title: translate(language as any, 'offline_ready'), description: translate(language as any, 'offline_notice') });
        return;
      }
      toast({ variant: 'destructive', title: translate(language as any, 'loading'), description: e.message || translate(language as any, 'loading') });
    }
  };

  const handleOpenRent = (tool: Tool) => {
    setRentingTool(tool);
    setRentType('hourly');
    setDuration(1);
  };

  const handleConfirmRent = async () => {
    if (!rentingTool) return;
    setRenting(true);
    await rentTool(rentingTool.id, rentType, duration);
    setRenting(false);
    setRentingTool(null);
  };

  const returnTool = async (toolId: string) => {
    try {
      if (offline) {
        setTools((prev) => prev.map(t => {
          if (t.id === toolId && !t.available) {
            const copy = { ...t } as Tool;
            copy.available = true;
            copy.renter = null;
            delete (copy as any).rent_type;
            delete (copy as any).rent_duration;
            delete (copy as any).rent_rate;
            delete (copy as any).rent_total;
            return copy;
          }
          return t;
        }));
        toast({ title: translate(language as any, 'returned_demo'), description: translate(language as any, 'returned_demo') });
        return;
      }

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
                    <div className="text-sm mt-1">{t.available ? 'Available' : `Rented by ${t.renter}`}</div>
                    {(t.hourly_rate || t.daily_rate) && (
                      <div className="text-sm mt-1 text-muted-foreground">Hourly: ₹{t.hourly_rate} — Daily: ₹{t.daily_rate}</div>
                    )}
                  </div>
                  <div>
                    {t.available ? (
                      <>
                        <Button onClick={() => handleOpenRent(t)}>{translate(language as any, 'add_rent')}</Button>
                        <Dialog open={!!rentingTool} onOpenChange={() => setRentingTool(null)}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{translate(language as any, 'rent_dialog_title')} {rentingTool?.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>{translate(language as any, 'rent_type_label')}</Label>
                                <div className="flex gap-2 mt-2">
                                  <Button variant={rentType === 'hourly' ? 'default' : 'ghost'} onClick={() => setRentType('hourly')}>Hourly</Button>
                                  <Button variant={rentType === 'daily' ? 'default' : 'ghost'} onClick={() => setRentType('daily')}>Daily</Button>
                                </div>
                              </div>
                              <div>
                                <Label>{translate(language as any, 'duration_label')} ({rentType === 'hourly' ? 'hours' : 'days'})</Label>
                                <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setRentingTool(null)}>{translate(language as any, 'cancel')}</Button>
                                <Button onClick={handleConfirmRent} disabled={renting}>{renting ? translate(language as any, 'loading') : `${translate(language as any, 'rent_confirm_text')} ₹${(() => {
                                   const rate_key = rentType === 'hourly' ? 'hourly_rate' : 'daily_rate';
                                   const rate = Number((rentingTool as any)?.[rate_key] || 0);
                                   return Math.round(rate * duration * 100) / 100;
                                 })()}`}</Button>
                               </div>
                             </div>
                           </DialogContent>
                         </Dialog>
                       </>
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
