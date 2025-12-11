import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventoryItems, useStockMovements } from '@/hooks/useInventory';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useUsers } from '@/hooks/useUsers';
import { ArrowLeft, Search, Download, Activity, Calendar, Package, FolderEdit, Palette, Plus, Trash, LogIn, LogOut, UserPlus } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ConditionBadge } from '@/components/stock/ConditionBadge';

interface CombinedLogEntry {
  id: string;
  type: 'movement' | 'audit';
  created_at: string;
  action: string;
  action_type: string;
  user_name: string;
  item_name: string;
  item_sku: string;
  quantity?: number;
  movement_type?: 'add' | 'remove';
  entry_method?: string;
  old_value?: string | null;
  new_value?: string | null;
  notes?: string | null;
  condition?: string;
}

export default function ActivityLog() {
  const navigate = useNavigate();
  const { items } = useInventoryItems();
  const { movements, loading: movementsLoading } = useStockMovements();
  const { logs: auditLogs, loading: auditLoading } = useAuditLogs();
  const { users } = useUsers();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('7');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 50;
  const loading = movementsLoading || auditLoading;

  // Combine movements and audit logs
  const combinedLogs = useMemo((): CombinedLogEntry[] => {
    const entries: CombinedLogEntry[] = [];

    // Add stock movements
    movements.forEach(movement => {
      const item = items.find(i => i.id === movement.item_id);
      const user = users.find(u => u.user_id === movement.device_user_id);
      
      entries.push({
        id: movement.id,
        type: 'movement',
        created_at: movement.created_at,
        action: movement.movement_type === 'add' ? 'Stock Added' : 'Stock Removed',
        action_type: movement.movement_type,
        user_name: user?.display_name || 'Unknown',
        item_name: item?.name || 'Unknown Item',
        item_sku: item?.sku || '',
        quantity: movement.quantity,
        movement_type: movement.movement_type,
        entry_method: movement.entry_method,
        notes: movement.notes,
        condition: movement.condition,
      });
    });

    // Add audit logs
    auditLogs.forEach(log => {
      const user = users.find(u => u.user_id === log.user_id);
      
      let action = 'Unknown Action';
      let actionType = log.action_type;
      
      switch (log.action_type) {
        case 'item_created':
          action = 'Item Created';
          break;
        case 'item_deleted':
          action = 'Item Deleted';
          break;
        case 'category_changed':
          action = 'Category Changed';
          break;
        case 'condition_changed':
          action = 'Condition Changed';
          break;
        case 'stock_added':
          action = 'Stock Added';
          break;
        case 'stock_removed':
          action = 'Stock Removed';
          break;
        case 'user_signed_up':
          action = 'User Signed Up';
          break;
        case 'user_signed_in':
          action = 'User Signed In';
          break;
        case 'user_signed_out':
          action = 'User Signed Out';
          break;
      }

      entries.push({
        id: log.id,
        type: 'audit',
        created_at: log.created_at,
        action,
        action_type: actionType,
        user_name: user?.display_name || log.item_name || 'Unknown',
        item_name: log.action_type.startsWith('user_') ? log.item_name || 'User' : log.item_name || 'Unknown Item',
        item_sku: log.item_sku || '',
        old_value: log.old_value,
        new_value: log.new_value,
        notes: log.notes,
      });
    });

    // Sort by date descending
    return entries.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [movements, auditLogs, items, users]);

  // Filter combined logs
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const daysBack = parseInt(dateFilter);
    const startDate = startOfDay(subDays(now, daysBack));
    const endDate = endOfDay(now);

    return combinedLogs.filter(entry => {
      const entryDate = new Date(entry.created_at);
      
      // Date filter
      if (!isWithinInterval(entryDate, { start: startDate, end: endDate })) {
        return false;
      }
      
      // User filter
      if (userFilter !== 'all' && entry.user_name !== users.find(u => u.user_id === userFilter)?.display_name) {
        return false;
      }
      
      // Action filter
      if (actionFilter !== 'all') {
        if (actionFilter === 'add' && entry.action_type !== 'add') return false;
        if (actionFilter === 'remove' && entry.action_type !== 'remove') return false;
        if (actionFilter === 'item_created' && entry.action_type !== 'item_created') return false;
        if (actionFilter === 'item_deleted' && entry.action_type !== 'item_deleted') return false;
        if (actionFilter === 'category_changed' && entry.action_type !== 'category_changed') return false;
        if (actionFilter === 'condition_changed' && entry.action_type !== 'condition_changed') return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!entry.item_name.toLowerCase().includes(query) && 
            !entry.item_sku.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [combinedLogs, searchQuery, dateFilter, userFilter, actionFilter, users]);

  // Paginate
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // Export to CSV
  const handleExport = () => {
    const headers = ['Date/Time', 'User', 'Action', 'Item', 'SKU', 'Details', 'Method', 'Notes'];
    const rows = filteredLogs.map(entry => {
      let details = '';
      if (entry.type === 'movement') {
        details = `${entry.movement_type === 'add' ? '+' : '-'}${entry.quantity}${entry.condition ? ` (${entry.condition})` : ''}`;
      } else {
        if (entry.old_value || entry.new_value) {
          details = `${entry.old_value || 'None'} → ${entry.new_value || 'None'}`;
        }
      }
      
      return [
        format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss'),
        entry.user_name,
        entry.action,
        entry.item_name,
        entry.item_sku,
        details,
        entry.entry_method === 'ai_assisted' ? 'AI Assisted' : entry.entry_method === 'manual' ? 'Manual' : '',
        entry.notes || ''
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

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'add':
      case 'stock_added':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'remove':
      case 'stock_removed':
        return <Package className="h-4 w-4 text-orange-600" />;
      case 'item_created':
        return <Plus className="h-4 w-4 text-blue-600" />;
      case 'item_deleted':
        return <Trash className="h-4 w-4 text-red-600" />;
      case 'category_changed':
        return <FolderEdit className="h-4 w-4 text-purple-600" />;
      case 'condition_changed':
        return <Palette className="h-4 w-4 text-amber-600" />;
      case 'user_signed_up':
        return <UserPlus className="h-4 w-4 text-emerald-600" />;
      case 'user_signed_in':
        return <LogIn className="h-4 w-4 text-sky-600" />;
      case 'user_signed_out':
        return <LogOut className="h-4 w-4 text-slate-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'add':
      case 'stock_added':
        return 'text-green-600 dark:text-green-400';
      case 'remove':
      case 'stock_removed':
        return 'text-orange-600 dark:text-orange-400';
      case 'item_created':
        return 'text-blue-600 dark:text-blue-400';
      case 'item_deleted':
        return 'text-red-600 dark:text-red-400';
      case 'category_changed':
        return 'text-purple-600 dark:text-purple-400';
      case 'condition_changed':
        return 'text-amber-600 dark:text-amber-400';
      case 'user_signed_up':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'user_signed_in':
        return 'text-sky-600 dark:text-sky-400';
      case 'user_signed_out':
        return 'text-slate-600 dark:text-slate-400';
      default:
        return '';
    }
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
                    <SelectItem key={user.user_id} value={user.user_id}>{user.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="add">Stock Added</SelectItem>
                  <SelectItem value="remove">Stock Removed</SelectItem>
                  <SelectItem value="item_created">Item Created</SelectItem>
                  <SelectItem value="item_deleted">Item Deleted</SelectItem>
                  <SelectItem value="category_changed">Category Changed</SelectItem>
                  <SelectItem value="condition_changed">Condition Changed</SelectItem>
                  <SelectItem value="user_signed_up">User Signed Up</SelectItem>
                  <SelectItem value="user_signed_in">User Signed In</SelectItem>
                  <SelectItem value="user_signed_out">User Signed Out</SelectItem>
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
                {filteredLogs.length} records
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : paginatedLogs.length === 0 ? (
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
                      <th className="text-left py-3 px-2">Details</th>
                      <th className="text-left py-3 px-2">Method</th>
                      <th className="text-left py-3 px-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map(entry => (
                      <tr key={entry.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 whitespace-nowrap">
                          {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                        </td>
                        <td className="py-3 px-2">{entry.user_name}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {getActionIcon(entry.action_type)}
                            <span className={getActionColor(entry.action_type)}>
                              {entry.action}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium">{entry.item_name}</p>
                            <p className="text-xs text-muted-foreground">{entry.item_sku}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {entry.type === 'movement' ? (
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${entry.movement_type === 'add' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-orange-600 dark:text-orange-400'
                              }`}>
                                {entry.movement_type === 'add' ? '+' : '-'}{entry.quantity}
                              </span>
                              {entry.condition && (
                                <ConditionBadge condition={entry.condition as 'new' | 'good' | 'damaged' | 'broken'} />
                              )}
                            </div>
                          ) : (
                            entry.old_value || entry.new_value ? (
                              <span className="text-xs">
                                <span className="text-muted-foreground">{entry.old_value || 'None'}</span>
                                <span className="mx-1">→</span>
                                <span className="font-medium">{entry.new_value || 'None'}</span>
                              </span>
                            ) : '-'
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {entry.entry_method && (
                            <span className="text-xs px-2 py-1 rounded bg-muted">
                              {entry.entry_method === 'ai_assisted' ? 'AI' : 'Manual'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground max-w-[200px] truncate">
                          {entry.notes || '-'}
                        </td>
                      </tr>
                    ))}
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
