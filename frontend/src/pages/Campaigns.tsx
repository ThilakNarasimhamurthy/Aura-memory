import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Target, Loader2, RefreshCw } from "lucide-react";
import { campaignsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { getCachedData, setCachedData } from "@/lib/dataCache";

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

  const loadCampaignData = async (forceRefresh: boolean = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedCampaigns = getCachedData<Campaign[]>('campaigns_list');
      const cachedChannelData = getCachedData<any[]>('campaigns_channel');
      const cachedSegmentData = getCachedData<any[]>('campaigns_segment');
      const cachedEffectiveness = getCachedData<string>('campaigns_effectiveness');
      
      if (cachedCampaigns && cachedChannelData && cachedSegmentData) {
        setCampaigns(cachedCampaigns);
        setChannelData(cachedChannelData);
        setSegmentData(cachedSegmentData);
        if (cachedEffectiveness) {
          setEffectivenessData(cachedEffectiveness);
        }
        setLoading(false);
        return;
      }
    }
    
    setLoading(true);
    try {
      // Get revenue by channel and segment from backend APIs
      const [channelResponse, segmentResponse, effectivenessResponse] = await Promise.all([
        campaignsApi.getRevenueByChannel(),
        campaignsApi.getRevenueBySegment(),
        campaignsApi.getEffectiveness()
      ]);

      // Set revenue by channel data
      let channelArr: any[] = [];
      if (channelResponse && channelResponse.length > 0) {
        channelArr = channelResponse.map((channel: any) => ({
          name: channel.name || "Unknown",
          revenue: channel.revenue || 0,
          avgROI: channel.roi || 0,
        }));
        setChannelData(channelArr);
      } else {
        setChannelData([]);
      }

      // Set revenue by segment data
      let segmentArr: any[] = [];
      if (segmentResponse && segmentResponse.length > 0) {
        segmentArr = segmentResponse.map((segment: any) => ({
          name: segment.name || "Unknown",
          value: segment.value || segment.revenue || 0,
        }));
        setSegmentData(segmentArr);
      } else {
        setSegmentData([]);
      }

      // Get campaign effectiveness from backend
      const response = effectivenessResponse;
      
      // Ensure response is valid
      if (!response) {
        setEffectivenessData("Unable to load campaign data. Please try again.");
        setCampaigns([]);
        if (forceRefresh) {
          toast({
            title: "No Campaign Data",
            description: "No campaign data found in the database. Please import campaign data first.",
            variant: "destructive",
          });
        }
        return;
      }
      
      const effectivenessText = response.answer || "Campaign analysis generated.";
      setEffectivenessData(effectivenessText);

      // Ensure documents array exists
      const documents = Array.isArray(response.documents) ? response.documents : [];
      
      // If no documents, show message and return early
      if (documents.length === 0) {
        setCampaigns([]);
        toast({
          title: "No Campaign Data Available",
          description: "No campaigns found in the database. Please import campaign data to see analytics.",
          variant: "destructive",
        });
        return;
      }

      // Create campaign list from documents - no limit, show all campaigns
      const campaignList: Campaign[] = documents.map((doc, idx) => {
        const meta = doc.metadata;
        
        // Get campaign name (try multiple fields)
        const campaign_name = meta.campaign_name || meta.name || `Campaign ${idx + 1}`;
        
        // Get channel (try multiple fields)
        const channel = meta.channel || meta.preferred_contact_method || "Email";
        
        // Get customer segment (try multiple fields)
        const customer_segment = meta.customer_segment || meta.target_segment || "All";
        
        // Get conversion rate (use campaign conversion_rate if available, otherwise calculate)
        let conversion_rate = 0;
        if (meta.conversion_rate !== undefined && meta.conversion_rate !== null) {
          conversion_rate = typeof meta.conversion_rate === 'number' 
            ? meta.conversion_rate / 100  // Convert percentage to decimal
            : parseFloat(String(meta.conversion_rate)) / 100;
        } else {
          // Calculate from responded/converted
        const converted = typeof meta.converted_campaigns === 'number'
          ? meta.converted_campaigns
          : parseInt(String(meta.converted_campaigns || 0), 10);
        const responded = typeof meta.responded_to_campaigns === 'number'
          ? meta.responded_to_campaigns
          : parseInt(String(meta.responded_to_campaigns || 0), 10);
          conversion_rate = responded > 0 ? converted / responded : 0;
        }
        
        // Get ROI (use campaign roi if available, otherwise calculate from click_rate)
        let roi = 0;
        if (meta.roi !== undefined && meta.roi !== null) {
          roi = typeof meta.roi === 'number' 
            ? meta.roi
            : parseFloat(String(meta.roi || 0));
        } else {
        const click_rate = typeof meta.email_click_rate === 'number'
          ? meta.email_click_rate
          : parseFloat(String(meta.email_click_rate || 0));
          roi = click_rate; // Use click rate as ROI proxy
        }
        
        // Get total spend (use campaign total_spend if available)
        const total_spend = typeof meta.total_spend === 'number'
          ? meta.total_spend
          : (typeof meta.total_spent === 'number'
          ? meta.total_spent
            : parseFloat(String(meta.total_spent || 0)));
        
        // Get total revenue (use campaign total_revenue if available)
        const total_revenue = typeof meta.total_revenue === 'number'
          ? meta.total_revenue
          : (typeof meta.lifetime_value === 'number'
          ? meta.lifetime_value
            : parseFloat(String(meta.lifetime_value || total_spend)));
        
        return {
          campaign_name,
          channel,
          customer_segment,
          conversion_rate,
          roi,
          total_spend,
          total_revenue,
        };
      });
      setCampaigns(campaignList);

      // Cache the data
      setCachedData('campaigns_list', campaignList);
      setCachedData('campaigns_channel', channelArr);
      setCachedData('campaigns_segment', segmentArr);
      setCachedData('campaigns_effectiveness', effectivenessText);

      // Show appropriate message based on data availability (only on force refresh)
      if (forceRefresh) {
        if (campaignList.length === 0) {
          toast({
            title: "No Campaign Data Available",
            description: "No campaigns found in the database. Please import campaign data to see analytics.",
            variant: "destructive",
          });
        } else {
          const customerCount = response.customers_found || campaignList.length;
          toast({
            title: "Campaign Data Refreshed",
            description: `Analyzed ${customerCount} campaign${campaignList.length !== 1 ? 's' : ''} with engagement data.`,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error Loading Campaigns",
        description: error.message || "Failed to load campaign data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadCampaignData(false); // Don't force refresh on mount
  }, []); // Empty dependency array - only run on mount

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
              <Button
                onClick={() => loadCampaignData(true)} // Force refresh
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
                        label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
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
                        <TableCell>{Math.round(campaign.conversion_rate * 100)}%</TableCell>
                        <TableCell className={getROIColor(campaign.roi)}>
                          {Math.round(campaign.roi)}%
                        </TableCell>
                        <TableCell>${Math.round(campaign.total_spend)}</TableCell>
                        <TableCell className="text-success font-semibold">
                          ${Math.round(campaign.total_revenue)}
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
