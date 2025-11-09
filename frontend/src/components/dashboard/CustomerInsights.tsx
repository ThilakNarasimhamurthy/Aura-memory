import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { customersApi } from "@/lib/api";
import { getCachedData, setCachedData } from "@/lib/dataCache";
import { ragApi } from "@/lib/api";

// These will be populated from real data

interface CampaignResult {
  campaigns: Array<{
    day: string;
    date: string;
    bannerDescription: string;
    caption: string;
    story: string;
    timing: string;
    channel: string;
    channelReason: string;
    emailContent?: string;
    smsContent?: string;
    banner?: string;
  }>;
}

export function CustomerInsights({ dateRange }: { dateRange: string }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [campaignResult, setCampaignResult] = useState<CampaignResult | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [purchasePrediction, setPurchasePrediction] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadCustomerInsights = async () => {
      // Check cache first
      const cachedPurchasePred = getCachedData<any[]>('customer_insights_purchase_prediction');
      const cachedCategoryData = getCachedData<any[]>('customer_insights_category_data');
      if (cachedPurchasePred && cachedCategoryData) {
        setPurchasePrediction(cachedPurchasePred);
        setCategoryData(cachedCategoryData);
        setLoading(false);
        return;
      }
      
      try {
        // Try structured data API first
        let response;
        try {
          response = await customersApi.findActive(1000); // Reduced for performance
        } catch (error) {
          // Try direct API call
          const directResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/customers?limit=1000`); // Reduced for performance
          if (directResponse.ok) {
            const data = await directResponse.json();
            if (data.success && data.customers) {
              // Convert to expected format
              response = {
                documents: data.customers.map((c: any) => ({
                  content: `${c.first_name} ${c.last_name} is a ${c.customer_segment} customer`,
                  metadata: c,
                })),
                customers_found: data.customers.length,
              };
            }
          }
        }
        
        const customerData = (response?.documents || []).map(doc => doc.metadata);
        
        // Handle empty data state
        if (customerData.length === 0) {
          setPurchasePrediction([]);
          setCategoryData([]);
          setLoading(false);
          return;
        }

        // Generate purchase prediction based on customer purchase patterns
        // Use total_purchases and total_spent to estimate daily patterns
        const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const purchasePred = days.map((day, dayIndex) => {
          // Simulate time-of-day patterns based on customer engagement
          const baseEngagement = customerData
            .filter(c => c.total_purchases && c.total_purchases > 0)
            .length;
          
          // Morning (7-11 AM): Lower engagement
          const morning = Math.floor(baseEngagement * 0.4 + (dayIndex % 3) * 5);
          // Afternoon (12-5 PM): Medium-high engagement
          const afternoon = Math.floor(baseEngagement * 0.7 + (dayIndex % 4) * 8);
          // Evening (6-9 PM): Highest engagement
          const evening = Math.floor(baseEngagement * 0.9 + (dayIndex % 5) * 10);

          return {
            day,
            morning: Math.min(100, morning),
            afternoon: Math.min(100, afternoon),
            evening: Math.min(100, evening)
          };
        });
        setPurchasePrediction(purchasePred);

        // Generate category data from favorite_product_category
        const categoryMap = new Map<string, number>();
        customerData.forEach(c => {
          const category = c.favorite_product_category || "Other";
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        });

        const colors = [
          "hsl(180, 85%, 55%)",
          "hsl(25, 45%, 45%)",
          "hsl(160, 84%, 39%)",
          "hsl(38, 92%, 50%)",
          "hsl(280, 70%, 50%)",
          "hsl(200, 80%, 60%)"
        ];

        const totalCustomers = customerData.length;
        const categoryArr = Array.from(categoryMap.entries())
          .map(([name, count], index) => ({
            name,
            value: Math.round((count / totalCustomers) * 100),
            color: colors[index % colors.length]
          }))
          .sort((a, b) => b.value - a.value)
          // Show all categories, not just top 4

        setCategoryData(categoryArr);
        
        // Cache the data
        setCachedData('customer_insights_purchase_prediction', purchasePred);
        setCachedData('customer_insights_category_data', categoryArr);
      } catch (error) {
        // Set default empty data on error
        setPurchasePrediction([]);
        setCategoryData([]);
      } finally {
        setLoading(false);
      }
    };

    loadCustomerInsights();
  }, [dateRange]);

  const handleGenerateCampaign = async (category: string) => {
    setIsGenerating(true);
    setShowDialog(true);
    setCampaignResult(null);

    try {
      const period = dateRange === "7days" ? "7days" : dateRange === "30days" ? "30days" : "7days";
      
      // Use backend RAG API to generate campaign
      const query = `Generate a ${period === "7days" ? "7-day" : "30-day"} marketing campaign plan for ${category} category. Customer preference analysis shows ${category} is trending. Create targeted campaigns with specific days, captions, and campaign types.`;
      
      const response = await ragApi.campaignQuery(query);
      
      // Format the response as campaign data
      const campaignData = {
        category,
        period,
        campaigns: response.documents?.map((doc: any, index: number) => ({
          day: `Day ${index + 1}`,
          date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          bannerDescription: doc.metadata?.title || `Campaign ${index + 1} for ${category}`,
          caption: doc.content || doc.metadata?.title || `Campaign ${index + 1} for ${category}`,
          story: doc.content || "",
          timing: "09:00 AM",
          channel: "Email",
          channelReason: "Targeted email campaign for optimal engagement",
          type: "category-campaign"
        })) || [],
        answer: response.answer || `Generated ${period === "7days" ? "7-day" : "30-day"} campaign plan for ${category}`
      };

      setCampaignResult(campaignData);
      toast({
        title: "Campaign Generated!",
        description: `AI-powered ${period === "7days" ? "7-day" : "30-day"} campaign plan ready for ${category}.`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Unable to generate campaign. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Purchase Prediction Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                Next Purchase Prediction
              </CardTitle>
              <p className="text-xs text-muted-foreground">Highest likelihood by day & time ({dateRange})</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={purchasePrediction}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                    <Bar dataKey="morning" stackId="a" fill="hsl(160, 84%, 39%)" />
                    <Bar dataKey="afternoon" stackId="a" fill="hsl(180, 85%, 55%)" />
                    <Bar dataKey="evening" stackId="a" fill="hsl(25, 45%, 45%)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Predicted Category Change */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Predicted Favorite Categories
              </CardTitle>
              <p className="text-xs text-muted-foreground">Upcoming product preferences ({dateRange})</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : categoryData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {categoryData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.name} ({item.value}%)</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2 text-xs"
                      onClick={() => handleGenerateCampaign(item.name)}
                    >
                      <Sparkles className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No category data available
                </div>
              )}
            </CardContent>
        </Card>
      </div>
    </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI-Generated Campaign Plan</DialogTitle>
          </DialogHeader>
          {isGenerating ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <span className="ml-3 text-muted-foreground">Generating AI-powered campaigns...</span>
            </div>
          ) : campaignResult ? (
            <div className="space-y-6">
              {campaignResult.campaigns.map((campaign, idx) => (
                <Card key={idx} className="border-accent/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>{campaign.day} - {campaign.date}</span>
                      <span className="text-sm font-normal text-accent">{campaign.channel}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {campaign.banner && (
                      <img src={campaign.banner} alt="Campaign banner" className="w-full rounded-lg border" />
                    )}
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Caption</h4>
                      <p className="text-sm text-muted-foreground">{campaign.caption}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Story</h4>
                      <p className="text-sm text-muted-foreground">{campaign.story}</p>
                    </div>
                    {campaign.emailContent && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">📧 Email Content</h4>
                        <div className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded whitespace-pre-wrap">
                          {campaign.emailContent}
                        </div>
                      </div>
                    )}
                    {campaign.smsContent && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">📱 SMS Content</h4>
                        <div className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded">
                          {campaign.smsContent}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                      <span>⏰ Best Time: {campaign.timing}</span>
                      <span>📢 {campaign.channelReason}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
