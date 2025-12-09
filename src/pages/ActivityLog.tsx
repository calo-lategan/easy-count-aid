import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventoryItems, useStockMovements, useDeviceUsers } from '@/hooks/useInventory';
import { ArrowLeft, Search, Download, Activity, Calendar } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

export default function ActivityLog() {
  const navigate = useNavigate();
  const { items } = useInventoryItems();
  const { movements, loading } = useStockMovements();
  const { users } = useDeviceUsers();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('7');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 50;

  // Filter movements
  const filteredMovements = useMemo(() => {
    const now = new Date();
    const daysBack = parseInt(dateFilter);
    const startDate = startOfDay(subDays(now, daysBack));
    const endDate = endOfDay(now);

    return movements.filter(movement => {
      const movementDate = new Date(movement.created_at);
      const item = items.find(i => i.id === movement.item_id);
      
      // Date filter
      if (!isWithinInterval(movementDate, { start: startDate, end: endDate })) {
        return false;
      }
      
      // User filter
      if (userFilter !== 'all' && movement.device_user_id !== userFilter) {
        return false;
      }
      
      // Action filter
      if (actionFilter !== 'all' && movement.movement_type !== actionFilter) {
        return false;
      }
      
      // Search filter
      if (searchQuery) {
        const itemName = item?.name?.toLowerCase() || '';
        const itemSku = item?.sku?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        if (!itemName.includes(query) && !itemSku.includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [movements, items, searchQuery, dateFilter, userFilter, actionFilter]);

  // Paginate
  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMovements.slice(start, start + itemsPerPage);
  }, [filteredMovements, currentPage]);

  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);

  // Export to CSV
  const handleExport = () => {
    const headers = ['Date/Time', 'User', 'Action', 'Item', 'SKU', 'Quantity', 'Entry Method', 'Notes'];
    const rows = filteredMovements.map(movement => {
      const item = items.find(i => i.id === movement.item_id);
      const user = users.find(u => u.id === movement.device_user_id);
      return [
        format(new Date(movement.created_at), 'yyyy-MM-dd HH:mm:ss'),
        user?.name || 'Unknown',
        movement.movement_type === 'add' ? 'Added' : 'Removed',
        item?.name || 'Unknown Item',
        item?.sku || '',
        movement.quantity.toString(),
        movement.entry_method === 'ai_assisted' ? 'AI Assisted' : 'Manual',
        movement.notes || ''
      ];
    });
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout title="Activity Log">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/settings')} className="gap-2">
            <ArrowLeft className="h-5 w-5" />
            Back to Settings
          </Button>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">Activity Log</h1>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Today</SelectItem>
                  <SelectItem value="2">Yesterday</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="add">Added</SelectItem>
                  <SelectItem value="remove">Removed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Activity Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Activity History</span>
              <span className="text-sm font-normal text-muted-foreground">
                {filteredMovements.length} records
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : paginatedMovements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No activity found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Date/Time</th>
                      <th className="text-left py-3 px-2">User</th>
                      <th className="text-left py-3 px-2">Action</th>
                      <th className="text-left py-3 px-2">Item</th>
                      <th className="text-right py-3 px-2">Quantity</th>
                      <th className="text-left py-3 px-2">Method</th>
                      <th className="text-left py-3 px-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMovements.map(movement => {
                      const item = items.find(i => i.id === movement.item_id);
                      const user = users.find(u => u.id === movement.device_user_id);
                      
                      return (
                        <tr key={movement.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2 whitespace-nowrap">
                            {format(new Date(movement.created_at), 'MMM d, yyyy h:mm a')}
                          </td>
                          <td className="py-3 px-2">{user?.name || 'Unknown'}</td>
                          <td className="py-3 px-2">
                            <span className={movement.movement_type === 'add' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-orange-600 dark:text-orange-400'
                            }>
                              {movement.movement_type === 'add' ? 'Added' : 'Removed'}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <div>
                              <p className="font-medium">{item?.name || 'Unknown Item'}</p>
                              <p className="text-xs text-muted-foreground">{item?.sku}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right font-semibold">
                            <span className={movement.movement_type === 'add' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-orange-600 dark:text-orange-400'
                            }>
                              {movement.movement_type === 'add' ? '+' : '-'}{movement.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-xs px-2 py-1 rounded bg-muted">
                              {movement.entry_method === 'ai_assisted' ? 'AI' : 'Manual'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground max-w-[200px] truncate">
                            {movement.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
