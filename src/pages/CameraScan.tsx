import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useInventoryItems, useDeviceUsers } from '@/hooks/useInventory';
import { Camera, ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AIResult {
  itemName: string;
  quantity: number;
  confidence: number;
  matchedSku: string | null;
  notes: string;
}

export default function CameraScan() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items } = useInventoryItems();
  const { currentUser } = useDeviceUsers();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [streaming, setStreaming] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreaming(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreaming(false);
    }
  }, []);

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    
    setCapturedImage(imageBase64);
    stopCamera();
    
    // Analyze with AI
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          imageBase64,
          existingItems: items.map(i => ({ name: i.name, sku: i.sku })),
        },
      });

      if (error) throw error;
      
      setAiResult(data);
    } catch (error) {
      console.error('AI analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Could not analyze image. Please try manual entry.',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  }, [items, stopCamera, toast]);

  const handleConfirm = () => {
    if (!aiResult) return;
    
    const matchedItem = aiResult.matchedSku 
      ? items.find(i => i.sku === aiResult.matchedSku)
      : items.find(i => i.name.toLowerCase().includes(aiResult.itemName.toLowerCase()));

    navigate('/confirm', {
      state: {
        aiResult,
        matchedItem,
        capturedImage,
        type: 'add',
      },
    });
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setAiResult(null);
    startCamera();
  };

  const handleManualEntry = () => {
    navigate('/manual-entry', { state: { type: 'add' } });
  };

  return (
    <AppLayout title="Camera Scan">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => {
            stopCamera();
            navigate('/');
          }}
          className="gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </Button>

        {/* Camera View */}
        {!capturedImage && (
          <Card>
            <CardContent className="p-4">
              {streaming ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <Button
                    size="lg"
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 h-16 w-16 rounded-full"
                    onClick={captureImage}
                  >
                    <Camera className="h-8 w-8" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-12">
                  <Camera className="h-16 w-16 text-muted-foreground" />
                  <Button size="lg" className="h-14 text-lg" onClick={startCamera}>
                    Start Camera
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Captured Image & AI Result */}
        {capturedImage && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full rounded-lg"
              />

              {analyzing && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-lg">Analyzing image...</p>
                </div>
              )}

              {aiResult && !analyzing && (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <h3 className="font-semibold text-lg">AI Detection Result</h3>
                    <p className="text-xl font-bold">{aiResult.itemName}</p>
                    <p className="text-2xl">Quantity: <span className="font-bold">{aiResult.quantity}</span></p>
                    <p className="text-sm text-muted-foreground">
                      Confidence: {aiResult.confidence}%
                    </p>
                    {aiResult.notes && (
                      <p className="text-sm text-muted-foreground">{aiResult.notes}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 gap-2"
                      onClick={handleRetry}
                    >
                      <RotateCcw className="h-5 w-5" />
                      Retry
                    </Button>
                    <Button
                      size="lg"
                      className="h-14"
                      onClick={handleConfirm}
                    >
                      Review & Confirm
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={handleManualEntry}
                  >
                    Skip to Manual Entry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </AppLayout>
  );
}
