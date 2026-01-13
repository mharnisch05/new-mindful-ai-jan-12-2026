import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  DollarSign, 
  Activity, 
  AlertCircle, 
  TrendingUp,
  Download,
  Lock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { ActivityLogsViewer } from '@/components/admin/ActivityLogsViewer';
import { SystemSettingsPanel } from '@/components/admin/SystemSettingsPanel';
import { RevenueAnalytics } from '@/components/admin/RevenueAnalytics';
import { handleError } from '@/utils/errorTracking';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ActivityLog = Database["public"]["Tables"]["user_activity_log"]["Row"];
type AIUsageLog = Database["public"]["Tables"]["ai_usage_log"]["Row"];
type ErrorLog = Database["public"]["Tables"]["error_log"]["Row"];
type User = {
  id: string;
  last_sign_in_at?: string | null;
  [key: string]: unknown;
};

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminCheck();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    aiCalls: 0,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [aiUsageLogs, setAiUsageLogs] = useState<AIUsageLog[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin, fetchAdminData]);

  const fetchAdminData = async () => {
    try {
      // Fetch user counts
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get active users (logged in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const activeUsers = (authUsers?.users || []).filter((user: User) => 
        user.last_sign_in_at && new Date(user.last_sign_in_at) > thirtyDaysAgo
      ).length || 0;

      // Fetch activity logs
      const { data: logs } = await supabase
        .from('user_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch AI usage
      const { data: aiLogs, count: aiCallsCount } = await supabase
        .from('ai_usage_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch error logs
      const { data: errors } = await supabase
        .from('error_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch revenue from billing_events
      const { data: billingEvents } = await supabase
        .from('billing_events')
        .select('amount')
        .eq('status', 'completed');
      
      const totalRevenue = billingEvents?.reduce((sum, event) => sum + Number(event.amount), 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers,
        totalRevenue,
        aiCalls: aiCallsCount || 0,
      });

      setActivityLogs(logs || []);
      setAiUsageLogs(aiLogs || []);
      setErrorLogs(errors || []);
    } catch (error) {
      await handleError(error, '/admin', toast);
    }
  }, [toast]);

  const downloadCSV = useCallback((data: unknown[], filename: string) => {
    const headers = Object.keys(data[0] || {});
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription className="text-base mt-2">
              You don't have permission to access this page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">System metrics and analytics</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => document.querySelector('[value="users"]')?.dispatchEvent(new Event('click', { bubbles: true }))}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => document.querySelector('[value="ai-usage"]')?.dispatchEvent(new Event('click', { bubbles: true }))}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Calls</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aiCalls}</div>
            <p className="text-xs text-muted-foreground mt-1">Total requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Sections */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="ai-usage">AI Usage</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Activity</CardTitle>
              <CardDescription>Comprehensive audit trail with advanced filtering</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityLogsViewer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user accounts and roles</CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <RevenueAnalytics />
        </TabsContent>

        <TabsContent value="ai-usage" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>AI Usage Statistics</CardTitle>
                <CardDescription>Token consumption by model and cost analysis</CardDescription>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => downloadCSV(aiUsageLogs, 'ai_usage_logs')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {aiUsageLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No AI usage data yet</p>
              ) : (
                <div className="space-y-8">
                  {/* Model Comparison Chart */}
                  <div>
                    <h3 className="font-semibold mb-4">Token Usage by Model</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={aiUsageLogs.slice().reverse().slice(0, 20)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="created_at" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleString()}
                          formatter={(value: unknown, name: string) => [String(value), name]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="tokens_in" 
                          stroke="hsl(var(--primary))" 
                          name="Input Tokens" 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="tokens_out" 
                          stroke="hsl(var(--destructive))" 
                          name="Output Tokens" 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Cost Analysis */}
                  <div>
                    <h3 className="font-semibold mb-4">Cost per Request</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={aiUsageLogs.slice(0, 15)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="created_at"
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => new Date(value).toLocaleString()}
                          formatter={(value: unknown) => [`$${Number(value).toFixed(4)}`, 'Cost']}
                        />
                        <Bar dataKey="cost" fill="hsl(var(--primary))" name="Cost ($)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Recent Usage Table */}
                  <div>
                    <h3 className="font-semibold mb-4">Recent AI Calls</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-3 text-sm font-medium">Date</th>
                            <th className="text-left p-3 text-sm font-medium">Model</th>
                            <th className="text-right p-3 text-sm font-medium">Tokens In</th>
                            <th className="text-right p-3 text-sm font-medium">Tokens Out</th>
                            <th className="text-right p-3 text-sm font-medium">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiUsageLogs.slice(0, 10).map((log) => (
                            <tr key={log.id} className="border-t">
                              <td className="p-3 text-sm">{new Date(log.created_at).toLocaleString()}</td>
                              <td className="p-3 text-sm">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  log.model.includes('claude') 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'bg-destructive/10 text-destructive'
                                }`}>
                                  {log.model}
                                </span>
                              </td>
                              <td className="p-3 text-sm text-right">{log.tokens_in?.toLocaleString() || 0}</td>
                              <td className="p-3 text-sm text-right">{log.tokens_out?.toLocaleString() || 0}</td>
                              <td className="p-3 text-sm text-right font-medium">
                                ${(log.cost || 0).toFixed(4)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${aiUsageLogs.reduce((sum, log) => sum + (log.cost || 0), 0).toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Avg Cost/Request</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          ${(aiUsageLogs.reduce((sum, log) => sum + (log.cost || 0), 0) / aiUsageLogs.length).toFixed(4)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {aiUsageLogs.reduce((sum, log) => sum + (log.tokens_in || 0) + (log.tokens_out || 0), 0).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Error Logs</CardTitle>
                <CardDescription>System errors and issues</CardDescription>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => downloadCSV(errorLogs, 'error_logs')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {errorLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No errors logged</p>
              ) : (
                <div className="space-y-2">
                  {errorLogs.map((error) => (
                    <div key={error.id} className="p-3 border border-destructive/20 rounded-lg bg-destructive/5">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{error.error_message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {error.page} - {new Date(error.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SystemSettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
