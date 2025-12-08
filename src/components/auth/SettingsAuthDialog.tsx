import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, LogIn, LogOut, Shield, Loader2 } from 'lucide-react';

interface SettingsAuthDialogProps {
  isLoggedIn: boolean;
  onLogin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  onLogout: () => void;
}

export function SettingsAuthDialog({ isLoggedIn, onLogin, onLogout }: SettingsAuthDialogProps) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!pin.trim()) {
      setError('Please enter your PIN');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await onLogin(pin);
    
    setIsLoading(false);
    
    if (result.success) {
      setOpen(false);
      setPin('');
      toast({ title: 'Success', description: 'Logged in as admin' });
    } else {
      setError(result.error || 'Invalid PIN');
    }
  };

  const handleLogout = () => {
    onLogout();
    setOpen(false);
    toast({ title: 'Logged out', description: 'You have been logged out' });
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setPin('');
      setError('');
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative"
      >
        <Settings className="h-5 w-5" />
        {isLoggedIn && (
          <Shield className="h-3 w-3 absolute -top-1 -right-1 text-primary" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {isLoggedIn ? (
              <div className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg flex items-center gap-3">
                  <Shield className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">Admin Access</p>
                    <p className="text-sm text-muted-foreground">You have admin privileges</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="w-full gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pin">Admin PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleLogin()}
                    placeholder="Enter PIN"
                    className={error ? 'border-destructive' : ''}
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  {error && <p className="text-sm text-destructive mt-1">{error}</p>}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {!isLoggedIn && (
              <Button onClick={handleLogin} className="gap-2" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {isLoading ? 'Verifying...' : 'Login'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
