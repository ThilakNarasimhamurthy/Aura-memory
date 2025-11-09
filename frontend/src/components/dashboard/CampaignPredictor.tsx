import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, ArrowRight, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { campaignsApi } from "@/lib/api";
import { formatPercentage } from "@/lib/utils/format";
import { getCachedData, setCachedData } from "@/lib/dataCache";

export function CampaignPredictor() {
  const [historicalCampaigns, setHistoricalCampaigns] = useState<any[]>([]);
  const [predictedCampaigns, setPredictedCampaigns] = useState<any[]>([]);
  const [optimalChannel, setOptimalChannel] = useState<{channel: string; roi: number} | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [optimalSendTime, setOptimalSendTime] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCampaignData = async () => {
      // Check cache first
      const cachedHistorical = getCachedData<any[]>('campaign_predictor_historical');
      const cachedPredicted = getCachedData<any[]>('campaign_predictor_predicted');
      const cachedOptimalChannel = getCachedData<{channel: string; roi: number} | null>('campaign_predictor_optimal_channel');
      const cachedRecommendations = getCachedData<string[]>('campaign_predictor_recommendations');
      const cachedSendTime = getCachedData<string>('campaign_predictor_send_time');
      
      if (cachedHistorical && cachedPredicted) {
        setHistoricalCampaigns(cachedHistorical);
        setPredictedCampaigns(cachedPredicted);
        if (cachedOptimalChannel) setOptimalChannel(cachedOptimalChannel);
        if (cachedRecommendations) setAiRecommendations(cachedRecommendations);
        if (cachedSendTime) setOptimalSendTime(cachedSendTime);
        setLoading(false);
        return;
      }
      
      try {
        // Get historical campaigns and AI predictions in parallel
        const [effectivenessResponse, predictedResponse] = await Promise.all([
          campaignsApi.getEffectiveness(),
          campaignsApi.getPredictedPerformance("general", "all", "all")
        ]);

        const campaignData = (effectivenessResponse?.documents || []).map(doc => doc.metadata);
        
        // Handle empty data state
        if (campaignData.length === 0) {
          setHistoricalCampaigns([]);
          setPredictedCampaigns([]);
          setOptimalChannel(null);
          setLoading(false);
          return;
        }

        // Extract historical campaigns from actual data
        const historical = campaignData
          .filter(c => {
            // Use conversion_rate if available, otherwise check converted/responded
            if (c.conversion_rate !== undefined && c.conversion_rate !== null) {
              return true;
            }
            return c.converted_campaigns && c.responded_to_campaigns && 
                   !isNaN(c.converted_campaigns!) && !isNaN(c.responded_to_campaigns!) &&
                   c.responded_to_campaigns! > 0;
          })
          .map((c, idx) => {
            // Use conversion_rate from campaign data if available
            let conversion = 0;
            if (c.conversion_rate !== undefined && c.conversion_rate !== null) {
              conversion = typeof c.conversion_rate === 'number' ? c.conversion_rate : parseFloat(String(c.conversion_rate));
            } else if (c.converted_campaigns && c.responded_to_campaigns) {
              conversion = (c.converted_campaigns! / c.responded_to_campaigns!) * 100;
            }
            const safeConversion = isNaN(conversion) || !isFinite(conversion) ? 0 : conversion;
            
            // Use ROI from campaign data if available
            let roi = 0;
            if (c.roi !== undefined && c.roi !== null) {
              roi = typeof c.roi === 'number' ? c.roi : parseFloat(String(c.roi));
            } else if (c.email_click_rate && !isNaN(c.email_click_rate!)) {
              roi = c.email_click_rate!;
            } else {
              roi = safeConversion * 1.5;
            }
            const safeROI = isNaN(roi) || !isFinite(roi) ? 0 : roi;
            
            // Extract campaign name and type
            const campaignName = c.campaign_name || c.name || `Campaign ${idx + 1}`;
            const campaignType = c.type || c.campaign_type || "Campaign";
            
            // Extract campaign_id or number from name for sorting
            // Campaign names like "Campaign 50" or "Discount Campaign 41" have numbers at the end
            let sortKey = 0;
            if (c.campaign_id) {
              sortKey = typeof c.campaign_id === 'number' ? c.campaign_id : parseInt(String(c.campaign_id).replace(/\D/g, '')) || 0;
            } else if (c.created_at) {
              // Use created_at timestamp if available
              sortKey = new Date(c.created_at).getTime();
            } else {
              // Extract number from campaign name (e.g., "Campaign 50" -> 50)
              const match = campaignName.match(/(\d+)(?:\s*$|(?:\s|%))/);
              sortKey = match ? parseInt(match[1]) : idx;
            }
            
            return {
              name: campaignName,
              channel: c.channel || c.preferred_contact_method || "Email",
              conversion: Math.round(safeConversion),
              roi: Math.round(Math.max(0, safeROI)),
              type: campaignType,
              sortKey: sortKey, // For sorting by recency
            };
          })
          // Sort by sortKey descending (most recent first, higher numbers = more recent)
          .sort((a, b) => b.sortKey - a.sortKey)
          // Take only the last 3 campaigns (most recent)
          .slice(0, 3)
          // Remove sortKey from final objects
          .map(({ sortKey, ...campaign }) => campaign);
        
        setHistoricalCampaigns(historical);

        // Variables to store for caching
        let finalPredicted: any[] = [];
        let finalOptimalChannel: {channel: string; roi: number} | null = null;
        let finalRecommendations: string[] = [];
        let finalSendTime: string = "";

        // Use AI predictions if available, otherwise generate predictions based on historical trends
        if (predictedResponse && predictedResponse.predictions) {
          const predictions = predictedResponse.predictions;
          
          // Create predicted campaigns from AI predictions
          // Use historical campaign names and types to generate meaningful predicted campaign names
          const predicted = [];
          
          // Get unique campaign types and channels from historical data
          const campaignTypes = [...new Set(campaignData.map(c => c.type || c.campaign_type || "Campaign").filter(Boolean))];
          const channels = ["Email", "SMS", "Social Media", "In-App"];
          
          // Generate predicted campaigns based on ALL historical campaigns
          for (let i = 0; i < historical.length; i++) {
            const hist = historical[i];
            const campaignType = hist.type || campaignTypes[i % campaignTypes.length] || "Campaign";
            
            // Use AI predictions with some variation per campaign
            const variation = 1.0 + (i * 0.03); // Small variation between campaigns
            const predictedConversion = (predictions.predicted_conversion_rate * variation);
            const predictedResponseRate = (predictions.predicted_response_rate * variation);
            const expectedRoi = (predictions.predicted_roi * variation);
            
            // Generate meaningful campaign name based on historical campaign name
            // Extract the base name from historical campaign (remove numbers, "Campaign" suffix)
            let campaignName = hist.name || "";
            if (campaignName) {
              // Remove trailing numbers (e.g., "Campaign 1" -> "Campaign")
              campaignName = campaignName
                .replace(/\s+\d+\s*$/, '') // Remove trailing space and numbers
                .trim();
              
              // If the name ends with "Campaign", remove it and we'll add it back
              // This handles cases like "Discount Campaign" -> "Future Discount Campaign"
              if (campaignName.toLowerCase().endsWith(' campaign')) {
                campaignName = campaignName.slice(0, -9).trim(); // Remove " Campaign"
              }
              
              // If we have a meaningful name (more than just whitespace), use it
              if (campaignName && campaignName.length > 2) {
                campaignName = `Future ${campaignName} Campaign`;
              } else {
                // Fallback to type-based name
                campaignName = `Future ${campaignType} Campaign`;
              }
            } else {
              // No historical name, use type-based name
              campaignName = `Future ${campaignType} Campaign`;
            }
            
            predicted.push({
              name: campaignName,
              channel: hist.channel || channels[i % channels.length],
              predictedConversion: Math.round(Math.max(0, predictedConversion)),
              predictedResponseRate: Math.round(Math.max(0, predictedResponseRate)),
              expectedRoi: Math.round(Math.max(0, expectedRoi)),
              confidence: predictions.confidence_score,
            });
          }
          
          // If we need more predicted campaigns (only if no historical data), add them with different channels
          if (predicted.length === 0) {
            const usedChannels = new Set(predicted.map(p => p.channel));
            // Only add a few sample campaigns if we have no historical data
            for (let i = predicted.length; i < Math.min(3, channels.length); i++) {
              const availableChannels = channels.filter(c => !usedChannels.has(c));
              const channel = availableChannels.length > 0 
                ? availableChannels[i % availableChannels.length]
                : channels[i % channels.length];
              const campaignType = campaignTypes.length > 0 
                ? campaignTypes[i % campaignTypes.length]
                : "Campaign";
              
              const variation = 1.0 + (i * 0.03);
              const predictedConversion = (predictions.predicted_conversion_rate * variation);
              const predictedResponseRate = (predictions.predicted_response_rate * variation);
              const expectedRoi = (predictions.predicted_roi * variation);
              
              predicted.push({
                name: `Future ${campaignType} Campaign`,
                channel: channel,
                predictedConversion: Math.round(Math.max(0, predictedConversion)),
                predictedResponseRate: Math.round(Math.max(0, predictedResponseRate)),
                expectedRoi: Math.round(Math.max(0, expectedRoi)),
                confidence: predictions.confidence_score,
              });
              usedChannels.add(channel);
            }
          }
          
          finalPredicted = predicted;
          setPredictedCampaigns(predicted);
          
          // Use optimal channel from AI predictions
          if (predictedResponse.optimal_channel) {
            finalOptimalChannel = {
              channel: predictedResponse.optimal_channel.channel,
              roi: Math.round(predictedResponse.optimal_channel.expected_roi),
            };
            setOptimalChannel(finalOptimalChannel);
          } else {
            finalOptimalChannel = {
              channel: "Email",
              roi: Math.round(predictions.predicted_roi),
            };
            setOptimalChannel(finalOptimalChannel);
          }
          
          // Set AI recommendations and optimal send time
          finalRecommendations = predictions.recommendations || [];
          finalSendTime = predictions.optimal_send_time || "Thursday 4-6 PM";
          setAiRecommendations(finalRecommendations);
          setOptimalSendTime(finalSendTime);
        } else {
          // Fallback: Generate predicted campaigns based on historical trends
          const predicted = historical.map((h, idx) => {
            const improvement = 1.15 + (idx * 0.05); // 15-25% improvement
            const baseConversion = parseFloat(h.conversion) || 0;
            const baseROI = h.roi || 0;
            const predictedConversion = isNaN(baseConversion) ? 0 : baseConversion * improvement;
            const expectedRoi = isNaN(baseROI) ? 0 : baseROI * improvement;
            return {
              name: `Future Campaign ${idx + 1}`,
              channel: h.channel,
              predictedConversion: Math.round(Math.max(0, predictedConversion)),
              expectedRoi: Math.round(Math.max(0, expectedRoi)),
            };
          });
          finalPredicted = predicted;
          setPredictedCampaigns(predicted);

          // Find optimal channel from historical data
          const channelROIs = new Map<string, number[]>();
          campaignData.forEach(c => {
            const channel = c.channel || c.preferred_contact_method || "Email";
            let roi = 0;
            if (c.roi !== undefined && c.roi !== null) {
              roi = typeof c.roi === 'number' ? c.roi : parseFloat(String(c.roi));
            } else if (c.email_click_rate && !isNaN(c.email_click_rate!)) {
              roi = c.email_click_rate!;
            } else if (c.converted_campaigns && c.responded_to_campaigns && 
                       !isNaN(c.converted_campaigns!) && !isNaN(c.responded_to_campaigns!) &&
                       c.responded_to_campaigns! > 0) {
              roi = (c.converted_campaigns! / c.responded_to_campaigns!) * 100;
            }
            if (!isNaN(roi) && isFinite(roi) && roi > 0) {
              const rois = channelROIs.get(channel) || [];
              rois.push(roi);
              channelROIs.set(channel, rois);
            }
          });

          let bestChannel = "Email";
          let bestROI = 0;
          channelROIs.forEach((rois, channel) => {
            const validROIs = rois.filter(r => !isNaN(r) && isFinite(r));
            if (validROIs.length > 0) {
              const avgROI = validROIs.reduce((sum, r) => sum + r, 0) / validROIs.length;
              if (!isNaN(avgROI) && isFinite(avgROI) && avgROI > bestROI) {
                bestROI = avgROI;
                bestChannel = channel;
              }
            }
          });

          finalOptimalChannel = { channel: bestChannel, roi: Math.round(Math.max(0, bestROI)) };
          setOptimalChannel(finalOptimalChannel);
        }
        
        // Cache all the data
        setCachedData('campaign_predictor_historical', historical);
        setCachedData('campaign_predictor_predicted', finalPredicted);
        setCachedData('campaign_predictor_optimal_channel', finalOptimalChannel);
        setCachedData('campaign_predictor_recommendations', finalRecommendations);
        setCachedData('campaign_predictor_send_time', finalSendTime);
      } catch (error) {
        setHistoricalCampaigns([]);
        setPredictedCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    loadCampaignData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount
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
          <p className="text-sm text-muted-foreground">Historical vs AI-Predicted Results (Powered by OpenAI)</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Historical */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Historical Performance (Last 3 Campaigns)</h4>
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
                      <TableCell className="text-right">{Math.round(campaign.conversion)}%</TableCell>
                      <TableCell className="text-right text-success">{Math.round(campaign.roi)}%</TableCell>
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
                {predictedCampaigns.length > 0 && predictedCampaigns[0].confidence && (
                  <Badge variant="outline" className="ml-2">
                    {Math.round(predictedCampaigns[0].confidence * 100)}% confidence
                  </Badge>
                )}
              </h4>
              {predictedCampaigns.length > 0 ? (
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Pred. Response</TableHead>
                    <TableHead className="text-right">Pred. Conv.</TableHead>
                    <TableHead className="text-right">Exp. ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictedCampaigns.map((campaign, i) => (
                    <TableRow key={i} className="bg-accent/5">
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell><Badge className="bg-accent/20 text-accent">{campaign.channel}</Badge></TableCell>
                      <TableCell className="text-right">{campaign.predictedResponseRate ? `${campaign.predictedResponseRate}%` : "—"}</TableCell>
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
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-accent/20">
                  <Target className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg mb-1">AI-Powered Campaign Recommendations</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Best Predicted Channel:</span>
                    <Badge className="bg-accent text-accent-foreground">{optimalChannel.channel}</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <span className="text-accent font-semibold">Expected {optimalChannel.roi}% ROI</span>
                  </div>
                  {optimalSendTime && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Recommended Send Time: <span className="text-accent font-medium">{optimalSendTime}</span> | AI-Optimized Engagement Window
                    </p>
                  )}
                </div>
              </div>
              
              {/* AI Recommendations */}
              {aiRecommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-accent/20">
                  <h5 className="text-sm font-semibold mb-2 text-accent">AI Recommendations:</h5>
                  <ul className="space-y-1">
                    {aiRecommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-accent mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
