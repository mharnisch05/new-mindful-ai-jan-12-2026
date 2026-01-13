import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, Activity, DollarSign, TrendingUp, Calendar, FileText, 
  MessageSquare, ClipboardCheck, BarChart3, PieChart, LineChart 
} from 'lucide-react';
import { 
  LineChart as RechartsLineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, 
  Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import { Badge } from '@/components/ui/badge';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function ComprehensiveAnalytics() {
  const [timeFilter, setTimeFilter] = useState('30d');
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalClients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    mrr: 0,
    arr: 0,
    churnRate: 0,
    arpu: 0,
    dau: 0,
    wau: 0,
    mau: 0,
  });
  const [chartData, setChartData] = useState({
    userGrowth: [],
    revenueGrowth: [],
    featureUsage: [],
    practiceSize: [],
    locationData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeFilter]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
      const days = daysMap[timeFilter];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Fetch users
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const totalUsers = authUsers?.users.length || 0;
      
      const recentLogins = authUsers?.users.filter((u: { last_sign_in_at?: string }) => 
        u.last_sign_in_at && new Date(u.last_sign_in_at) >= new Date(startDate)
      ).length || 0;

      // Fetch clients
      const { data: clients } = await supabase.from('clients').select('*');
      const totalClients = clients?.length || 0;

      // Fetch appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .gte('created_at', startDate);
      const totalAppointments = appointments?.length || 0;

      // Fetch billing events
      const { data: billingEvents } = await supabase
        .from('billing_events')
        .select('amount, created_at, status')
        .eq('status', 'completed')
        .gte('created_at', startDate);
      
      const totalRevenue = billingEvents?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const mrr = totalRevenue / (days / 30);
      const arr = mrr * 12;
      const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;

      // Calculate DAU, WAU, MAU
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const dau = authUsers?.users.filter((u: { last_sign_in_at?: string }) => 
        u.last_sign_in_at && new Date(u.last_sign_in_at) >= oneDayAgo
      ).length || 0;
      
      const wau = authUsers?.users.filter((u: { last_sign_in_at?: string }) => 
        u.last_sign_in_at && new Date(u.last_sign_in_at) >= oneWeekAgo
      ).length || 0;
      
      const mau = authUsers?.users.filter((u: { last_sign_in_at?: string }) => 
        u.last_sign_in_at && new Date(u.last_sign_in_at) >= oneMonthAgo
      ).length || 0;

      // User growth chart
      const usersByDate = (authUsers?.users || []).reduce((acc: any, user: any) => {
        const date = new Date(user.created_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const userGrowth = Object.entries(usersByDate || {}).map(([date, count]) => ({ date, count })).slice(-30);

      // Revenue growth chart
      const revenueByDate = billingEvents?.reduce((acc: any, event) => {
        const date = new Date(event.created_at).toLocaleDateString();
        if (!acc[date]) acc[date] = 0;
        acc[date] += Number(event.amount);
        return acc;
      }, {});
      const revenueGrowth = Object.entries(revenueByDate || {}).map(([date, revenue]) => ({ date, revenue })).slice(-30);

      // Feature usage
      const { data: soapNotes } = await supabase.from('soap_notes').select('id').gte('created_at', startDate);
      const { data: messages } = await supabase.from('messages').select('id').gte('created_at', startDate);
      const { data: invoices } = await supabase.from('invoices').select('id').gte('created_at', startDate);
      
      const featureUsage = [
        { name: 'SOAP Notes', value: soapNotes?.length || 0 },
        { name: 'Messages', value: messages?.length || 0 },
        { name: 'Invoices', value: invoices?.length || 0 },
        { name: 'Appointments', value: totalAppointments },
      ];

      setMetrics({
        totalUsers,
        activeUsers: recentLogins,
        totalClients,
        totalAppointments,
        totalRevenue,
        mrr,
        arr,
        churnRate: 0, // Would need subscription cancel data
        arpu,
        dau,
        wau,
        mau,
      });

      setChartData({
        userGrowth,
        revenueGrowth,
        featureUsage,
        practiceSize: [],
        locationData: [],
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive platform metrics and insights</p>
        </div>
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 Days</SelectItem>
            <SelectItem value="30d">30 Days</SelectItem>
            <SelectItem value="90d">90 Days</SelectItem>
            <SelectItem value="1y">1 Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Active: {metrics.activeUsers}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">DAU: {metrics.dau}</Badge>
              <Badge variant="outline" className="text-xs">WAU: {metrics.wau}</Badge>
              <Badge variant="outline" className="text-xs">MAU: {metrics.mau}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">MRR / ARR</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.mrr.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">ARR: ${metrics.arr.toFixed(0)}</p>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">ARPU: ${metrics.arpu.toFixed(2)}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClients}</div>
            <p className="text-xs text-muted-foreground">Platform-wide</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAppointments}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList>
          <TabsTrigger value="growth">Growth Trends</TabsTrigger>
          <TabsTrigger value="usage">Feature Usage</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>New user registrations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Usage</CardTitle>
              <CardDescription>Most used platform features</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.featureUsage}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Growth</CardTitle>
              <CardDescription>Revenue trends over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={chartData.revenueGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
