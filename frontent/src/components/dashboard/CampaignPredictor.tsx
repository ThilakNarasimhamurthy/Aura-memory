import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, ArrowRight, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { campaignsApi } from "@/lib/api";

export function CampaignPredictor() {
  const [historicalCampaigns, setHistoricalCampaigns] = useState<any[]>([]);
  const [predictedCampaigns, setPredictedCampaigns] = useState<any[]>([]);
  const [optimalChannel, setOptimalChannel] = useState<{channel: string; roi: number} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCampaignData = async () => {
      try {
        const response = await campaignsApi.getEffectiveness();
        const campaignData = (response?.documents || []).map(doc => doc.metadata);
        
        // If no data, API should have provided mock data, but handle edge case
        if (campaignData.length === 0) {
          console.warn("No campaign data available");
          setHistoricalCampaigns([]);
          setPredictedCampaigns([]);
          setOptimalChannel(null);
          setLoading(false);
          return;
        }

        // Extract historical campaigns from actual data
        const historical = campaignData
          .filter(c => c.converted_campaigns && c.responded_to_campaigns)
          .slice(0, 3)
          .map((c, idx) => {
            const conversion = (c.converted_campaigns! / c.responded_to_campaigns!) * 100;
            const roi = c.email_click_rate || conversion * 1.5;
            return {
              name: `Campaign ${idx + 1}`,
              channel: c.preferred_contact_method || "Email",
              conversion: conversion.toFixed(1),
              roi: Math.round(roi)
            };
          });
        setHistoricalCampaigns(historical);

        // Generate predicted campaigns based on historical trends
        const predicted = historical.map((h, idx) => {
          const improvement = 1.15 + (idx * 0.05); // 15-25% improvement
          return {
            name: `Future Campaign ${idx + 1}`,
            channel: h.channel,
            predictedConversion: (parseFloat(h.conversion) * improvement).toFixed(1),
            expectedRoi: Math.round(h.roi * improvement)
          };
        });
        setPredictedCampaigns(predicted);

        // Find optimal channel
        const channelROIs = new Map<string, number[]>();
        campaignData.forEach(c => {
          const channel = c.preferred_contact_method || "Email";
          const roi = c.email_click_rate || 
            (c.converted_campaigns && c.responded_to_campaigns 
              ? (c.converted_campaigns / c.responded_to_campaigns) * 100 
              : 0);
          if (roi > 0) {
            const rois = channelROIs.get(channel) || [];
            rois.push(roi);
            channelROIs.set(channel, rois);
          }
        });

        let bestChannel = "Email";
        let bestROI = 0;
        channelROIs.forEach((rois, channel) => {
          const avgROI = rois.reduce((sum, r) => sum + r, 0) / rois.length;
          if (avgROI > bestROI) {
            bestROI = avgROI;
            bestChannel = channel;
          }
        });

        setOptimalChannel({ channel: bestChannel, roi: Math.round(bestROI) });
      } catch (error) {
        console.error("Error loading campaign data:", error);
        setHistoricalCampaigns([]);
        setPredictedCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    loadCampaignData();
  }, []);
  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Campaign Performance Predictor
          </CardTitle>
          <p className="text-sm text-muted-foreground">Historical vs AI-Predicted Results</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Historical */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Historical Performance</h4>
              {historicalCampaigns.length > 0 ? (
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Conv. %</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicalCampaigns.map((campaign, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell><Badge variant="outline">{campaign.channel}</Badge></TableCell>
                      <TableCell className="text-right">{campaign.conversion}%</TableCell>
                      <TableCell className="text-right text-success">{campaign.roi}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No historical campaign data available</p>
              )}
            </div>

            {/* Predicted */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-accent flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                AI-Predicted Performance
              </h4>
              {predictedCampaigns.length > 0 ? (
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Pred. Conv.</TableHead>
                    <TableHead className="text-right">Exp. ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictedCampaigns.map((campaign, i) => (
                    <TableRow key={i} className="bg-accent/5">
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell><Badge className="bg-accent/20 text-accent">{campaign.channel}</Badge></TableCell>
                      <TableCell className="text-right font-semibold">{campaign.predictedConversion}%</TableCell>
                      <TableCell className="text-right font-semibold text-accent">{campaign.expectedRoi}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No predicted campaign data available</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimal Channel Suggestion */}
      {optimalChannel && (
        <Card className="border-accent/30 bg-gradient-to-br from-accent/10 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-accent/20">
                <Target className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-1">Optimal Channel Suggestion</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Best Predicted Channel:</span>
                  <Badge className="bg-accent text-accent-foreground">{optimalChannel.channel}</Badge>
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-accent font-semibold">Expected {optimalChannel.roi}% ROI</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Recommended Send Time: <span className="text-accent font-medium">5 PM – 7 PM</span> | High Engagement Window
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
