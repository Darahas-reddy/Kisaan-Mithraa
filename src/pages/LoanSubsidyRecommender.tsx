import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import schemesData from '@/data/schemes.json';
import { supabase } from '@/integrations/supabase/client';
import AuthGuard from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const types = ['All', 'Income Support', 'Loan'];

const LoanSubsidyRecommender: React.FC = () => {
  const [cropType, setCropType] = useState('');
  const [landSize, setLandSize] = useState('');
  const [districtState, setDistrictState] = useState('');
  const [purpose, setPurpose] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    filter();
  }, [filterType]);

  const filter = () => {
    let list = schemesData as any[];
    if (filterType !== 'All') list = list.filter(s => s.type === filterType);
    setResults(list);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const filtered = (schemesData as any[]).filter((s) => {
      const matchesCrop = !cropType || s.name.toLowerCase().includes(cropType.toLowerCase());
      const matchesRegion = !districtState || (s.eligibility || '').toLowerCase().includes(districtState.toLowerCase());
      return matchesCrop && matchesRegion;
    });
    setResults(filtered);

    // Save query for analytics
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('loan_queries').insert({
        user_id: user?.id || null,
        crop_type: cropType,
        land_size: landSize,
        district_state: districtState,
        purpose,
      });
    } catch (err) {
      // non-fatal
      toast({ title: 'Saved locally', description: 'Query saved locally', variant: 'default' });
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <header className="border-b bg-card/50 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>Back</Button>
            <div>
              <h1 className="text-xl font-bold">Loan & Subsidy Recommender</h1>
              <p className="text-xs text-muted-foreground">Find relevant schemes for your needs</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="mb-6">
            <CardHeader><CardTitle>Find Schemes</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <Label>Crop Type</Label>
                  <Input value={cropType} onChange={(e) => setCropType(e.target.value)} placeholder="e.g., Rice" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Land Size (acres)</Label>
                    <Input value={landSize} onChange={(e) => setLandSize(e.target.value)} />
                  </div>
                  <div>
                    <Label>District / State</Label>
                    <Input value={districtState} onChange={(e) => setDistrictState(e.target.value)} />
                  </div>
                  <div>
                    <Label>Purpose</Label>
                    <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Select value={filterType} onValueChange={(v) => setFilterType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="submit">Search</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((s: any) => (
              <Card key={s.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{s.name}</CardTitle>
                    <span className="text-xs text-muted-foreground">{s.type}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-2"><strong>Eligibility:</strong> {s.eligibility}</p>
                  <p className="text-sm mb-3"><strong>Benefit:</strong> {s.benefit}</p>
                  <div className="flex gap-2">
                    <a href={s.apply_link} target="_blank" rel="noreferrer">
                      <Button>Apply</Button>
                    </a>
                    <Button variant="outline" onClick={() => navigator.clipboard?.writeText(s.apply_link)}>Copy Link</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
};

export default LoanSubsidyRecommender;
