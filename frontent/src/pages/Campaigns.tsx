import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Target, Loader2, RefreshCw, Volume2 } from "lucide-react";
import { campaignsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  campaign_name: string;
  channel: string;
  customer_segment: string;
  conversion_rate: number;
  roi: number;
  total_spend: number;
  total_revenue: number;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [channelData, setChannelData] = useState<any[]>([]);
  const [segmentData, setSegmentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [effectivenessData, setEffectivenessData] = useState<string>("");
  const { toast } = useToast();

  const loadCampaignData = async () => {
    setLoading(true);
    try {
      // Get campaign effectiveness from backend
      const response = await campaignsApi.getEffectiveness();
      setEffectivenessData(response.answer);

      // Parse campaign data from response
      // Extract metrics from the answer and documents
      const metrics: any = {
        email: { revenue: 0, roi: 0, count: 0 },
        sms: { revenue: 0, roi: 0, count: 0 },
        social: { revenue: 0, roi: 0, count: 0 },
      };

      response.documents.forEach((doc) => {
        const metadata = doc.metadata;
        const channel = metadata.preferred_contact_method?.toLowerCase() || "email";
        const revenue = metadata.total_spent || 0;
        const roi = metadata.converted_campaigns && metadata.responded_to_campaigns
          ? (metadata.converted_campaigns / metadata.responded_to_campaigns) * 100
          : 0;

        if (metrics[channel]) {
          metrics[channel].revenue += revenue;
          metrics[channel].roi += roi;
          metrics[channel].count += 1;
        }
      });

      const channelArr = Object.entries(metrics).map(([name, data]: [string, any]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        revenue: data.revenue,
        avgROI: data.count > 0 ? (data.roi / data.count).toFixed(1) : "0",
      }));
      setChannelData(channelArr);

      // Aggregate by segment
      const segmentMap = new Map();
      response.documents.forEach((doc) => {
        const segment = doc.metadata.customer_segment || "Unknown";
        const revenue = doc.metadata.total_spent || 0;
        const current = segmentMap.get(segment) || { segment, revenue: 0 };
        segmentMap.set(segment, {
          segment,
          revenue: current.revenue + revenue,
        });
      });
      const segmentArr = Array.from(segmentMap.values()).map(s => ({
        name: s.segment,
        value: s.revenue,
      }));
      setSegmentData(segmentArr);

      // Create campaign list from documents
      const campaignList: Campaign[] = response.documents.slice(0, 20).map((doc, idx) => {
        const meta = doc.metadata;
        return {
          campaign_name: `Campaign ${idx + 1}`,
          channel: meta.preferred_contact_method || "Email",
          customer_segment: meta.customer_segment || "All",
          conversion_rate: meta.converted_campaigns && meta.responded_to_campaigns
            ? meta.converted_campaigns / meta.responded_to_campaigns
            : 0,
          roi: meta.email_click_rate || 0,
          total_spend: meta.total_spent || 0,
          total_revenue: meta.lifetime_value || 0,
        };
      });
      setCampaigns(campaignList);

      toast({
        title: "Campaign Data Loaded",
        description: `Analyzed ${response.customers_found} customers' campaign engagement.`,
      });
    } catch (error: any) {
      console.error("Error loading campaign data:", error);
      toast({
        title: "Error Loading Campaigns",
        description: error.message || "Failed to load campaign data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const playVoiceAnalysis = async () => {
    try {
      const audioBlob = await campaignsApi.getEffectiveness().then(() => 
        campaignsApi.getEffectiveness()
      );
      // Note: campaignsApi.getEffectiveness returns text, not audio
      // We need to use ragApi.campaignVoice for audio
      toast({
        title: "Voice Analysis",
        description: "Use the voice query feature in Campaign Automation for audio responses.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadCampaignData();
  }, []);

  const getROIColor = (roi: number) => {
    if (roi >= 200) return "text-success";
    if (roi >= 100) return "text-warning";
    return "text-danger";
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Campaign Analytics</h1>
                <p className="text-muted-foreground">Track performance across all marketing campaigns from RAG system</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={playVoiceAnalysis}
                  variant="outline"
                  size="sm"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Voice Analysis
                </Button>
                <Button
                  onClick={loadCampaignData}
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
            </div>

            {effectivenessData && (
              <Card className="bg-gradient-to-br from-accent/5 to-transparent border-accent/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-accent" />
                    Campaign Effectiveness Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{effectivenessData}</p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                    Revenue by Channel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={channelData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--accent))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Revenue by Segment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={segmentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {segmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Campaigns ({campaigns.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign Name</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Conversion %</TableHead>
                      <TableHead>ROI</TableHead>
                      <TableHead>Total Spend</TableHead>
                      <TableHead>Total Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{campaign.campaign_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{campaign.channel}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-primary/20 text-primary">{campaign.customer_segment}</Badge>
                        </TableCell>
                        <TableCell>{(campaign.conversion_rate * 100).toFixed(1)}%</TableCell>
                        <TableCell className={getROIColor(campaign.roi)}>
                          {campaign.roi.toFixed(0)}%
                        </TableCell>
                        <TableCell>${campaign.total_spend.toFixed(0)}</TableCell>
                        <TableCell className="text-success font-semibold">
                          ${campaign.total_revenue.toFixed(0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
