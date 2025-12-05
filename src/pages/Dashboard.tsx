import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserSelector } from '@/components/inventory/UserSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useInventoryItems, useDeviceUsers, useStockMovements } from '@/hooks/useInventory';
import { useWebhookListener } from '@/hooks/useWebhookListener';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { WebhookConfirmationPopup } from '@/components/webhook/WebhookConfirmationPopup';
import { SettingsAuthDialog } from '@/components/auth/SettingsAuthDialog';
import { Package, Plus, Minus, List, AlertTriangle, BarChart3, FolderTree, Webhook, Settings } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { items, refresh } = useInventoryItems();
  const { currentUser } = useDeviceUsers();
  const { movements } = useStockMovements();
  const { pendingWebhook, isPopupOpen, closePopup, confirmWebhook, simulateIncomingWebhook } = useWebhookListener();
  const { isLoggedIn, login, logout } = useSimpleAuth();
  
  const totalItems = items.length;
  const lowStockItems = items.filter(item => item.current_quantity <= 5).length;
  const recentChanges = movements.slice(0, 5);

  const handleWebhookConfirm = async (action: 'add' | 'remove', data: { item_name: string; sku: string; amount: number }) => {
    await confirmWebhook(action, data);
    refresh();
  };

  return (
    <AppLayout title="Inventory Manager">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with User Selector and Settings */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <UserSelector />
            <SettingsAuthDialog 
              isLoggedIn={isLoggedIn} 
              onLogin={login} 
              onLogout={logout} 
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <Package className="h-10 w-10 text-primary" />
              <div>
                <p className="text-3xl font-bold">{totalItems}</p>
                <p className="text-muted-foreground">Total Items</p>
              </div>
            </CardContent>
          </Card>
          <Card className={lowStockItems > 0 ? 'border-destructive' : ''}>
            <CardContent className="p-6 flex items-center gap-4">
              <AlertTriangle className={`h-10 w-10 ${lowStockItems > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-3xl font-bold">{lowStockItems}</p>
                <p className="text-muted-foreground">Low Stock</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-4">
          
          
          <div className="grid grid-cols-2 gap-4">
            <Button size="lg" className="h-20 text-xl gap-3 bg-green-600 hover:bg-green-700" onClick={() => navigate('/manual-entry', {
            state: {
              type: 'add'
            }
          })} disabled={!currentUser}>
              <Plus className="h-8 w-8" />
              Add Stock
            </Button>
            <Button size="lg" className="h-20 text-xl gap-3 bg-orange-600 hover:bg-orange-700" onClick={() => navigate('/manual-entry', {
            state: {
              type: 'remove'
            }
          })} disabled={!currentUser}>
              <Minus className="h-8 w-8" />
              Remove Stock
            </Button>
          </div>

          <Button size="lg" variant="outline" className="h-16 text-lg gap-3" onClick={() => navigate('/inventory')}>
            <List className="h-6 w-6" />
            View Inventory
          </Button>

          <div className="grid grid-cols-2 gap-4">
            <Button size="lg" variant="outline" className="h-14 text-base gap-2" onClick={() => navigate('/stock-dashboard')}>
              <BarChart3 className="h-5 w-5" />
              Stock Dashboard
            </Button>
            <Button size="lg" variant="outline" className="h-14 text-base gap-2" onClick={() => navigate('/categories')}>
              <FolderTree className="h-5 w-5" />
              Categories
            </Button>
          </div>

          {/* Test Webhook Button */}
          <div className="grid grid-cols-2 gap-4">
            <Button 
              size="lg" 
              variant="secondary" 
              className="h-14 text-base gap-2" 
              onClick={() => simulateIncomingWebhook({ 
                item_name: 'Test Widget', 
                sku: 'WIDGET-001', 
                amount: 10 
              })}
            >
              <Webhook className="h-5 w-5" />
              Test Webhook
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="h-14 text-base gap-2" 
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Button>
          </div>
        </div>

        {/* User Warning */}
        {!currentUser && <Card className="border-amber-500 bg-amber-500/10">
            <CardContent className="p-4 text-center">
              <p className="text-amber-700 dark:text-amber-400 font-medium">
                Please select a user above before adding or removing stock
              </p>
            </CardContent>
          </Card>}

        {/* Recent Activity */}
        {recentChanges.length > 0 && <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {recentChanges.map(movement => {
              const item = items.find(i => i.id === movement.item_id);
              return <div key={movement.id} className="flex justify-between items-center text-sm py-2 border-b last:border-0">
                      <span>{item?.name || 'Unknown Item'}</span>
                      <span className={movement.movement_type === 'add' ? 'text-green-600' : 'text-orange-600'}>
                        {movement.movement_type === 'add' ? '+' : '-'}{movement.quantity}
                      </span>
                    </div>;
            })}
              </div>
            </CardContent>
          </Card>}

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