import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const purchasePrediction = [
  { day: "Mon", morning: 45, afternoon: 78, evening: 92 },
  { day: "Tue", morning: 52, afternoon: 85, evening: 88 },
  { day: "Wed", morning: 48, afternoon: 92, evening: 95 },
  { day: "Thu", morning: 65, afternoon: 98, evening: 87 },
  { day: "Fri", morning: 70, afternoon: 95, evening: 100 },
  { day: "Sat", morning: 88, afternoon: 100, evening: 95 },
  { day: "Sun", morning: 92, afternoon: 98, evening: 90 }
];

const categoryData = [
  { name: "Cold Brew", value: 35, color: "hsl(180, 85%, 55%)" },
  { name: "Latte", value: 28, color: "hsl(25, 45%, 45%)" },
  { name: "Cappuccino", value: 22, color: "hsl(160, 84%, 39%)" },
  { name: "Espresso", value: 15, color: "hsl(38, 92%, 50%)" }
];

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
  const { toast } = useToast();

  const handleGenerateCampaign = async (category: string) => {
    setIsGenerating(true);
    setShowDialog(true);
    setCampaignResult(null);

    try {
      const period = dateRange === "7days" ? "7days" : dateRange === "30days" ? "30days" : "7days";
      
      const { data, error } = await supabase.functions.invoke("generate-campaign", {
        body: {
          type: "category-campaign",
          category,
          period,
          historicalData: `Customer preference analysis shows ${category} is trending. Generate targeted campaigns.`
        }
      });

      if (error) throw error;

      setCampaignResult(data);
      toast({
        title: "Campaign Generated!",
        description: `AI-powered ${period === "7days" ? "7-day" : "30-day"} campaign plan ready for ${category}.`,
      });
    } catch (error: any) {
      console.error("Error generating campaign:", error);
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
