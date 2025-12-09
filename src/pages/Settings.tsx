import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WebhookTestPanel } from '@/components/webhook/WebhookTestPanel';
import { WebhookConfirmationPopup } from '@/components/webhook/WebhookConfirmationPopup';
import { useWebhookListener } from '@/hooks/useWebhookListener';
import { useInventoryItems } from '@/hooks/useInventory';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Settings as SettingsIcon, Bell, Database, Activity, Shield, LogOut } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, updateItem, refresh } = useInventoryItems();
  const { pendingWebhook, isPopupOpen, closePopup, confirmWebhook, simulateIncomingWebhook } = useWebhookListener();
  const { isAdmin, signOut } = useAuth();
  
  const [globalThreshold, setGlobalThreshold] = useState(5);

  // Get the webhook URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const webhookUrl = `${supabaseUrl}/functions/v1/stock-webhook`;

  const handleTestWebhook = (data: { name: string; sku: string; amount: number }) => {
    simulateIncomingWebhook({
      item_name: data.name,
      sku: data.sku,
      amount: data.amount,
    });
  };

  const handleWebhookConfirm = async (action: 'add' | 'remove', data: { item_name: string; sku: string; amount: number }) => {
    await confirmWebhook(action, data);
    refresh();
  };

  const handleApplyGlobalThreshold = async () => {
    try {
      for (const item of items) {
        await updateItem(item.id, { low_stock_threshold: globalThreshold });
      }
      toast({
        title: 'Threshold Updated',
        description: `Applied threshold of ${globalThreshold} to all ${items.length} items.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update thresholds.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout title="Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft className="h-5 w-5" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* Low Stock Alert Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>
              Configure when you receive low stock warnings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="globalThreshold">Default Low Stock Threshold</Label>
              <div className="flex gap-3">
                <Input
                  id="globalThreshold"
                  type="number"
                  min="0"
                  value={globalThreshold}
                  onChange={(e) => setGlobalThreshold(parseInt(e.target.value) || 0)}
                  className="w-32"
                />
                <Button onClick={handleApplyGlobalThreshold} variant="secondary">
                  Apply to All Items
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Items will show a warning when stock falls at or below this number.
                You can also set individual thresholds per item in the inventory.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Admin-Only Sections */}
        {isAdmin && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity Log
                </CardTitle>
                <CardDescription>
                  View all stock movements and user activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/activity-log')} className="w-full">
                  View Activity Log
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Management
                </CardTitle>
                <CardDescription>
                  Manage admin users and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/admin-management')} variant="outline" className="w-full">
                  Manage Admins
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Webhook Configuration */}
        <WebhookTestPanel 
          webhookUrl={webhookUrl}
          onTestWebhook={handleTestWebhook}
        />

        {/* Database Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data & Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Total Items: {items.length}</p>
              <p>Data is stored locally and synced to cloud when online.</p>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card>
          <CardContent className="p-4">
            <Button 
              onClick={async () => {
                await signOut();
                navigate('/auth');
              }} 
              variant="outline" 
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Webhook Confirmation Popup */}
        <WebhookConfirmationPopup
          open={isPopupOpen}
          onClose={closePopup}
          data={pendingWebhook}
          onConfirm={handleWebhookConfirm}
        />
      </div>
    </AppLayout>
  );
}