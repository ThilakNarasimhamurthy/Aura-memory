import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Calendar, Clock, Target, Image as ImageIcon, MessageSquare, Sparkles, Volume2, Mic, Play, Download, Phone, PhoneCall, User, CheckCircle, XCircle, Send, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ragApi, playAudio, downloadAudio, campaignsApi, customersApi, phoneCallApi, type CustomerDocument, type PhoneCallRequest } from "@/lib/api";

interface DayCampaign {
  day: string;
  date: string;
  banner: string | null;
  caption: string;
  story: string;
  timing: string;
  channel: string;
  channelReason: string;
}

export default function CampaignAutomation() {
  const [loading, setLoading] = useState(false);
  const [campaigns7Days, setCampaigns7Days] = useState<DayCampaign[]>([]);
  const [campaigns30Days, setCampaigns30Days] = useState<DayCampaign[]>([]);
  const [festivalCampaigns, setFestivalCampaigns] = useState<DayCampaign[]>([]);
  const [voiceQuery, setVoiceQuery] = useState("");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // Customer calling state
  const [customers, setCustomers] = useState<Array<CustomerDocument & { customer_id: string }>>([]);
  const [top5Customers, setTop5Customers] = useState<Array<CustomerDocument & { customer_id: string }>>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [callingMode, setCallingMode] = useState<"auto" | "manual">("auto");
  const [manualPhoneNumber, setManualPhoneNumber] = useState("");
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [callingLoading, setCallingLoading] = useState(false);
  const [callScript, setCallScript] = useState<string>("");
  const [callAudio, setCallAudio] = useState<Blob | null>(null);
  const [callFeedback, setCallFeedback] = useState<"positive" | "negative" | null>(null);
  const [conversationLog, setConversationLog] = useState<Array<{role: string; content: string}>>([]);
  const [activeCall, setActiveCall] = useState<{callSid: string; status: string; phoneNumber: string} | null>(null);
  const [callStatusInterval, setCallStatusInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Chat conversation for campaign generation
  const [chatMessages, setChatMessages] = useState<Array<{role: "user" | "assistant"; content: string; timestamp: Date}>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  
  const { toast } = useToast();

  const handleVoiceQuery = async () => {
    if (!voiceQuery.trim()) {
      toast({
        title: "Query Required",
        description: "Please enter a question about campaigns or customers.",
        variant: "destructive",
      });
      return;
    }

    setVoiceLoading(true);
    setVoiceResponse(null);
    setAudioBlob(null);

    try {
      // Get text response first
      const textResponse = await ragApi.campaignQuery({
        query: voiceQuery,
        k: 10,
      });
      setVoiceResponse(textResponse.answer);

      // Get audio response
      const audio = await ragApi.campaignVoice({
        query: voiceQuery,
        k: 10,
      });
      setAudioBlob(audio);

      toast({
        title: "Voice Response Ready",
        description: "Click play to hear the response about campaigns and customers.",
      });
    } catch (error: any) {
      console.error("Error with voice query:", error);
      toast({
        title: "Voice Query Failed",
        description: error.message || "Failed to generate voice response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVoiceLoading(false);
    }
  };

  const playVoiceResponse = async () => {
    if (audioBlob) {
      try {
        await playAudio(audioBlob);
      } catch (error: any) {
        toast({
          title: "Playback Error",
          description: error.message || "Failed to play audio.",
          variant: "destructive",
        });
      }
    }
  };

  const downloadVoiceResponse = () => {
    if (audioBlob) {
      downloadAudio(audioBlob, "campaign_voice_response.mp3");
    }
  };

  // Load customers for calling - prioritize most active in campaigns
  const loadCustomersForCalling = async () => {
    try {
      // Query specifically for customers with high campaign engagement
      const response = await ragApi.campaignQuery({
        query: 'Find customers who have the highest campaign engagement. Show customers with the most campaign responses, conversions, email open rates, and click rates. Prioritize customers who responded to multiple campaigns and converted.',
        k: 20,
      });
      
      const customerList = response.documents
        .map(doc => doc.metadata as CustomerDocument)
        .filter(c => c.customer_id && (c.email || c.phone))
        .map(c => ({ ...c, customer_id: String(c.customer_id || "") }))
        // Filter out customers with zero campaign engagement
        .filter(c => {
          const hasEngagement = 
            (c.responded_to_campaigns && c.responded_to_campaigns > 0) ||
            (c.converted_campaigns && c.converted_campaigns > 0) ||
            (c.email_open_rate && c.email_open_rate > 0) ||
            (c.email_click_rate && c.email_click_rate > 0);
          return hasEngagement;
        });
      
      // Sort by campaign engagement score (most active first)
      customerList.sort((a, b) => {
        // Calculate comprehensive engagement score
        const aScore = 
          (a.responded_to_campaigns || 0) * 3 +  // Responses weighted higher
          (a.converted_campaigns || 0) * 5 +     // Conversions weighted highest
          (a.email_open_rate || 0) / 10 +        // Open rate bonus
          (a.email_click_rate || 0) / 10 +       // Click rate bonus
          (a.total_spent || 0) / 100;            // Spending as tiebreaker
        
        const bScore = 
          (b.responded_to_campaigns || 0) * 3 +
          (b.converted_campaigns || 0) * 5 +
          (b.email_open_rate || 0) / 10 +
          (b.email_click_rate || 0) / 10 +
          (b.total_spent || 0) / 100;
        
        return bScore - aScore; // Descending order
      });
      
      setCustomers(customerList);
      
      // Get top 5 customers for one-by-one calling
      const top5 = customerList.slice(0, 5);
      setTop5Customers(top5);
      
      // Auto-select the most active customer (first in sorted list) if in auto mode
      if (customerList.length > 0 && !selectedCustomer && callingMode === "auto") {
        const mostActive = customerList[0];
        setSelectedCustomer(mostActive.customer_id);
        toast({
          title: "Top 5 Customers Loaded",
          description: `Loaded ${top5.length} most engaged customers. Select one to call, or switch to manual mode to add a phone number.`,
        });
      } else if (customerList.length === 0) {
        toast({
          title: "No Active Customers Found",
          description: "No customers with campaign engagement found. Try manual mode to add a phone number.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error Loading Customers",
        description: error.message || "Failed to load customers.",
        variant: "destructive",
      });
    }
  };

  // Generate call script and initiate call
  const initiateCustomerCall = async (customerId?: string) => {
    let customer: (CustomerDocument & { customer_id: string }) | null = null;
    
    if (callingMode === "manual") {
      // Manual mode - use provided phone number
      if (!manualPhoneNumber.trim()) {
        toast({
          title: "Phone Number Required",
          description: "Please enter a phone number to call.",
          variant: "destructive",
        });
        return;
      }
      
      // Create a customer object from manual input
      customer = {
        customer_id: "manual-" + Date.now(),
        first_name: manualCustomerName.split(" ")[0] || "",
        last_name: manualCustomerName.split(" ").slice(1).join(" ") || "",
        email: "",
        phone: manualPhoneNumber,
        responded_to_campaigns: 0,
        converted_campaigns: 0,
        email_open_rate: 0,
        email_click_rate: 0,
        total_spent: 0,
        lifetime_value: 0,
      };
    } else {
      // Auto mode - use selected customer
      const idToUse = customerId || selectedCustomer;
      if (!idToUse) {
        toast({
          title: "Select Customer",
          description: "Please select a customer to call.",
          variant: "destructive",
        });
        return;
      }
      
      customer = customers.find(c => c.customer_id === idToUse) || 
                 top5Customers.find(c => c.customer_id === idToUse) || null;
      
      if (!customer) {
        toast({
          title: "Customer Not Found",
          description: "Selected customer not found. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    setCallingLoading(true);
    setCallScript("");
    setCallAudio(null);
    setCallFeedback(null);
    setConversationLog([]);

    try {
      // Generate personalized call script based on customer's campaign engagement
      const customerName = customer.first_name && customer.last_name 
        ? `${customer.first_name} ${customer.last_name}`
        : customer.first_name || customer.email || "the customer";
      
      const phoneNumber = customer.phone || manualPhoneNumber || "N/A";
      
      let query = `Generate a natural phone conversation script to call ${customerName} at ${phoneNumber} to ask about our recent campaigns. `;
      
      if (callingMode === "auto" && customer.responded_to_campaigns) {
        // Has campaign history
        query += `
      
Customer details:
- Total purchases: ${customer.total_purchases || 0}
- Responded to ${customer.responded_to_campaigns || 0} campaigns
- Converted ${customer.converted_campaigns || 0} campaigns
- Email open rate: ${customer.email_open_rate || 0}%
- Preferred contact: ${customer.preferred_contact_method || 'Email'}
- Favorite product: ${customer.favorite_product_category || 'N/A'}

Create a friendly, conversational script that:
1. Introduces the agent
2. Asks if they received our recent campaigns
3. Asks about their experience with the campaigns
4. Asks if the campaigns influenced their purchases
5. Thanks them for their time

Keep it natural and conversational, suitable for a phone call.`;
      } else {
        // Manual call or no campaign history
        query += `
      
This is a ${callingMode === "manual" ? "manual" : "new"} customer call. 

Create a friendly, conversational script that:
1. Introduces the agent
2. Asks if they are familiar with our brand/campaigns
3. Asks about their experience with marketing campaigns in general
4. Asks if they would be interested in our campaigns
5. Thanks them for their time

Keep it natural and conversational, suitable for a phone call.`;
      }

      const response = await ragApi.campaignQuery({
        query,
        k: 5,
      });

      const script = response.answer;
      setCallScript(script);
      setConversationLog([{ role: "agent", content: script }]);

      // Generate audio for the call script
      const audio = await ragApi.campaignVoice({
        query: script,
        k: 5,
      });
      setCallAudio(audio);

      toast({
        title: "Call Script Generated",
        description: `Script ready for ${customer.first_name || customer.email}. You can now make the actual call.`,
      });
    } catch (error: any) {
      console.error("Error initiating call:", error);
      toast({
        title: "Call Failed",
        description: error.message || "Failed to generate call script. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCallingLoading(false);
    }
  };

  const playCallAudio = async () => {
    if (callAudio) {
      try {
        await playAudio(callAudio);
      } catch (error: any) {
        toast({
          title: "Playback Error",
          description: error.message || "Failed to play audio.",
          variant: "destructive",
        });
      }
    }
  };

  // Make actual phone call
  const makeActualCall = async () => {
    let customer: (CustomerDocument & { customer_id: string }) | null = null;
    let phoneNumber = "";

    if (callingMode === "manual") {
      if (!manualPhoneNumber.trim()) {
        toast({
          title: "Phone Number Required",
          description: "Please enter a phone number to call.",
          variant: "destructive",
        });
        return;
      }
      phoneNumber = manualPhoneNumber;
    } else {
      if (!selectedCustomer) {
        toast({
          title: "Select Customer",
          description: "Please select a customer to call.",
          variant: "destructive",
        });
        return;
      }
      customer = customers.find(c => c.customer_id === selectedCustomer) || 
                 top5Customers.find(c => c.customer_id === selectedCustomer) || null;
      
      if (!customer) {
        toast({
          title: "Customer Not Found",
          description: "Selected customer not found.",
          variant: "destructive",
        });
        return;
      }
      
      phoneNumber = customer.phone || "";
      if (!phoneNumber) {
        toast({
          title: "No Phone Number",
          description: "This customer doesn't have a phone number. Use manual mode to enter a number.",
          variant: "destructive",
        });
        return;
      }
    }

    setCallingLoading(true);
    try {
      const callRequest: PhoneCallRequest = {
        phone_number: phoneNumber,
        customer_name: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : manualCustomerName,
        customer_id: customer?.customer_id,
      };

      const result = await phoneCallApi.initiate(callRequest);
      
      setActiveCall({
        callSid: result.call_sid,
        status: result.status,
        phoneNumber: phoneNumber,
      });

      // Start polling for call status
      const interval = setInterval(async () => {
        try {
          const status = await phoneCallApi.getStatus(result.call_sid);
          setActiveCall(prev => prev ? { ...prev, status: status.status } : null);
          
          if (status.status === "completed" || status.status === "failed" || status.status === "no-answer") {
            clearInterval(interval);
            setCallStatusInterval(null);
          }
        } catch (error) {
          console.error("Error checking call status:", error);
        }
      }, 2000); // Check every 2 seconds
      
      setCallStatusInterval(interval);

      toast({
        title: "Call Initiated!",
        description: `Calling ${phoneNumber}. The customer will receive the call shortly.`,
      });

      // Add to conversation log
      setConversationLog(prev => [...prev, {
        role: "system",
        content: `Call initiated to ${phoneNumber} at ${new Date().toLocaleTimeString()}`
      }]);
    } catch (error: any) {
      console.error("Error making call:", error);
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate call. Please check Twilio configuration.",
        variant: "destructive",
      });
    } finally {
      setCallingLoading(false);
    }
  };

  const recordCallFeedback = (feedback: "positive" | "negative") => {
    setCallFeedback(feedback);
    const customer = customers.find(c => c.customer_id === selectedCustomer) || 
                     top5Customers.find(c => c.customer_id === selectedCustomer);
    
    toast({
      title: feedback === "positive" ? "Campaign Working!" : "Campaign Needs Improvement",
      description: `Feedback recorded for ${customer?.first_name || customer?.email || manualCustomerName || 'customer'}. Campaign effectiveness: ${feedback === "positive" ? "Good" : "Needs attention"}`,
    });

    // Add to conversation log
    setConversationLog(prev => [...prev, {
      role: "feedback",
      content: `Customer feedback: ${feedback === "positive" ? "Campaign is working well" : "Campaign needs improvement"}`
    }]);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (callStatusInterval) {
        clearInterval(callStatusInterval);
      }
    };
  }, [callStatusInterval]);

  // Load customers on mount
  useEffect(() => {
    loadCustomersForCalling();
    
    // Initialize chat with welcome message
    setChatMessages([{
      role: "assistant",
      content: "Hello! I'm your campaign generation assistant. I can help you create marketing campaigns based on your customer data. \n\nYou can ask me to:\n- Generate campaigns for specific periods (7 days, 30 days, festivals)\n- Create campaigns targeting specific customer segments\n- Design campaigns based on customer preferences\n- Generate campaign content, timing, and channels\n\nWhat kind of campaign would you like to create?",
      timestamp: new Date(),
    }]);
  }, []);

  // Handle chat message for campaign generation
  const handleChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatLoading(true);

    // Add user message to chat
    const newUserMessage = {
      role: "user" as const,
      content: userMessage,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, newUserMessage]);

    try {
      // Use RAG to generate campaign response
      const response = await ragApi.campaignQuery({
        query: `Generate a marketing campaign based on this request: ${userMessage}. 
        
Consider:
- Customer data and preferences
- Campaign effectiveness metrics
- Best practices for campaign timing and channels
- Customer engagement patterns

Provide a detailed campaign plan with:
- Campaign strategy
- Target audience
- Content suggestions
- Timing recommendations
- Channel selection
- Expected outcomes`,
        k: 15, // Get more context for campaign generation
      });

      // Add assistant response
      const assistantMessage = {
        role: "assistant" as const,
        content: response.answer,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);

      // If the response mentions campaigns, try to extract and show campaign cards
      if (response.answer.toLowerCase().includes("campaign") || response.answer.toLowerCase().includes("day")) {
        toast({
          title: "Campaign Generated",
          description: "Check the chat for campaign details. You can ask follow-up questions to refine it.",
        });
      }
    } catch (error: any) {
      console.error("Error in chat:", error);
      const errorMessage = {
        role: "assistant" as const,
        content: `I apologize, but I encountered an error: ${error.message || "Failed to generate campaign. Please try again."}`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: error.message || "Failed to process your request.",
        variant: "destructive",
      });
    } finally {
      setChatLoading(false);
    }
  };

  const generateCampaigns = async (period: "7days" | "30days" | "festival") => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign", {
        body: {
          type: "automation",
          period,
          historicalData: "Based on coffee shop sales: Morning peak 7-9AM (Espresso, Latte), Afternoon 2-4PM (Cold Brew, Iced Coffee), Weekend brunch 10AM-12PM (Specialty drinks)"
        }
      });

      if (error) throw error;

      const setCampaignData = period === "7days" ? setCampaigns7Days : 
                               period === "30days" ? setCampaigns30Days : 
                               setFestivalCampaigns;
      
      setCampaignData(data.campaigns || []);
      
      toast({
        title: "Campaign Schedule Generated!",
        description: `AI has created your ${period === "7days" ? "7-day" : period === "30days" ? "30-day" : "festival"} campaign plan.`,
      });
    } catch (error: any) {
      console.error("Error generating campaigns:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Unable to generate campaigns. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const CampaignCard = ({ campaign }: { campaign: DayCampaign }) => (
    <Card className="border-accent/20 hover:border-accent/40 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" />
            {campaign.day} - {campaign.date}
          </CardTitle>
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
            {campaign.channel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {campaign.banner && (
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img 
              src={campaign.banner} 
              alt={`Banner for ${campaign.day}`}
              className="w-full h-48 object-cover"
            />
            <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
              <ImageIcon className="h-3 w-3 text-accent" />
              <span className="text-xs font-medium">AI Generated</span>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">Caption:</p>
              <p className="text-sm text-muted-foreground">{campaign.caption}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground mb-1">Story:</p>
              <p className="text-sm text-muted-foreground">{campaign.story}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Best Time</p>
              <p className="text-sm font-semibold text-foreground">{campaign.timing}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Channel Reason</p>
              <p className="text-sm font-semibold text-foreground">{campaign.channelReason}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Campaign Automation</h1>
                <p className="text-muted-foreground">
                  AI-powered campaign schedules with banners, captions, and optimal timing
                </p>
              </div>
            </div>

            {/* Customer Calling Section - Test Campaign Effectiveness */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5 text-primary" />
                  Call Customers to Test Campaign Effectiveness
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Load top 5 engaged customers to call one by one, or manually add a phone number to call.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mode Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={callingMode === "auto" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCallingMode("auto")}
                    className="flex-1"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Top 5 Customers
                  </Button>
                  <Button
                    variant={callingMode === "manual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCallingMode("manual")}
                    className="flex-1"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Manual Number
                  </Button>
                </div>

                {callingMode === "auto" ? (
                  <div className="space-y-4">
                    {/* Load Top 5 Button */}
                    <div className="flex gap-2">
                      <Button
                        onClick={loadCustomersForCalling}
                        variant="outline"
                        className="flex-1"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Load Top 5 Customers
                      </Button>
                    </div>

                    {/* Top 5 Customers List */}
                    {top5Customers.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Top 5 Most Engaged Customers</label>
                        <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-lg p-2">
                          {top5Customers.map((customer, idx) => {
                            const engagementScore = 
                              (customer.responded_to_campaigns || 0) * 3 +
                              (customer.converted_campaigns || 0) * 5 +
                              (customer.email_open_rate || 0) / 10;
                            return (
                              <div
                                key={customer.customer_id}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  selectedCustomer === customer.customer_id
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => setSelectedCustomer(customer.customer_id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                                      #{idx + 1}
                                    </Badge>
                                    <div>
                                      <p className="font-medium">
                                        {customer.first_name && customer.last_name
                                          ? `${customer.first_name} ${customer.last_name}`
                                          : customer.email || customer.customer_id}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {customer.email || customer.phone || "No contact info"}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCustomer(customer.customer_id);
                                    }}
                                    variant="outline"
                                  >
                                    Select
                                  </Button>
                                </div>
                                <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                                  <span>Responses: {customer.responded_to_campaigns || 0}</span>
                                  <span>•</span>
                                  <span>Conversions: {customer.converted_campaigns || 0}</span>
                                  <span>•</span>
                                  <span>Open Rate: {customer.email_open_rate || 0}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Selected Customer Details */}
                    {selectedCustomer && top5Customers.length > 0 && (() => {
                      const customer = top5Customers.find(c => c.customer_id === selectedCustomer);
                      return customer ? (
                        <div className="text-xs text-muted-foreground p-3 bg-muted rounded border border-border">
                          <div className="space-y-1">
                            <p><strong>Name:</strong> {customer.first_name && customer.last_name 
                              ? `${customer.first_name} ${customer.last_name}` 
                              : "N/A"}</p>
                            <p><strong>Email:</strong> {customer.email || "N/A"}</p>
                            <p><strong>Phone:</strong> {customer.phone || "N/A"}</p>
                            <p><strong>Campaign Engagement:</strong></p>
                            <ul className="list-disc list-inside ml-2 space-y-0.5">
                              <li>Responded to {customer.responded_to_campaigns || 0} campaigns</li>
                              <li>Converted {customer.converted_campaigns || 0} campaigns</li>
                              <li>Email open rate: {customer.email_open_rate || 0}%</li>
                              <li>Email click rate: {customer.email_click_rate || 0}%</li>
                            </ul>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Manual Phone Number Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Customer Name (Optional)</label>
                      <Input
                        placeholder="e.g., John Doe"
                        value={manualCustomerName}
                        onChange={(e) => setManualCustomerName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone Number *</label>
                      <Input
                        placeholder="e.g., +1-555-123-4567"
                        value={manualPhoneNumber}
                        onChange={(e) => setManualPhoneNumber(e.target.value)}
                        type="tel"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the phone number you want to call
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => initiateCustomerCall()}
                      disabled={callingLoading || (callingMode === "auto" && !selectedCustomer) || (callingMode === "manual" && !manualPhoneNumber.trim())}
                      variant="outline"
                      className="w-full"
                    >
                      {callingLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Generate Script
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={makeActualCall}
                      disabled={callingLoading || activeCall !== null || (callingMode === "auto" && !selectedCustomer) || (callingMode === "manual" && !manualPhoneNumber.trim())}
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      {callingLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Calling...
                        </>
                      ) : activeCall ? (
                        <>
                          <Phone className="h-4 w-4 mr-2" />
                          Call Active
                        </>
                      ) : (
                        <>
                          <PhoneCall className="h-4 w-4 mr-2" />
                          Make Actual Call
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {activeCall && (
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-primary">Call in Progress</p>
                          <p className="text-xs text-muted-foreground">
                            Status: <span className="font-medium">{activeCall.status}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            To: {activeCall.phoneNumber}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                          {activeCall.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                {callScript && (
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-start gap-2">
                      <PhoneCall className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground mb-1">Call Script:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded">
                          {callScript}
                        </p>
                      </div>
                    </div>

                    {callAudio && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={playCallAudio}
                          variant="outline"
                          size="sm"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Play Call Audio
                        </Button>
                        <Button
                          onClick={() => downloadAudio(callAudio, "customer_call.mp3")}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    )}

                    {/* Campaign Feedback - Show after call */}
                    {activeCall && (activeCall.status === "completed" || activeCall.status === "in-progress") && !callFeedback && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-sm font-semibold mb-2">After the call: Did the campaign work for this customer?</p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => recordCallFeedback("positive")}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-success border-success hover:bg-success/10"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Campaign Working
                          </Button>
                          <Button
                            onClick={() => recordCallFeedback("negative")}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Needs Improvement
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Show feedback option even if call script is generated */}
                    {callScript && !activeCall && !callFeedback && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-sm font-semibold mb-2">After making the call: Did the campaign work?</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Make the call first, then record feedback based on the customer's response.
                        </p>
                      </div>
                    )}

                    {callFeedback && (
                      <div className={`p-3 rounded border ${
                        callFeedback === "positive" 
                          ? "bg-success/10 border-success/30" 
                          : "bg-destructive/10 border-destructive/30"
                      }`}>
                        <p className="text-sm font-semibold flex items-center gap-2">
                          {callFeedback === "positive" ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-success" />
                              Campaign is Working
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-destructive" />
                              Campaign Needs Improvement
                            </>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Feedback recorded. Use this to refine your campaign strategy.
                        </p>
                      </div>
                    )}

                    {/* Conversation Log */}
                    {conversationLog.length > 0 && (
                      <div className="pt-4 border-t border-border">
                        <p className="text-sm font-semibold mb-2">Conversation Log:</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {conversationLog.map((log, idx) => (
                            <div key={idx} className="text-xs p-2 bg-muted rounded">
                              <span className="font-semibold">{log.role}:</span> {log.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Voice Conversation Section */}
            <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-accent" />
                  Voice Conversation with Campaign Agent (ElevenLabs)
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Ask questions about campaigns, customer engagement, and effectiveness. Get natural voice responses.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Who are our most active customers? How are campaigns performing?"
                    value={voiceQuery}
                    onChange={(e) => setVoiceQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVoiceQuery()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleVoiceQuery}
                    disabled={voiceLoading || !voiceQuery.trim()}
                    className="bg-accent hover:bg-accent/90"
                  >
                    {voiceLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Ask
                      </>
                    )}
                  </Button>
                </div>

                {voiceResponse && (
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground mb-1">Response:</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{voiceResponse}</p>
                      </div>
                    </div>

                    {audioBlob && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={playVoiceResponse}
                          variant="outline"
                          size="sm"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Play Audio
                        </Button>
                        <Button
                          onClick={downloadVoiceResponse}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                  <p className="font-semibold mb-1">Example queries:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>"Who are our most active customers?"</li>
                    <li>"How are email campaigns performing?"</li>
                    <li>"Which customers have the highest campaign conversion rates?"</li>
                    <li>"Show me customers with high lifetime value who engaged with campaigns"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Chat Interface for Campaign Generation */}
            <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-accent" />
                  Chat to Generate Campaigns
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Have a conversation with AI to generate personalized marketing campaigns based on your customer data.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col h-[600px] border border-border rounded-lg bg-background">
                  {/* Chat Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {chatMessages.map((message, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-3 ${
                            message.role === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          {message.role === "assistant" && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-accent/20 text-accent">
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                          {message.role === "user" && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/20 text-primary">
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex gap-3 justify-start">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-accent/20 text-accent">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="bg-muted rounded-lg p-3">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Chat Input */}
                  <div className="border-t border-border p-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Ask me to generate a campaign... (e.g., 'Create a 7-day campaign for coffee lovers' or 'Generate a festival campaign for the holidays')"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleChatMessage();
                          }
                        }}
                        className="min-h-[60px] resize-none"
                        disabled={chatLoading}
                      />
                      <Button
                        onClick={handleChatMessage}
                        disabled={chatLoading || !chatInput.trim()}
                        className="bg-accent hover:bg-accent/90"
                        size="icon"
                      >
                        {chatLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="7days" className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="7days">Next 7 Days</TabsTrigger>
                <TabsTrigger value="30days">Next 30 Days</TabsTrigger>
                <TabsTrigger value="festival">Festivals</TabsTrigger>
              </TabsList>

              <TabsContent value="7days" className="space-y-6 mt-6">
                <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
                  <CardHeader>
                    <CardTitle>7-Day Campaign Schedule</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Generate a complete week of campaign content with AI predictions
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => generateCampaigns("7days")}
                      disabled={loading}
                      className="w-full bg-accent hover:bg-accent/90"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate 7-Day Plan
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {campaigns7Days.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {campaigns7Days.map((campaign, idx) => (
                      <CampaignCard key={idx} campaign={campaign} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="30days" className="space-y-6 mt-6">
                <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
                  <CardHeader>
                    <CardTitle>30-Day Campaign Schedule</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Generate a month-long campaign strategy with daily content
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => generateCampaigns("30days")}
                      disabled={loading}
                      className="w-full bg-accent hover:bg-accent/90"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate 30-Day Plan
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {campaigns30Days.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {campaigns30Days.map((campaign, idx) => (
                      <CampaignCard key={idx} campaign={campaign} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="festival" className="space-y-6 mt-6">
                <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
                  <CardHeader>
                    <CardTitle>Festival Campaign Schedule</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Generate campaigns for upcoming festivals and special occasions
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => generateCampaigns("festival")}
                      disabled={loading}
                      className="w-full bg-accent hover:bg-accent/90"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Festival Campaigns
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {festivalCampaigns.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {festivalCampaigns.map((campaign, idx) => (
                      <CampaignCard key={idx} campaign={campaign} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
