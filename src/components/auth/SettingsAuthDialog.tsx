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
import { Settings, LogIn, LogOut, Shield } from 'lucide-react';

const HARDCODED_PASSWORD = '1234';

interface SettingsAuthDialogProps {
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

export function SettingsAuthDialog({ isLoggedIn, onLogin, onLogout }: SettingsAuthDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleLogin = () => {
    if (password === HARDCODED_PASSWORD) {
      onLogin();
      setOpen(false);
      setPassword('');
      setError('');
      toast({ title: 'Success', description: 'Logged in as admin' });
    } else {
      setError('Incorrect password');
    }
  };

  const handleLogout = () => {
    onLogout();
    setOpen(false);
    toast({ title: 'Logged out', description: 'You have been logged out' });
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

      <Dialog open={open} onOpenChange={setOpen}>
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
                  <Label htmlFor="password">Admin Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="Enter password"
                    className={error ? 'border-destructive' : ''}
                  />
                  {error && <p className="text-sm text-destructive mt-1">{error}</p>}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {!isLoggedIn && (
              <Button onClick={handleLogin} className="gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}