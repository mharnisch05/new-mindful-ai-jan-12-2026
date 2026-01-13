import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format, addWeeks, startOfMonth } from "date-fns";

interface ChartData {
  clientsOverTime: Array<{ month: string; count: number }>;
  appointmentsByWeek: Array<{ week: string; count: number }>;
  invoiceStats: Array<{ name: string; value: number }>;
}

export function DashboardCharts() {
  const [chartData, setChartData] = useState<ChartData>({
    clientsOverTime: [],
    appointmentsByWeek: [],
    invoiceStats: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch clients over time (last 6 months)
      const { data: clients } = await supabase
        .from("clients")
        .select("created_at")
        .eq("therapist_id", user.id)
        .order("created_at");

      // Fetch appointments by week (last 8 weeks for better visibility)
      const now = new Date();
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
      
      const { data: appointments } = await supabase
        .from("appointments")
        .select("appointment_date")
        .eq("therapist_id", user.id)
        .gte("appointment_date", eightWeeksAgo.toISOString());

      // Fetch invoice stats
      const { data: invoices } = await supabase
        .from("invoices")
        .select("status, amount")
        .eq("therapist_id", user.id);

      // Process data
      const clientsByMonth: Record<string, number> = {};
      if (clients) {
        clients.forEach((client) => {
          const month = new Date(client.created_at).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });
          clientsByMonth[month] = (clientsByMonth[month] || 0) + 1;
        });
      }

      const appointmentsByWeek: Record<string, number> = {};
      if (appointments) {
        appointments.forEach((apt) => {
          const date = new Date(apt.appointment_date);
          const weekStart = startOfWeek(date, { weekStartsOn: 0 });
          const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
          const weekLabel = `${format(weekStart, 'MMM d')}-${format(weekEnd, 'd')}`;
          appointmentsByWeek[weekLabel] = (appointmentsByWeek[weekLabel] || 0) + 1;
        });
      }

      let paidCount = 0;
      let unpaidCount = 0;
      if (invoices) {
        invoices.forEach((inv) => {
          if (inv.status === "paid") paidCount++;
          else unpaidCount++;
        });
      }

      setChartData({
        clientsOverTime: Object.entries(clientsByMonth)
          .slice(-6)
          .map(([month, count]) => ({ month, count })),
        appointmentsByWeek: Object.entries(appointmentsByWeek).map(([week, count]) => ({
          week,
          count,
        })),
        invoiceStats: [
          { name: "Paid", value: paidCount },
          { name: "Unpaid", value: unpaidCount },
        ],
      });
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const COLORS = {
    Paid: "hsl(var(--primary))",
    Unpaid: "hsl(var(--destructive))",
  };


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Clients Over Time</CardTitle>
          <CardDescription>New clients per month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData.clientsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appointments by Week</CardTitle>
          <CardDescription>Weekly session trends</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.appointmentsByWeek}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis allowDecimals={false} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  color: 'hsl(var(--popover-foreground))',
                  padding: '8px 12px'
                }}
                labelStyle={{
                  color: 'hsl(var(--popover-foreground))',
                  fontWeight: 500
                }}
                itemStyle={{
                  color: 'hsl(var(--popover-foreground))'
                }}
              />
              <Legend />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Status</CardTitle>
          <CardDescription>Paid vs unpaid invoices</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData.invoiceStats}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.invoiceStats.map((entry) => (
                  <Cell 
                    key={`cell-${entry.name}`} 
                    fill={COLORS[entry.name as keyof typeof COLORS]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  color: 'hsl(var(--popover-foreground))',
                  padding: '8px 12px'
                }}
                labelStyle={{
                  color: 'hsl(var(--popover-foreground))',
                  fontWeight: 500
                }}
                itemStyle={{
                  color: 'hsl(var(--popover-foreground))'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col items-center gap-2 pt-2 w-full">
            {chartData.invoiceStats.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[entry.name as keyof typeof COLORS] }}
                />
                <span className="text-sm text-foreground">
                  {entry.name}: {entry.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
