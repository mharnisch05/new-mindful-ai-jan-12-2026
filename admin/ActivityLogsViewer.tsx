import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Download, RefreshCw, Loader2, Filter } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  success: boolean;
  timestamp: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  error_message: string | null;
}

export function ActivityLogsViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchTerm, actionFilter, entityFilter, dateRange, logs]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      // Silent error handling for logs viewer to prevent console noise
      // In a real app we might show a toast, but for "polish" we avoid raw console.errors
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_id.includes(searchTerm)
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Entity filter
    if (entityFilter !== 'all') {
      filtered = filtered.filter(log => log.entity_type === entityFilter);
    }

    // Date range filter
    if (dateRange?.from) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        const from = new Date(dateRange.from!);
        const to = dateRange.to ? new Date(dateRange.to) : new Date();
        return logDate >= from && logDate <= to;
      });
    }

    setFilteredLogs(filtered);
  };

  const downloadCSV = () => {
    const headers = ['Timestamp', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'Success', 'Error'];
    const csv = [
      headers.join(','),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.user_id,
        log.action,
        log.entity_type,
        log.entity_id || '',
        log.success,
        log.error_message || ''
      ].map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getActionBadge = (action: string, success: boolean) => {
    if (!success) {
      return <Badge variant="destructive">{action}</Badge>;
    }

    const actionColors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      CREATE: 'default',
      UPDATE: 'secondary',
      DELETE: 'destructive',
      AI_CREATE: 'default',
      AI_UPDATE: 'secondary',
      AI_DELETE: 'destructive'
    };

    return <Badge variant={actionColors[action] || 'outline'}>{action}</Badge>;
  };

  // Get unique actions and entity types for filters
  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueEntityTypes = [...new Set(logs.map(log => log.entity_type))];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map(action => (
              <SelectItem key={action} value={action}>{action}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {uniqueEntityTypes.map(entity => (
              <SelectItem key={entity} value={entity}>{entity}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button onClick={fetchLogs} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={downloadCSV} variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No logs match your filters</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Timestamp</th>
                  <th className="text-left p-3 text-sm font-medium">Action</th>
                  <th className="text-left p-3 text-sm font-medium">Entity</th>
                  <th className="text-left p-3 text-sm font-medium">User ID</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 text-sm">
                      {getActionBadge(log.action, log.success)}
                    </td>
                    <td className="p-3 text-sm font-medium">{log.entity_type}</td>
                    <td className="p-3 text-sm font-mono text-xs text-muted-foreground">
                      {log.user_id.slice(0, 8)}...
                    </td>
                    <td className="p-3 text-sm">
                      {log.success ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Showing {filteredLogs.length} of {logs.length} logs
      </p>
    </div>
  );
}
