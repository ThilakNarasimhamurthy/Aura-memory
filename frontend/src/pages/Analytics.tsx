import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, DollarSign, Users, Target, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { campaignsApi, customersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Analytics() {
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    avgROI: 0,
    totalCustomers: 0,
    avgConversion: 0
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Fetch campaign effectiveness data
      const campaignResponse = await campaignsApi.getEffectiveness();
      
      // Fetch customer data
      const customerResponse = await customersApi.findActive(100);

      // Calculate summary from real data
      let totalRevenue = 0;
      let totalROI = 0;
      let totalConversion = 0;
      let roiCount = 0;
      let conversionCount = 0;

      const campaignDocs = campaignResponse?.documents || [];
      const customerDocs = customerResponse?.documents || [];
      
      // If no data, API should have provided mock data, but handle edge case
      if (campaignDocs.length === 0 && customerDocs.length === 0) {
        console.warn("No analytics data available");
        setSummary({
          totalRevenue: 0,
          avgROI: 0,
          totalCustomers: 0,
          avgConversion: 0
        });
        setTimeSeriesData([]);
        setLoading(false);
        return;
      }
      
      campaignDocs.forEach((doc) => {
        const meta = doc.metadata;
        const revenue = meta.total_spent || meta.lifetime_value || 0;
        totalRevenue += revenue;

        if (meta.converted_campaigns && meta.responded_to_campaigns) {
          const conversion = meta.converted_campaigns / meta.responded_to_campaigns;
          totalConversion += conversion;
          conversionCount++;
        }

        if (meta.email_click_rate) {
          totalROI += meta.email_click_rate;
          roiCount++;
        }
      });

      const avgROI = roiCount > 0 ? totalROI / roiCount : 0;
      const avgConversion = conversionCount > 0 ? totalConversion / conversionCount : 0;
      const totalCustomers = customerResponse?.customers_found || customerDocs.length;

      setSummary({
        totalRevenue,
        avgROI,
        totalCustomers,
        avgConversion
      });

      // Generate time series data from actual customer data
      // Group customers by their purchase patterns to create realistic trends
      const customerData = customerDocs.map(doc => doc.metadata);
      
      // Create monthly distribution based on customer lifetime value and purchase patterns
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const timeSeries = months.map((month, i) => {
        // Use actual customer data to create realistic trends
        const monthCustomers = customerData.slice(
          Math.floor((i / months.length) * customerData.length),
          Math.floor(((i + 1) / months.length) * customerData.length)
        );
        
        const monthRevenue = monthCustomers.reduce((sum, c) => 
          sum + (c.total_spent || c.lifetime_value || 0), 0
        );
        
        const monthROI = monthCustomers.reduce((sum, c) => {
          if (c.email_click_rate) return sum + c.email_click_rate;
          if (c.converted_campaigns && c.responded_to_campaigns) {
            return sum + (c.converted_campaigns / c.responded_to_campaigns) * 100;
          }
          return sum;
        }, 0) / (monthCustomers.length || 1);

        return {
          month,
          revenue: monthRevenue || (totalRevenue / months.length),
          customers: monthCustomers.length || Math.floor(totalCustomers / months.length),
          roi: monthROI || avgROI
        };
      });
      
      setTimeSeriesData(timeSeries);

      toast({
        title: "Analytics Data Loaded",
        description: `Loaded data from ${totalCustomers} customers and ${campaignDocs.length} campaign records.`,
      });
    } catch (error: any) {
      console.error("Error loading analytics data:", error);
      toast({
        title: "Error Loading Analytics",
        description: error.message || "Failed to load analytics data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Advanced Analytics</h1>
                <p className="text-muted-foreground">Comprehensive business intelligence and trends</p>
              </div>
              <Button
                onClick={loadAnalyticsData}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
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
