import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, MessageSquare, Instagram, Clock } from "lucide-react";

interface DayStrategy {
  day: string;
  date: string;
  bannerDescription: string;
  caption: string;
  story: string;
  emailContent: string;
  smsContent: string;
  timing: string;
  channel: string;
  channelReason: string;
  banner?: string | null;
}

interface SevenDayStrategyProps {
  campaigns: DayStrategy[];
}

export function SevenDayStrategy({ campaigns }: SevenDayStrategyProps) {
  const getChannelIcon = (channel: string) => {
    const lowerChannel = channel.toLowerCase();
    if (lowerChannel.includes("email")) return Mail;
    if (lowerChannel.includes("sms")) return MessageSquare;
    if (lowerChannel.includes("instagram") || lowerChannel.includes("facebook")) return Instagram;
    return Calendar;
  };

  const getChannelColor = (channel: string) => {
    const lowerChannel = channel.toLowerCase();
    if (lowerChannel.includes("email")) return "bg-primary/20 text-primary border-primary/30";
    if (lowerChannel.includes("sms")) return "bg-accent/20 text-accent border-accent/30";
    return "bg-secondary/20 text-secondary-foreground border-secondary/30";
  };

  return (
    <div className="space-y-4">
      {campaigns.map((campaign, idx) => {
        const ChannelIcon = getChannelIcon(campaign.channel);
        
        return (
          <Card key={idx} className="border-border bg-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-accent" />
                    {campaign.day} - {campaign.date}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getChannelColor(campaign.channel)}>
                      <ChannelIcon className="h-3 w-3 mr-1" />
                      {campaign.channel}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {campaign.timing}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaign.banner && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img 
                    src={campaign.banner} 
                    alt={`${campaign.day} banner`}
                    className="w-full h-auto"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">📱 Social Media Caption</h4>
                  <p className="text-sm text-muted-foreground">{campaign.caption}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">📖 Story Content</h4>
                  <p className="text-sm text-muted-foreground">{campaign.story}</p>
                </div>

                {campaign.emailContent && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Email Content
                    </h4>
                    <p className="text-sm text-muted-foreground">{campaign.emailContent}</p>
                  </div>
                )}

                {campaign.smsContent && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      SMS Content
                    </h4>
                    <p className="text-sm text-muted-foreground">{campaign.smsContent}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Why {campaign.channel}:</span> {campaign.channelReason}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
