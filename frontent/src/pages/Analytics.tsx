import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, DollarSign, Users, Target } from "lucide-react";

export default function Analytics() {
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    avgROI: 0,
    totalCustomers: 0,
    avgConversion: 0
  });

  useEffect(() => {
    Promise.all([
      fetch("/data/marketing_data.csv").then(r => r.text()),
      fetch("/data/customer_data.csv").then(r => r.text())
    ]).then(([marketingCsv, customerCsv]) => {
      // Parse marketing data
      const marketingLines = marketingCsv.split("\n");
      const campaigns = marketingLines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(",");
        return {
          total_revenue: parseFloat(values[6]),
          roi: parseFloat(values[4]),
          conversion_rate: parseFloat(values[3])
        };
      });

      const totalRevenue = campaigns.reduce((sum, c) => sum + c.total_revenue, 0);
      const avgROI = campaigns.reduce((sum, c) => sum + c.roi, 0) / campaigns.length;
      const avgConversion = campaigns.reduce((sum, c) => sum + c.conversion_rate, 0) / campaigns.length;

      // Parse customer data
      const customerLines = customerCsv.split("\n");
      const totalCustomers = customerLines.length - 1;

      setSummary({
        totalRevenue,
        avgROI,
        totalCustomers,
        avgConversion
      });

      // Generate mock time series data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const timeSeries = months.map((month, i) => ({
        month,
        revenue: totalRevenue / 6 + (Math.random() - 0.5) * 5000,
        customers: Math.floor(totalCustomers / 6 + (Math.random() - 0.5) * 20),
        roi: avgROI + (Math.random() - 0.5) * 30
      }));
      setTimeSeriesData(timeSeries);
    });
  }, []);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Advanced Analytics</h1>
              <p className="text-muted-foreground">Comprehensive business intelligence and trends</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-success/10 to-transparent border-success/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold text-success">${summary.totalRevenue.toFixed(0)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-success" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-accent/10 to-transparent border-accent/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Average ROI</p>
                      <p className="text-2xl font-bold text-accent">{summary.avgROI.toFixed(0)}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-accent" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Customers</p>
                      <p className="text-2xl font-bold text-primary">{summary.totalCustomers}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-warning/10 to-transparent border-warning/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Conversion</p>
                      <p className="text-2xl font-bold text-warning">{(summary.avgConversion * 100).toFixed(1)}%</p>
                    </div>
                    <Target className="h-8 w-8 text-warning" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend (6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Growth</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Line type="monotone" dataKey="customers" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ROI Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Line type="monotone" dataKey="roi" stroke="hsl(var(--success))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
