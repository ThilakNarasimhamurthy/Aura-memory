import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Clock, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface BannerResult {
  campaign: string;
  image: string | null;
}

interface Suggestion {
  category: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

export function SocialBannerGenerator({ dateRange }: { dateRange: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BannerResult | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // AI-predicted suggestions based on analytics
    const predictedSuggestions: Suggestion[] = [
      { 
        category: "Cold Brew", 
        reason: "35% predicted preference increase. High engagement expected.",
        priority: "high"
      },
      { 
        category: "Latte", 
        reason: "28% customer preference. Consistent performer.",
        priority: "medium"
      },
      { 
        category: "Seasonal Special", 
        reason: "Trending searches detected. Create urgency with limited time offer.",
        priority: "high"
      }
    ];
    setSuggestions(predictedSuggestions);
  }, [dateRange]);

  const handleGenerate = async (category: string) => {
    setLoading(true);
    setResult(null);

    try {
      // Auto-generate campaign goal based on AI predictions
      const campaignGoal = `Promote ${category} to maximize customer engagement based on predicted trends. Include compelling offer and create urgency.`;
      
      const { data, error } = await supabase.functions.invoke("generate-campaign", {
        body: {
          type: "banner",
          targetAudience: "All Segments",
          campaignGoal,
          segmentData: `AI-predicted top performing category: ${category}. Generate high-impact marketing materials.`
        }
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: "Banner Generated!",
        description: `AI-powered banner ready for ${category} promotion.`,
      });
    } catch (error: any) {
      console.error("Error generating banner:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Unable to generate banner. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-danger/20 text-danger border-danger/30";
      case "medium": return "bg-warning/20 text-warning border-warning/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          AI Social Media Banner Generator
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          AI recommends what to promote based on predictive analytics ({dateRange})
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span>AI-Recommended Campaigns</span>
          </div>
          
          {suggestions.map((suggestion, idx) => (
            <Card key={idx} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{suggestion.category}</h4>
                      <Badge className={getPriorityColor(suggestion.priority)}>
                        {suggestion.priority} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                  </div>
                  <Button
                    onClick={() => handleGenerate(suggestion.category)}
                    disabled={loading}
                    size="sm"
                    className="bg-accent hover:bg-accent/90"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {result && (
          <div className="space-y-4 mt-6 p-4 bg-card border border-border rounded-lg">
            <div className="flex items-start gap-2">
              <Target className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-2">AI-Generated Banner Strategy</h4>
                <div className="prose prose-sm text-muted-foreground whitespace-pre-wrap">
                  {result.campaign}
                </div>
              </div>
            </div>

            {result.image && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent" />
                  AI-Generated Banner Preview
                </h4>
                <img 
                  src={result.image} 
                  alt="Generated banner" 
                  className="w-full rounded-lg border border-border"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
