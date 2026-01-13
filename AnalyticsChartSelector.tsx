import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AVAILABLE_CHARTS = [
  { id: "appointments_by_month", name: "Appointments by Month", type: "bar" },
  { id: "revenue_trend", name: "Revenue Trend", type: "line" },
  { id: "client_status", name: "Client Status Distribution", type: "pie" },
  { id: "invoice_status", name: "Invoice Status", type: "pie" },
  { id: "appointment_types", name: "Appointment Duration Distribution", type: "bar" },
  { id: "monthly_growth", name: "Client Growth", type: "line" },
  { id: "billing_overview", name: "Billing Overview", type: "bar" },
];

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function AnalyticsChartSelector() {
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [chartData, setChartData] = useState<Record<string, any[]>>({});
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    // Load saved chart preferences from localStorage
    const saved = localStorage.getItem('dashboard_charts');
    if (saved) {
      setSelectedCharts(JSON.parse(saved));
    } else {
      setSelectedCharts(['appointments_by_month', 'revenue_trend', 'client_status']);
    }
  }, []);

  useEffect(() => {
    if (selectedCharts.length > 0) {
      fetchChartData();
    }
  }, [selectedCharts]);

  const fetchChartData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newData: Record<string, any[]> = {};

    // Fetch appointments by month
    if (selectedCharts.includes('appointments_by_month')) {
      const { data } = await supabase
        .from('appointments')
        .select('appointment_date')
        .eq('therapist_id', user.id);
      
      const months: Record<string, number> = {};
      data?.forEach(apt => {
        const month = new Date(apt.appointment_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        months[month] = (months[month] || 0) + 1;
      });
      newData['appointments_by_month'] = Object.entries(months).map(([month, count]) => ({ month, count }));
    }

    // Fetch revenue trend
    if (selectedCharts.includes('revenue_trend')) {
      const { data } = await supabase
        .from('invoices')
        .select('amount, created_at, status')
        .eq('therapist_id', user.id)
        .eq('status', 'paid');
      
      const months: Record<string, number> = {};
      data?.forEach(inv => {
        const month = new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        months[month] = (months[month] || 0) + Number(inv.amount);
      });
      newData['revenue_trend'] = Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
    }

    // Fetch client status distribution
    if (selectedCharts.includes('client_status')) {
      const { data } = await supabase
        .from('clients')
        .select('id')
        .eq('therapist_id', user.id);
      
      newData['client_status'] = [
        { name: 'Active Clients', value: data?.length || 0 },
      ];
    }

    // Fetch invoice status
    if (selectedCharts.includes('invoice_status')) {
      const { data } = await supabase
        .from('invoices')
        .select('status')
        .eq('therapist_id', user.id);
      
      const statuses: Record<string, number> = {};
      data?.forEach(inv => {
        statuses[inv.status] = (statuses[inv.status] || 0) + 1;
      });
      newData['invoice_status'] = Object.entries(statuses).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
    }

    // Fetch appointment types
    if (selectedCharts.includes('appointment_types')) {
      const { data } = await supabase
        .from('appointments')
        .select('duration_minutes')
        .eq('therapist_id', user.id);
      
      const durations: Record<string, number> = {};
      data?.forEach(apt => {
        const duration = `${apt.duration_minutes} min`;
        durations[duration] = (durations[duration] || 0) + 1;
      });
      newData['appointment_types'] = Object.entries(durations).map(([duration, count]) => ({ duration, count }));
    }

    // Fetch monthly growth
    if (selectedCharts.includes('monthly_growth')) {
      const { data } = await supabase
        .from('clients')
        .select('created_at')
        .eq('therapist_id', user.id);
      
      const months: Record<string, number> = {};
      data?.forEach(client => {
        const month = new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        months[month] = (months[month] || 0) + 1;
      });
      newData['monthly_growth'] = Object.entries(months).map(([month, clients]) => ({ month, clients }));
    }

    // Fetch billing overview
    if (selectedCharts.includes('billing_overview')) {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('amount, status')
        .eq('therapist_id', user.id);
      
      const pending = invoices?.filter(i => i.status === 'pending').reduce((sum, i) => sum + Number(i.amount), 0) || 0;
      const paid = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0) || 0;
      const overdue = invoices?.filter(i => i.status === 'overdue').reduce((sum, i) => sum + Number(i.amount), 0) || 0;
      
      newData['billing_overview'] = [
        { status: 'Paid', amount: paid },
        { status: 'Pending', amount: pending },
        { status: 'Overdue', amount: overdue },
      ];
    }

    setChartData(newData);
  };

  const handleChartSelection = (chartId: string, slot: number) => {
    const newSelection = [...selectedCharts];
    newSelection[slot] = chartId;
    setSelectedCharts(newSelection);
    localStorage.setItem('dashboard_charts', JSON.stringify(newSelection));
  };

  const renderChart = (chartId: string) => {
    const chart = AVAILABLE_CHARTS.find(c => c.id === chartId);
    const data = chartData[chartId] || [];

    if (!chart || data.length === 0) return <div className="h-64 flex items-center justify-center text-muted-foreground">No data available</div>;

    if (chart.type === 'bar') {
      const dataKey = chartId === 'appointments_by_month' ? 'count' : chartId === 'appointment_types' ? 'count' : 'amount';
      const xKey = chartId === 'appointments_by_month' ? 'month' : chartId === 'appointment_types' ? 'duration' : 'status';
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={dataKey} fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chart.type === 'line') {
      const dataKey = chartId === 'revenue_trend' ? 'revenue' : 'clients';
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} stroke="hsl(var(--primary))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chart.type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" labelLine={false} label outerRadius={80} fill="hsl(var(--primary))" dataKey="value">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <Button variant="outline" onClick={() => setIsSelecting(!isSelecting)}>
          <Settings className="w-4 h-4 mr-2" />
          {isSelecting ? "Done" : "Customize Charts"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((slot) => (
          <Card key={slot}>
            <CardHeader>
              {isSelecting ? (
                <Select value={selectedCharts[slot]} onValueChange={(value) => handleChartSelection(value, slot)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a chart" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_CHARTS.map((chart) => (
                      <SelectItem key={chart.id} value={chart.id}>
                        {chart.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <CardTitle className="text-lg">
                  {AVAILABLE_CHARTS.find(c => c.id === selectedCharts[slot])?.name || "Select Chart"}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {!isSelecting && selectedCharts[slot] && renderChart(selectedCharts[slot])}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
