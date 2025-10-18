import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Camera, Upload, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AuthGuard from '@/components/AuthGuard';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DiseaseDetection = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Read Flask base URL from Vite env (set VITE_FLASK_BASE in .env), fallback to local default
  const FLASK_BASE = (import.meta as any)?.env?.VITE_FLASK_BASE || 'http://127.0.0.1:5000';

  // --- NEW: open Flask web UI root (same-tab redirect)
  const openPredictCode = () => {
    try {
      window.location.href = `${FLASK_BASE.replace(/\/$/, '')}/`; // same-tab redirect
    } catch {
      window.location.href = `${FLASK_BASE}/`;
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setResults(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload image to storage (keep DB image_url for record)
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('crop-images')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('crop-images')
        .getPublicUrl(fileName);

      // Call Flask /predict with the actual image file in FormData
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('imageUrl', publicUrl || '');

      const resp = await fetch(`${FLASK_BASE}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Flask /predict error ${resp.status}: ${text}`);
      }

      const flaskData = await resp.json();
      if (flaskData.error) throw new Error(flaskData.error);

      // Save detection to DB (same as before)
      const { error: dbError } = await supabase
        .from('disease_detections')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          disease_name: flaskData.disease || null,
          confidence: flaskData.confidence ?? null,
          remedies: flaskData.remedies || flaskData.treatment_telugu || null,
        });

      if (dbError) throw dbError;

      setResults(flaskData);

      // Try immediate playback (may be blocked by autoplay policy)
      try {
        const voiceUrl = flaskData.voice_url || `${FLASK_BASE}/voice`;
        const audio = new Audio(voiceUrl);
        audio.play().catch(() => { /* autoplay blocked */ });
      } catch (e) {
        /* ignore audio play errors */
      }

      toast({
        title: 'Analysis Complete',
        description: 'Your crop has been analyzed successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to analyze image',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Helper to replay voice on demand — use voice_url from results if present
  const playTeluguVoice = () => {
    try {
      const voiceUrl = results?.voice_url || `${FLASK_BASE}/voice`;
      new Audio(voiceUrl).play().catch(() => {
        toast({
          variant: 'destructive',
          title: 'Audio blocked',
          description: 'Browser blocked autoplay — please click the play button again.',
        });
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Audio Error',
        description: 'Unable to play voice note.',
      });
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Disease Detection</h1>
              <p className="text-xs text-muted-foreground">AI-powered crop health analysis</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Upload Crop Photo</CardTitle>
              <CardDescription>
                Take a clear photo of affected plant leaves or stems for accurate diagnosis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Simplified: embed Flask predict web only for this component */}
              <div className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Predict Web (Embedded)</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        try {
                          window.open(FLASK_BASE, '_blank', 'noopener');
                        } catch {
                          window.location.href = FLASK_BASE;
                        }
                      }}
                    >
                      Open in new tab
                    </Button>
                  </div>
                </div>

                <div className="w-full h-[640px]">
                  <iframe
                    src={FLASK_BASE}
                    title="Predict Web"
                    className="w-full h-full border rounded"
                    style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
};

export default DiseaseDetection;
