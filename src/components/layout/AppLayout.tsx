import { ReactNode, useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { getOnlineStatus } from '@/lib/syncService';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [isOnline, setIsOnline] = useState(getOnlineStatus());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Status Bar */}
      <div className={cn(
        "flex items-center justify-between px-4 py-2 text-sm",
        isOnline ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
      )}>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>Online - Auto-syncing</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Offline - Changes saved locally</span>
            </>
          )}
        </div>
        {title && <span className="font-semibold">{title}</span>}
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4">
        {children}
      </main>
    </div>
  );
}
