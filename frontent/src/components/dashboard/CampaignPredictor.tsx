import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, TrendingUp, ArrowRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const historicalCampaigns = [
  { name: "Spring Promo", channel: "Email", conversion: 12.5, roi: 185 },
  { name: "Summer Flash", channel: "SMS", conversion: 8.3, roi: 142 },
  { name: "Loyalty Boost", channel: "Push", conversion: 15.2, roi: 210 }
];

const predictedCampaigns = [
  { name: "Fall Launch", channel: "Email", predictedConversion: 14.8, expectedRoi: 198 },
  { name: "Weekend Rush", channel: "SMS", predictedConversion: 9.5, expectedRoi: 156 },
  { name: "Cold Brew Push", channel: "Push", predictedConversion: 16.7, expectedRoi: 225 }
];

export function CampaignPredictor() {
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
            </div>

            {/* Predicted */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-accent flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                AI-Predicted Performance
              </h4>
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimal Channel Suggestion */}
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
                <Badge className="bg-accent text-accent-foreground">Push Notifications</Badge>
                <ArrowRight className="h-4 w-4" />
                <span className="text-accent font-semibold">Expected 225% ROI</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Recommended Send Time: <span className="text-accent font-medium">5 PM – 7 PM</span> | High Engagement Window
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
