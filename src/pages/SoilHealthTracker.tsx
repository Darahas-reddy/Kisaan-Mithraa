import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import AuthGuard from '@/components/AuthGuard';

const soilTypes = ['Loamy', 'Sandy', 'Clay', 'Silt', 'Peaty'];

const analyze = (values: any) => {
  const suggestions: string[] = [];
  const { ph, n, p, k, organic_carbon } = values;

  if (ph < 6) suggestions.push('Soil pH is acidic — consider liming to raise pH.');
  if (n < 120) suggestions.push('Nitrogen is low — consider organic manure or urea-based fertilizer.');
  if (p < 30) suggestions.push('Phosphorus is low — consider phosphate-rich organic amendments.');
  if (k < 150) suggestions.push('Potassium is low — consider potash or compost.');
  if (organic_carbon < 0.5) suggestions.push('Organic carbon low — incorporate compost/green manure to improve soil organic matter.');

  return suggestions;
};

const SoilHealthTracker: React.FC = () => {
  const [form, setForm] = useState({
    soil_type: 'Loamy',
    ph: 7,
    n: 0,
    p: 0,
    k: 0,
    organic_carbon: 0.0,
    moisture: 0,
  });
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load pending count from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('soil_health_records_pending');
      const arr = raw ? JSON.parse(raw) : [];
      setPendingCount(Array.isArray(arr) ? arr.length : 0);
    } catch (e) {
      setPendingCount(0);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        user_id: user?.id || null,
        soil_type: form.soil_type,
        ph: parseFloat(String(form.ph)),
        n: parseFloat(String(form.n)),
        p: parseFloat(String(form.p)),
        k: parseFloat(String(form.k)),
        organic_carbon: parseFloat(String(form.organic_carbon)),
        moisture: parseFloat(String(form.moisture)),
      };
      // Try to save to Supabase; if the table doesn't exist, fallback to localStorage
      const { error } = await supabase.from('soil_health_records').insert(payload);
      if (error) {
        const msg = String(error.message || error);
        const tableMissing = /relation \"public\.soil_health_records\" does not exist/.test(msg) || /table .* does not exist/i.test(msg);
        if (tableMissing) {
          // Save locally so user doesn't lose data
          try {
            const raw = localStorage.getItem('soil_health_records_pending');
            const arr = raw ? JSON.parse(raw) : [];
            arr.push({ ...payload, date_created: new Date().toISOString() });
            localStorage.setItem('soil_health_records_pending', JSON.stringify(arr));
            setPendingCount(arr.length);
            toast({ title: 'Saved locally', description: 'The database table is missing — your record was saved locally and will sync when the database is ready.' });
            const suggestions = analyze(payload);
            setReport({ ...payload, suggestions, date_created: new Date().toISOString() });
            return;
          } catch (e) {
            // fallthrough to error
          }
        }
        throw error;
      }

      const suggestions = analyze(payload);
      setReport({ ...payload, suggestions, date_created: new Date().toISOString() });

      toast({ title: 'Record saved', description: 'Soil record saved successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const syncPending = async () => {
    const raw = localStorage.getItem('soil_health_records_pending');
    if (!raw) {
      toast({ title: 'No pending records', description: 'No locally-saved records to sync.' });
      return;
    }

    let arr;
    try {
      arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length === 0) {
        toast({ title: 'No pending records', description: 'No locally-saved records to sync.' });
        return;
      }
    } catch (e) {
      toast({ title: 'Sync failed', description: 'Could not read pending records.' , variant: 'destructive'});
      return;
    }

    setSaving(true);
    try {
      for (const r of arr) {
        const { error } = await supabase.from('soil_health_records').insert(r);
        if (error) throw error;
      }
      localStorage.removeItem('soil_health_records_pending');
      setPendingCount(0);
      toast({ title: 'Synced', description: `Uploaded ${arr.length} pending records to the database.` });
    } catch (error: any) {
      const msg = String(error?.message || error);
      if (/relation \"public\.soil_health_records\" does not exist/.test(msg)) {
        toast({ title: 'Table missing', description: 'Database table still missing. Run the migration to enable cloud sync.', variant: 'destructive' });
      } else {
        toast({ title: 'Sync failed', description: msg || 'Failed to sync pending records', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <header className="border-b bg-card/50 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>Back</Button>
            <div>
              <h1 className="text-xl font-bold">Soil Health Tracker</h1>
              <p className="text-xs text-muted-foreground">Record and analyze soil test results</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Enter Soil Test Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Soil Type</Label>
                  <Select value={form.soil_type} onValueChange={(v) => setForm({ ...form, soil_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {soilTypes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>pH Value</Label>
                  <Input type="number" step="0.1" value={String(form.ph)} onChange={(e) => setForm({ ...form, ph: parseFloat(e.target.value) })} required />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>N (kg/ha)</Label>
                    <Input type="number" value={String(form.n)} onChange={(e) => setForm({ ...form, n: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <Label>P (kg/ha)</Label>
                    <Input type="number" value={String(form.p)} onChange={(e) => setForm({ ...form, p: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <Label>K (kg/ha)</Label>
                    <Input type="number" value={String(form.k)} onChange={(e) => setForm({ ...form, k: parseFloat(e.target.value) })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Organic Carbon (%)</Label>
                    <Input type="number" step="0.1" value={String(form.organic_carbon)} onChange={(e) => setForm({ ...form, organic_carbon: parseFloat(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Moisture Level (%)</Label>
                    <Input type="number" value={String(form.moisture)} onChange={(e) => setForm({ ...form, moisture: parseFloat(e.target.value) })} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save & Analyze'}</Button>
                  {report && <Button variant="outline" onClick={handlePrint}>Export / Print Report</Button>}
                  <div className="ml-auto flex items-center gap-2">
                    {pendingCount > 0 && (
                      <span className="text-sm text-muted-foreground">Pending: {pendingCount}</span>
                    )}
                    <Button variant="ghost" onClick={syncPending} disabled={saving || pendingCount === 0}>Sync pending</Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {report && (
            <Card>
              <CardHeader>
                <CardTitle>Soil Health Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Soil Type:</strong> {report.soil_type}</p>
                  <p><strong>pH:</strong> {report.ph}</p>
                  <p><strong>N/P/K:</strong> {report.n} / {report.p} / {report.k}</p>
                  <p><strong>Organic Carbon:</strong> {report.organic_carbon}%</p>
                  <p><strong>Moisture:</strong> {report.moisture}%</p>
                  <div className="mt-4">
                    <h4 className="font-medium">Recommendations</h4>
                    <ul className="list-disc ml-5">
                      {report.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </AuthGuard>
  );
};

export default SoilHealthTracker;
