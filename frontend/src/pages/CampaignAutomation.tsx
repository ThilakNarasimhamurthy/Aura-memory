import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TopNav } from "@/components/dashboard/TopNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Calendar, Clock, Target, Image as ImageIcon, MessageSquare, Sparkles, Play, Download, Phone, PhoneCall, User, CheckCircle, XCircle, Send, Bot, Mail, MailCheck, ArrowRight, ArrowDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ragApi, playAudio, downloadAudio, campaignsApi, customersApi, phoneCallApi, emailApi, memoriesApi, type CustomerDocument, type PhoneCallRequest, type EmailRecipient, type BulkEmailRequest, type CallConversation } from "@/lib/api";

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
  
  // Customer calling state
  const [customers, setCustomers] = useState<Array<CustomerDocument & { customer_id: string }>>([]);
  const [top5Customers, setTop5Customers] = useState<Array<CustomerDocument & { customer_id: string }>>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [callingMode, setCallingMode] = useState<"auto" | "manual">("auto");
  const [manualPhoneNumber, setManualPhoneNumber] = useState("");
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [callingLoading, setCallingLoading] = useState(false);
  const [callScript, setCallScript] = useState<string>("");
  const [editedCallScript, setEditedCallScript] = useState<string>(""); // Editable transcript
  const [callAudio, setCallAudio] = useState<Blob | null>(null);
  const [callFeedback, setCallFeedback] = useState<"positive" | "negative" | null>(null);
  const [conversationLog, setConversationLog] = useState<Array<{role: string; content: string}>>([]);
  const [activeCall, setActiveCall] = useState<{callSid: string; status: string; phoneNumber: string} | null>(null);
  const [callStatusInterval, setCallStatusInterval] = useState<NodeJS.Timeout | null>(null);
  const [callConversation, setCallConversation] = useState<CallConversation | null>(null);
  const [customerResponses, setCustomerResponses] = useState<Array<{timestamp: Date; content: string}>>([]); // Real-time customer responses
  const [isEditingScript, setIsEditingScript] = useState(false);
  
  // Chat conversation for campaign generation
  const [chatMessages, setChatMessages] = useState<Array<{role: "user" | "assistant"; content: string; timestamp: Date}>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [generatedCampaigns, setGeneratedCampaigns] = useState<DayCampaign[]>([]);
  
  // Email sending state
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailResults, setEmailResults] = useState<{sent: number; failed: number} | null>(null);
  const [autoGenerateEmail, setAutoGenerateEmail] = useState(false);
  
  // Conversation storage
  const [conversationHistory, setConversationHistory] = useState<string>("");
  const [storingConversation, setStoringConversation] = useState(false);
  
  const { toast } = useToast();

  // Store conversation in MemMachine
  const storeConversationInMemory = async (conversationText: string, customerId?: string) => {
    if (!conversationText.trim()) return;
    
    setStoringConversation(true);
    try {
      const memoryContent = `Campaign Automation Conversation - ${new Date().toISOString()}\n\n${conversationText}`;
      await memoriesApi.add(memoryContent, customerId || "campaign-automation");
      
    } catch (error: any) {
      toast({
        title: "Memory Storage Warning",
        description: "Failed to store conversation in memory: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setStoringConversation(false);
    }
  };

  // Load customers for calling - prioritize most active in campaigns
  // This function is called manually or when data needs to be refreshed
  const loadCustomersForCalling = async (forceRefresh: boolean = false) => {
    // Don't reload if data was recently loaded and forceRefresh is false
    if (!forceRefresh && dataLoaded && lastLoadTime && Date.now() - lastLoadTime < 5 * 60 * 1000) {
      return;
    }
    
    try {
      const response = await ragApi.campaignQuery({
        query: 'Find customers who have the highest campaign engagement. Show customers with the most campaign responses, conversions, email open rates, and click rates. Prioritize customers who responded to multiple campaigns and converted.',
        k: 20,
      });
      
      const documents = Array.isArray(response?.documents) ? response.documents : [];
      
      if (documents.length === 0) {
        setCustomers([]);
        setTop5Customers([]);
        if (forceRefresh) {
          toast({
            title: "No Customers Found",
            description: response?.answer || "No customers with campaign engagement found.",
            variant: "default",
          });
        }
        return;
      }
      
      const customerList = documents
        .map(doc => doc.metadata as CustomerDocument)
        .filter(c => c.customer_id && (c.email || c.phone))
        .map(c => ({ ...c, customer_id: String(c.customer_id || "") }))
        .filter(c => {
          const hasEngagement = 
            (c.responded_to_campaigns && c.responded_to_campaigns > 0) ||
            (c.converted_campaigns && c.converted_campaigns > 0) ||
            (c.email_open_rate && c.email_open_rate > 0) ||
            (c.email_click_rate && c.email_click_rate > 0);
          return hasEngagement;
        });
      
      customerList.sort((a, b) => {
        const aScore = 
          (a.responded_to_campaigns || 0) * 3 +
          (a.converted_campaigns || 0) * 5 +
          (a.email_open_rate || 0) / 10 +
          (a.email_click_rate || 0) / 10 +
          (a.total_spent || 0) / 100;
        
        const bScore = 
          (b.responded_to_campaigns || 0) * 3 +
          (b.converted_campaigns || 0) * 5 +
          (b.email_open_rate || 0) / 10 +
          (b.email_click_rate || 0) / 10 +
          (b.total_spent || 0) / 100;
        
        return bScore - aScore;
      });
      
      setCustomers(customerList);
      const top5 = customerList;
      setTop5Customers(top5);
      
      // Update load time
      setDataLoaded(true);
      setLastLoadTime(Date.now());
      
      // Only auto-select customer on initial load, not on refresh
      if (!forceRefresh && customerList.length > 0 && !selectedCustomer && callingMode === "auto") {
        const mostActive = customerList[0];
        setSelectedCustomer(mostActive.customer_id);
      }
      
      if (forceRefresh) {
        toast({
          title: "Customers Refreshed",
          description: `Loaded ${customerList.length} customers with campaign engagement.`,
        });
      }
    } catch (error: any) {
      if (forceRefresh) {
        toast({
          title: "Error Loading Customers",
          description: error.message || "Failed to load customers.",
          variant: "destructive",
        });
      }
    }
  };

  // Generate call script and initiate call
  const initiateCustomerCall = async (customerId?: string) => {
    let customer: (CustomerDocument & { customer_id: string }) | null = null;
    
    if (callingMode === "manual") {
      if (!manualPhoneNumber.trim()) {
        toast({
          title: "Phone Number Required",
          description: "Please enter a phone number to call.",
          variant: "destructive",
        });
        return;
      }
      
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
    setEditedCallScript(""); // Clear edited script
    setCallAudio(null);
    setCallFeedback(null);
    setConversationLog([]);
    setIsEditingScript(false); // Reset edit mode
    setCustomerResponses([]); // Clear customer responses

    try {
      const customerName = customer.first_name && customer.last_name 
        ? `${customer.first_name} ${customer.last_name}`
        : customer.first_name || customer.email || "the customer";
      
      const phoneNumber = customer.phone || manualPhoneNumber || "N/A";
      
      // Build conversation context from chat messages for script generation
      const conversationContext = chatMessages
        .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n\n");
      
      let query = `Generate a phone call script for an AGENT to call ${customerName} at ${phoneNumber} based on the following campaign conversation:\n\n${conversationContext}\n\n`;
      
      if (callingMode === "auto" && customer.responded_to_campaigns) {
        query += `Customer details:
- Total purchases: ${customer.total_purchases || 0}
- Responded to ${customer.responded_to_campaigns || 0} campaigns
- Converted ${customer.converted_campaigns || 0} campaigns
- Email open rate: ${customer.email_open_rate || 0}%
- Preferred contact: ${customer.preferred_contact_method || 'Email'}
- Favorite product: ${customer.favorite_product_category || 'N/A'}

IMPORTANT: Generate ONLY the AGENT's side of the conversation. Do NOT include customer responses.

Create a friendly, conversational script that includes ONLY what the AGENT will say:
1. Agent introduces themselves
2. Agent references the campaign conversation context
3. Agent asks about their experience with the campaigns
4. Agent gathers feedback on campaign effectiveness
5. Agent thanks them for their time

Format: Write only the agent's lines, one after another. Do NOT include customer responses like "Customer: ..." or "${customerName}: ...". The customer responses will be captured during the actual call via Twilio.

Example format:
Agent: Hello, this is [Agent Name] calling from [Company Name]. Is this ${customerName}?
Agent: Great! I wanted to take a moment to discuss our recent campaigns...
Agent: [Continue with agent's questions and statements]

Keep it natural and conversational, suitable for a phone call.`;
      } else {
        query += `This is a ${callingMode === "manual" ? "manual" : "new"} customer call based on campaign conversation.

IMPORTANT: Generate ONLY the AGENT's side of the conversation. Do NOT include customer responses.

Create a friendly, conversational script that includes ONLY what the AGENT will say:
1. Agent introduces themselves
2. Agent references the campaign conversation
3. Agent asks about their experience with marketing campaigns
4. Agent gathers feedback
5. Agent thanks them for their time

Format: Write only the agent's lines, one after another. Do NOT include customer responses. The customer responses will be captured during the actual call.

Example format:
Agent: Hello, this is [Agent Name] calling from [Company Name]...
Agent: [Continue with agent's questions and statements]

Keep it natural and conversational, suitable for a phone call.`;
      }

      const response = await ragApi.campaignQuery({
        query,
        k: 5,
      });

      let script = response.answer || "";
      
      // Post-process script to remove any customer responses that might have been generated
      // Clean up lines that contain customer responses (e.g., "Henry:", "Customer:", etc.)
      const customerNameFirst = customer.first_name || "";
      const customerNameFull = customer.first_name && customer.last_name 
        ? `${customer.first_name} ${customer.last_name}` 
        : customerNameFirst;
      
      // Split script into lines and filter out customer responses
      const scriptLines = script.split('\n');
      const agentLines: string[] = [];
      
      for (const line of scriptLines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) {
          continue;
        }
        
        // Skip lines that start with customer name or "Customer:" or similar patterns
        const lowerLine = trimmedLine.toLowerCase();
        if (
          lowerLine.startsWith(`${customerNameFirst.toLowerCase()}:`) ||
          lowerLine.startsWith(`${customerNameFull.toLowerCase()}:`) ||
          lowerLine.startsWith('customer:') ||
          lowerLine.startsWith('henry:') ||
          lowerLine.startsWith('alice:') ||
          lowerLine.startsWith('bob:') ||
          lowerLine.startsWith('charlie:') ||
          lowerLine.startsWith('diana:') ||
          lowerLine.startsWith('eve:') ||
          lowerLine.startsWith('frank:') ||
          lowerLine.startsWith('grace:') ||
          lowerLine.startsWith('john:') ||
          lowerLine.startsWith('jane:') ||
          // Skip lines that are clearly customer responses (short affirmative responses)
          (trimmedLine.match(/^(yes|no|okay|ok|sure|thanks|thank you|that sounds good|great|awesome|perfect|i see|alright|i understand)/i) && 
           !trimmedLine.startsWith('Agent:') && !trimmedLine.startsWith('**'))
        ) {
          // This is a customer response - skip it
          continue;
        }
        
        // Keep agent lines and other content
        agentLines.push(line);
      }
      
      // Rejoin lines, ensuring all agent lines are properly formatted
      script = agentLines.join('\n').trim();
      
      // If script is empty or too short, provide a fallback
      if (!script || script.length < 50) {
        script = `Agent: Hello, this is calling from our marketing team. Is this ${customerNameFull || customerNameFirst || 'the customer'}?

Agent: Great! I wanted to take a moment to discuss our recent campaigns with you. Based on our conversation about ${conversationContext.substring(0, 100)}...

Agent: I'd love to hear your thoughts on how our campaigns have been working for you. Have you found them useful?

Agent: Thank you for your time and feedback. We really appreciate it!`;
      }
      
      setCallScript(script);
      setEditedCallScript(script); // Initialize editable script with generated script
      setConversationLog([{ role: "agent", content: script }]);

      // Try to generate audio for the call script (optional - uses ElevenLabs)
      // If it fails (e.g., quota exceeded), the call will still work with Twilio's built-in TTS
      try {
        const audio = await ragApi.campaignVoice({
          query: script,
          k: 5,
        });
        setCallAudio(audio);
      } catch (audioError: any) {
        // Don't show error toast - audio is optional, call will work without it
        // Twilio will use its built-in TTS during the actual call
        setCallAudio(null);
      }

      toast({
        title: "Call Script Generated",
        description: `Script ready for ${customer.first_name || customer.email}. You can now make the actual call.${callAudio ? " Audio preview available." : ""}`,
      });
    } catch (error: any) {
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
    // Use edited script if available, otherwise use generated script
    const scriptToUse = editedCallScript.trim() || callScript.trim();
    
    if (!scriptToUse) {
      toast({
        title: "Call Script Required",
        description: "Please generate a call script first or enter a transcript.",
        variant: "destructive",
      });
      return;
    }

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
    setCustomerResponses([]); // Clear previous responses
    try {
      const callRequest: PhoneCallRequest = {
        phone_number: phoneNumber,
        customer_name: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : manualCustomerName,
        customer_id: customer?.customer_id,
        script_text: scriptToUse, // Use the edited/generated script
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
            
            // Fetch conversation history if call completed
            if (status.status === "completed") {
              try {
                const conversation = await phoneCallApi.getConversation(result.call_sid);
                setCallConversation(conversation);
                setConversationLog(conversation.conversation_history);
                
                // Extract customer responses from conversation (real-time responses from actual call)
                const customerResponsesList = conversation.conversation_history
                  .filter(ex => ex.role === "customer")
                  .map(ex => ({
                    timestamp: new Date(),
                    content: ex.content,
                  }));
                setCustomerResponses(customerResponsesList);
                
                // Store full conversation in MemMachine
                const fullConversationText = `Phone Call Conversation - ${new Date().toISOString()}\n\nCustomer: ${customer?.first_name || manualCustomerName || phoneNumber}\nPhone: ${phoneNumber}\n\nAgent Script (Transcript):\n${scriptToUse}\n\nConversation:\n${conversation.conversation_history.map(exchange => `${exchange.role}: ${exchange.content}`).join("\n\n")}\n\nCustomer Responses (Real-time):\n${conversation.customer_responses.join("\n")}`;
                await storeConversationInMemory(fullConversationText, customer?.customer_id);
                
                // Refresh customer data after storing new conversation (new data in database)
                // This ensures the UI reflects the updated information
                setTimeout(() => {
                  loadCustomersForCalling(true); // Force refresh after new data is stored
                  loadCustomersForEmail(true); // Force refresh email customers too
                }, 1000); // Small delay to ensure data is stored
                
                toast({
                  title: "Call Completed!",
                  description: `Conversation recorded and stored. ${conversation.total_exchanges} exchanges captured. ${customerResponsesList.length} customer responses received.`,
                });
              } catch (error) {
              }
            }
          }
        } catch (error) {
        }
      }, 2000);
      
      setCallStatusInterval(interval);

      toast({
        title: "Call Initiated!",
        description: `Calling ${phoneNumber}. The customer will receive the call shortly.`,
      });

      // Initialize conversation log with agent script
      setConversationLog([{
        role: "agent",
        content: scriptToUse,
      }, {
        role: "system",
        content: `Call initiated to ${phoneNumber} at ${new Date().toLocaleTimeString()}`
      }]);
    } catch (error: any) {
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate call. Please check Twilio configuration.",
        variant: "destructive",
      });
    } finally {
      setCallingLoading(false);
    }
  };

  const recordCallFeedback = async (feedback: "positive" | "negative") => {
    setCallFeedback(feedback);
    const customer = customers.find(c => c.customer_id === selectedCustomer) || 
                     top5Customers.find(c => c.customer_id === selectedCustomer);
    
    // Store feedback in MemMachine
    const feedbackText = `Campaign Feedback - ${new Date().toISOString()}\n\nCustomer: ${customer?.first_name || manualCustomerName || 'Unknown'}\nFeedback: ${feedback === "positive" ? "Campaign is working well" : "Campaign needs improvement"}\n\nCall Conversation:\n${callConversation ? callConversation.conversation_history.map(ex => `${ex.role}: ${ex.content}`).join("\n\n") : conversationLog.map(log => `${log.role}: ${log.content}`).join("\n\n")}`;
    await storeConversationInMemory(feedbackText, customer?.customer_id);
    
    toast({
      title: feedback === "positive" ? "Campaign Working!" : "Campaign Needs Improvement",
      description: `Feedback recorded and stored for ${customer?.first_name || customer?.email || manualCustomerName || 'customer'}.`,
    });

    setConversationLog(prev => [...prev, {
      role: "feedback",
      content: `Customer feedback: ${feedback === "positive" ? "Campaign is working well" : "Campaign needs improvement"}`
    }]);
  };

  // Track if data has been loaded to prevent unnecessary reloads
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState<number | null>(null);
  
  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (callStatusInterval) {
        clearInterval(callStatusInterval);
      }
    };
  }, [callStatusInterval]);

  // Load customers only on initial mount, not on every tab switch
  // Only reload if data hasn't been loaded yet, or if explicitly requested
  useEffect(() => {
    // Check if we should load data
    // Only load if:
    // 1. Data hasn't been loaded yet (first mount)
    // 2. OR last load was more than 5 minutes ago (stale data)
    // 3. OR data was explicitly cleared (dataLoaded is false)
    const shouldLoad = !dataLoaded || 
      (lastLoadTime && Date.now() - lastLoadTime > 5 * 60 * 1000); // 5 minutes
    
    if (shouldLoad) {
      loadCustomersForCalling();
      loadCustomersForEmail();
      setDataLoaded(true);
      setLastLoadTime(Date.now());
    }
    
    // Initialize chat with welcome message only if chat is empty
    if (chatMessages.length === 0) {
      setChatMessages([{
        role: "assistant",
        content: "Hello! I'm your campaign generation assistant. I can help you create marketing campaigns based on your customer data. \n\nYou can ask me to:\n- Generate campaigns for specific periods (7 days, 30 days, festivals)\n- Create campaigns targeting specific customer segments\n- Design campaigns based on customer preferences\n- Generate campaign content, timing, and channels\n\nWhat kind of campaign would you like to create?",
        timestamp: new Date(),
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount

  // Track if email generation is in progress to prevent multiple simultaneous calls
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const emailGeneratedRef = useRef(false);
  
  // Auto-generate email from conversation when chat messages change
  // Also auto-generate when campaigns are generated
  useEffect(() => {
    // Don't generate if already generating or already generated
    if (isGeneratingEmail || emailGeneratedRef.current) {
      return;
    }
    
    // Auto-generate if enabled and we have enough conversation
    if (autoGenerateEmail && chatMessages.length > 2) {
      // Check if email body is empty before generating
      const hasEmailContent = emailSubject.trim().length > 0 || emailBody.trim().length > 0;
      if (!hasEmailContent) {
        // Small delay to ensure state is updated, with debouncing
        const timeoutId = setTimeout(() => {
          if (!isGeneratingEmail && !emailGeneratedRef.current) {
            generateEmailFromConversation();
          }
        }, 1000); // Increased delay for debouncing
        return () => clearTimeout(timeoutId);
      }
    }
    
    // Also auto-generate when campaigns are generated (regardless of auto-generate setting)
    // This ensures email is always generated when campaigns are created
    // Only generate if email body is empty to avoid regenerating unnecessarily
    if (generatedCampaigns.length > 0 && chatMessages.length > 2) {
      // Check if email body is empty (use a ref or state check)
      const hasEmailContent = emailSubject.trim().length > 0 || emailBody.trim().length > 0;
      if (!hasEmailContent && !isGeneratingEmail && !emailGeneratedRef.current) {
        const timeoutId = setTimeout(() => {
          if (!isGeneratingEmail && !emailGeneratedRef.current) {
            generateEmailFromConversation();
          }
        }, 2000); // Wait for campaigns to be fully set
        return () => clearTimeout(timeoutId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages, autoGenerateEmail, generatedCampaigns.length]); // Removed emailSubject and emailBody to prevent infinite loop

  // Generate email from conversation
  const generateEmailFromConversation = async () => {
    // Prevent multiple simultaneous calls
    if (isGeneratingEmail || emailGeneratedRef.current) {
      return;
    }
    
    if (chatMessages.length < 2) {
      toast({
        title: "Insufficient Conversation",
        description: "Please have a conversation first to generate email content.",
        variant: "default",
      });
      return;
    }
    
    setIsGeneratingEmail(true);
    setEmailLoading(true);
    try {
      // Build conversation context with campaign details
      const conversationText = chatMessages
        .map(msg => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n\n");
      
      // Include generated campaigns if available
      let campaignContext = "";
      if (generatedCampaigns.length > 0) {
        campaignContext = `\n\nGenerated Campaigns:\n${generatedCampaigns.map((c, idx) => 
          `${idx + 1}. ${c.day} (${c.date}): ${c.caption}\n   Channel: ${c.channel}\n   Story: ${c.story}\n   Timing: ${c.timing}`
        ).join("\n\n")}`;
      }
      
      // More explicit query for email generation
      const emailQuery = `Generate a professional marketing email based on the following campaign conversation and details:

CONVERSATION:
${conversationText}
${campaignContext}

REQUIREMENTS:
1. Create a compelling subject line that captures attention and reflects the campaign theme
2. Write a detailed email body that:
   - Introduces the campaign or offer
   - Highlights key benefits and value propositions
   - Includes specific details from the conversation
   - Has a clear call-to-action
   - Uses a professional but engaging tone
   - Is personalized for customers (use placeholders like {{first_name}}, {{favorite_product}})
3. Make it suitable for sending to top customers who have high engagement

FORMAT YOUR RESPONSE EXACTLY AS:
Subject: [your subject line here]

Body:
[your email body here - multiple paragraphs are fine]

Make sure the email body is comprehensive, engaging, and includes all relevant campaign information from the conversation.`;
      
      const response = await ragApi.campaignQuery({
        query: emailQuery,
        k: 15, // Get more context for better email generation
      });
      
      
      // Parse subject and body from response - try multiple patterns
      const answer = response.answer || "";
      
      if (!answer || answer.trim().length === 0) {
        throw new Error("Empty response from email generation API");
      }
      
      // Try different patterns to extract subject and body
      let subjectMatch = answer.match(/Subject:\s*(.+?)(?:\n|$)/i) || 
                        answer.match(/SUBJECT:\s*(.+?)(?:\n|$)/i) ||
                        answer.match(/^Subject:\s*(.+?)$/im);
      
      // Try different patterns for body extraction
      let bodyMatch = answer.match(/Body:\s*([\s\S]+?)(?:\n\nSubject:|$)/i) ||
                     answer.match(/Body:\s*([\s\S]+?)(?:\n*$)/i) ||
                     answer.match(/BODY:\s*([\s\S]+)/i) ||
                     answer.match(/Body:\s*([\s\S]+)/i);
      
      // If no body match but we have content after "Body:", try to extract everything after it
      if (!bodyMatch && answer.includes("Body:")) {
        const bodyIndex = answer.indexOf("Body:");
        const bodyContent = answer.substring(bodyIndex + 5).trim();
        if (bodyContent.length > 0) {
          bodyMatch = [null, bodyContent];
        }
      }
      
      // If still no body match, check if there's content after subject
      if (!bodyMatch && subjectMatch) {
        const subjectIndex = answer.indexOf(subjectMatch[0]);
        const contentAfterSubject = answer.substring(subjectIndex + subjectMatch[0].length).trim();
        // Remove "Body:" prefix if present
        const cleanedContent = contentAfterSubject.replace(/^Body:\s*/i, "").trim();
        if (cleanedContent.length > 0) {
          bodyMatch = [null, cleanedContent];
        }
      }
      
      // Extract subject (will be set together with body below)
      const finalSubject = subjectMatch && subjectMatch[1]
        ? subjectMatch[1].trim()
        : (generatedCampaigns.length > 0 
          ? `Exciting Campaign Update - ${generatedCampaigns[0].caption.substring(0, 50)}...`
          : `Campaign Update - ${new Date().toLocaleDateString()}`);
      
      // Extract body - prioritize extracted body, fallback to full answer
      let finalBody = "";
      if (bodyMatch && bodyMatch[1] && bodyMatch[1].trim().length > 0) {
        finalBody = bodyMatch[1].trim();
      } else if (answer.trim().length > 0) {
        // Use full answer if we can't parse, but remove subject line if present
        let bodyContent = answer;
        if (subjectMatch) {
          bodyContent = bodyContent.replace(subjectMatch[0], "").trim();
        }
        // Remove "Body:" prefix if present
        bodyContent = bodyContent.replace(/^Body:\s*/i, "").trim();
        finalBody = bodyContent;
      } else {
        // Last resort: generate a basic email body from conversation
        finalBody = `Dear {{first_name}},

We're excited to share our latest campaign with you!

${conversationText.split('\n').slice(0, 5).join('\n')}

Thank you for being a valued customer!

Best regards,
The Marketing Team`;
      }
      
      // Set both subject and body together to prevent multiple state updates
      setEmailSubject(finalSubject);
      setEmailBody(finalBody);
      
      // Mark as generated to prevent re-generation
      emailGeneratedRef.current = true;
      
      
      toast({
        title: "Email Generated",
        description: `Email content generated successfully. Subject and body are ready for review.`,
      });
    } catch (error: any) {
      
      // Generate a fallback email body based on conversation
      const fallbackSubject = generatedCampaigns.length > 0
        ? `Campaign Update - ${generatedCampaigns[0].caption.substring(0, 40)}`
        : `Campaign Update - ${new Date().toLocaleDateString()}`;
      
      const fallbackBody = `Dear {{first_name}},

We're excited to share our latest campaign with you!

${chatMessages
  .filter(msg => msg.role === "assistant")
  .map(msg => msg.content)
  .join("\n\n")
  .substring(0, 500)}

${generatedCampaigns.length > 0 
  ? `\n\nCampaign Details:\n${generatedCampaigns.map(c => `- ${c.caption}`).join("\n")}`
  : ""}

We hope you'll take advantage of this special offer!

Best regards,
The Marketing Team`;
      
      setEmailSubject(fallbackSubject);
      setEmailBody(fallbackBody);
      
      // Mark as generated even with fallback
      emailGeneratedRef.current = true;
      
      toast({
        title: "Email Generated (Fallback)",
        description: "Email generated using fallback method. Please review and edit as needed.",
        variant: "default",
      });
    } finally {
      setIsGeneratingEmail(false);
      setEmailLoading(false);
    }
  };

  // Load top 50 customers for email sending (sorted by engagement)
  // This function is called manually or when data needs to be refreshed
  const loadCustomersForEmail = async (forceRefresh: boolean = false) => {
    // Don't reload if data was recently loaded and forceRefresh is false
    if (!forceRefresh && dataLoaded && lastLoadTime && Date.now() - lastLoadTime < 5 * 60 * 1000) {
      return;
    }
    
    try {
      
      // Use structured API first (much faster than RAG)
      let customerData: CustomerDocument[] = [];
      try {
        const response = await customersApi.findActive(1000); // Get more than 50 to sort and filter
        const documents = Array.isArray(response?.documents) ? response.documents : [];
        customerData = documents.map(doc => doc.metadata as CustomerDocument);
      } catch (structuredError) {
        // Fallback to RAG if structured API fails
        try {
          const response = await ragApi.campaignQuery({
            query: 'Find customers with email addresses who have high campaign engagement, email open rates, and conversions.',
            k: 100, // Get more to have enough after filtering
          });
          const documents = Array.isArray(response?.documents) ? response.documents : [];
          customerData = documents.map(doc => doc.metadata as CustomerDocument);
        } catch (ragError) {
          throw ragError;
        }
      }
      
      if (customerData.length === 0) {
        setEmailRecipients([]);
        if (forceRefresh) {
          toast({
            title: "No Customers Found",
            description: "No customers with email addresses found.",
            variant: "default",
          });
        }
        return;
      }
      
      // Filter customers with emails, calculate engagement score, and sort
      const customerList = customerData
        .filter(c => c.email && c.customer_id) // Must have email and customer_id
        .map(c => {
          // Calculate comprehensive engagement score
          const engagementScore = 
            (c.responded_to_campaigns || 0) * 3 +
            (c.converted_campaigns || 0) * 5 +
            (c.email_open_rate || 0) / 10 +
            (c.email_click_rate || 0) / 10 +
            (c.total_spent || 0) / 100 +
            (c.total_purchases || 0) * 2;
          
          return {
            ...c,
            engagementScore,
          };
        })
        .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
        .slice(0, 50) // Top 50 only
        .map(c => ({
          email: c.email!,
          customer_id: String(c.customer_id || ""),
          name: c.first_name && c.last_name ? `${c.first_name} ${c.last_name}` : undefined,
          personalization: {
            first_name: c.first_name,
            last_name: c.last_name,
            customer_segment: c.customer_segment,
            favorite_product: c.favorite_product_category,
          },
        }));
      
      setEmailRecipients(customerList);
      
      // Update load time
      setDataLoaded(true);
      setLastLoadTime(Date.now());
      
      if (forceRefresh) {
        toast({
          title: "Top 50 Customers Loaded",
          description: `Loaded ${customerList.length} top customers with highest engagement for email sending.`,
        });
      }
    } catch (error: any) {
      if (forceRefresh) {
        toast({
          title: "Error Loading Customers",
          description: error.message || "Failed to load customers. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Send bulk emails
  const sendBulkEmails = async () => {
    if (emailRecipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please load customers first or add recipients manually.",
        variant: "destructive",
      });
      return;
    }

    if (!emailSubject.trim() || !emailBody.trim()) {
      toast({
        title: "Email Content Required",
        description: "Please enter both subject and body for the email.",
        variant: "destructive",
      });
      return;
    }

    setEmailLoading(true);
    setEmailSent(false);
    setEmailResults(null);

    try {
      // Store email conversation in MemMachine
      const emailConversationText = `Email Campaign Sent - ${new Date().toISOString()}\n\nSubject: ${emailSubject}\n\nBody: ${emailBody}\n\nRecipients: ${emailRecipients.length} customers\n\nCampaign Context:\n${chatMessages.map(msg => `${msg.role}: ${msg.content}`).join("\n\n")}`;
      await storeConversationInMemory(emailConversationText, "campaign-automation");
      
      const request: BulkEmailRequest = {
        recipients: emailRecipients,
        subject: emailSubject,
        body: emailBody,
        campaign_name: generatedCampaigns.length > 0 ? `Campaign from Chat - ${new Date().toLocaleDateString()}` : undefined,
      };

      const result = await emailApi.sendBulk(request);
      
      setEmailSent(true);
      setEmailResults({
        sent: result.sent_count,
        failed: result.failed_count,
      });

      // Refresh customer data after sending emails (new data in database)
      // This ensures the UI reflects the updated information
      setTimeout(() => {
        loadCustomersForCalling(true); // Force refresh after new data is stored
        loadCustomersForEmail(true); // Force refresh email customers too
      }, 1000); // Small delay to ensure data is stored

      toast({
        title: "Emails Sent!",
        description: `Successfully sent ${result.sent_count} emails. ${result.failed_count > 0 ? `${result.failed_count} failed.` : ''}`,
      });
    } catch (error: any) {
      toast({
        title: "Email Sending Failed",
        description: error.message || "Failed to send emails. Please try again.",
        variant: "destructive",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle chat message for campaign generation
  const handleChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setChatLoading(true);

    const newUserMessage = {
      role: "user" as const,
      content: userMessage,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, newUserMessage]);

    try {
      const lowerMessage = userMessage.toLowerCase();
      let period: "7days" | "30days" | "festival" | null = null;
      
      if (lowerMessage.includes("7 day") || lowerMessage.includes("week")) {
        period = "7days";
      } else if (lowerMessage.includes("30 day") || lowerMessage.includes("month")) {
        period = "30days";
      } else if (lowerMessage.includes("festival") || lowerMessage.includes("holiday")) {
        period = "festival";
      }

      if (period) {
        // Use backend RAG API to generate campaign
        const query = `Generate a ${period === "7days" ? "7-day" : period === "30days" ? "30-day" : "festival"} marketing campaign schedule. ${userMessage}. Create a detailed campaign plan with specific days, captions, and campaign types.`;
        
        const response = await ragApi.campaignQuery(query);
        
        // Format the response as campaign data
        const campaigns = response.documents?.map((doc: any, index: number) => ({
          day: `Day ${index + 1}`,
          date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          banner: null,
          caption: doc.content || doc.metadata?.title || `Campaign ${index + 1}`,
          story: doc.content || "",
          timing: "09:00 AM",
          channel: "Email",
          channelReason: "Automated campaign for optimal engagement",
          type: "automation"
        })) || [];
        setGeneratedCampaigns(campaigns);
        
        const assistantMessage = {
          role: "assistant" as const,
          content: `I've generated a ${period === "7days" ? "7-day" : period === "30days" ? "30-day" : "festival"} campaign schedule for you! The campaigns are displayed below. You can now send emails to customers or make calls to test campaign effectiveness.`,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, assistantMessage]);

        // Store campaign generation in memory
        const campaignText = `Campaign Generated - ${new Date().toISOString()}\n\nPeriod: ${period}\nCampaigns: ${campaigns.length}\n\nUser Request: ${userMessage}\n\nCampaigns:\n${campaigns.map(c => `${c.day} - ${c.caption}`).join("\n")}`;
        await storeConversationInMemory(campaignText, "campaign-automation");

        // Auto-generate email after campaign generation (only if not already generating and not already generated)
        // This ensures email is always generated when campaigns are created
        // The useEffect hook will handle this, but we can trigger it manually if needed
        if (!isGeneratingEmail && !emailGeneratedRef.current) {
          const hasEmailContent = emailSubject.trim().length > 0 || emailBody.trim().length > 0;
          if (!hasEmailContent) {
            setTimeout(() => {
              if (!isGeneratingEmail && !emailGeneratedRef.current) {
                generateEmailFromConversation();
              }
            }, 2000); // Wait for campaigns to be fully set
          }
        }
      } else {
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
          k: 15,
      });

      const assistantMessage = {
        role: "assistant" as const,
        content: response.answer,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMessage]);

        // Store conversation in memory
        const conversationText = `User: ${userMessage}\n\nAssistant: ${response.answer}`;
        await storeConversationInMemory(conversationText, "campaign-automation");

        // Auto-generate email after campaign conversation (if auto-generate is enabled or if we have enough context)
        if ((autoGenerateEmail || chatMessages.length >= 3) && !isGeneratingEmail && !emailGeneratedRef.current) {
          const hasEmailContent = emailSubject.trim().length > 0 || emailBody.trim().length > 0;
          if (!hasEmailContent) {
            setTimeout(() => {
              if (!isGeneratingEmail && !emailGeneratedRef.current) {
                generateEmailFromConversation();
              }
            }, 1500);
          }
        }
      }
    } catch (error: any) {
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
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Campaign Automation Flow</h1>
                <p className="text-muted-foreground">
                  Continuous campaign workflow: Chat → Email → Calls. All conversations are stored automatically.
                </p>
              </div>
            </div>

            {/* Main Layout: Content on Left, Flow Indicator on Right */}
            <div className="flex gap-6">
              {/* Left Side: Main Content Sections */}
              <div className="flex-1 space-y-6">
              {/* Section 1: Chat Interface */}
            <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
              <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-accent" />
                    Campaign Chat
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                    Start a conversation to generate campaigns. All conversations are automatically stored.
                    </p>
              </CardHeader>
              <CardContent>
                  <div className="flex flex-col h-[500px] border border-border rounded-lg bg-background">
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

                  <div className="border-t border-border p-4">
                    <div className="flex gap-2">
                      <Textarea
                          placeholder="Ask me to generate a campaign..."
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
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          id="auto-email"
                          checked={autoGenerateEmail}
                          onChange={(e) => setAutoGenerateEmail(e.target.checked)}
                          className="rounded"
                        />
                        <label htmlFor="auto-email" className="text-xs text-muted-foreground">
                          Auto-generate email from conversation
                        </label>
                  </div>
                </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 2: Email Generation */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                    Email Generation (Top 50 Customers)
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                    Email is automatically generated from conversation. Review and send to top 50 customers when ready.
                    </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => loadCustomersForEmail(true)}
                    variant="outline"
                    className="flex-1"
                      size="sm"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Refresh Customers ({emailRecipients.length})
                  </Button>
                    <Button
                      onClick={() => {
                        // Reset the ref to allow manual regeneration
                        emailGeneratedRef.current = false;
                        generateEmailFromConversation();
                      }}
                      variant="outline"
                      size="sm"
                      disabled={emailLoading || isGeneratingEmail || chatMessages.length < 2}
                    >
                      {emailLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </Button>
                </div>

                {emailRecipients.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg border border-border">
                      <p className="text-sm font-semibold mb-2">Top 50 Customers: {emailRecipients.length} recipients</p>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {emailRecipients.slice(0, 10).map((recipient, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                              {idx + 1}. {recipient.name || recipient.email}
                          </div>
                        ))}
                        {emailRecipients.length > 10 && (
                            <p className="text-xs text-muted-foreground font-semibold">... and {emailRecipients.length - 10} more customers</p>
                        )}
                      </div>
                    </ScrollArea>
                      <p className="text-xs text-muted-foreground mt-2">
                        These are the top 50 customers with highest engagement scores based on campaign responses, conversions, and email activity.
                      </p>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Email Subject</label>
                    <Input
                      placeholder="e.g., Special Offer - Limited Time!"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email Body</label>
                    <Textarea
                        placeholder="Email body will be generated from conversation..."
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                        className="min-h-[250px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use placeholders: {"{{first_name}}"}, {"{{last_name}}"}, {"{{favorite_product}}"} for personalization
                    </p>
                  </div>
                </div>

                <Button
                  onClick={sendBulkEmails}
                  disabled={emailLoading || emailRecipients.length === 0 || !emailSubject.trim() || !emailBody.trim()}
                  className="w-full bg-primary hover:bg-primary/90"
                    size="lg"
                >
                  {emailLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending to Top 50 Customers...
                    </>
                  ) : emailSent ? (
                    <>
                      <MailCheck className="h-4 w-4 mr-2" />
                        Emails Sent to {emailRecipients.length} Customers!
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                        Send to Top 50 Customers ({emailRecipients.length})
                    </>
                  )}
                </Button>

                {emailResults && (
                  <div className="p-3 bg-success/10 rounded-lg border border-success/30">
                    <p className="text-sm font-semibold text-success mb-1">Email Results</p>
                    <p className="text-xs text-muted-foreground">
                      Sent: {emailResults.sent} | Failed: {emailResults.failed}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

              {/* Section 3: Customer Calling */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5 text-primary" />
                    Customer Calls
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                    Make calls using conversation script. All call conversations are stored automatically.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={callingMode === "auto" ? "default" : "outline"}
                    onClick={() => setCallingMode("auto")}
                    className="flex-1"
                  >
                    <User className="h-4 w-4 mr-2" />
                      Auto (Top Customers)
                  </Button>
                  <Button
                    variant={callingMode === "manual" ? "default" : "outline"}
                    onClick={() => setCallingMode("manual")}
                    className="flex-1"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Manual Number
                  </Button>
                </div>

                {callingMode === "auto" ? (
                  <div className="space-y-4">
                  <Button
                    onClick={() => loadCustomersForCalling(true)} // Force refresh
                    variant="outline"
                    className="w-full"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Refresh Customers
                  </Button>

                    {top5Customers.length > 0 && (
                        <ScrollArea className="h-48 border border-border rounded-lg p-3">
                      <div className="space-y-2">
                            {top5Customers.map((customer, idx) => (
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
                                    <div>
                                    <p className="text-sm font-medium">
                                        {customer.first_name && customer.last_name
                                          ? `${customer.first_name} ${customer.last_name}`
                                          : customer.email || customer.customer_id}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                      {customer.phone || "No phone"} • {customer.email || "No email"}
                                      </p>
                                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                  <span>Responses: {customer.responded_to_campaigns || 0}</span>
                                  <span>•</span>
                                  <span>Conversions: {customer.converted_campaigns || 0}</span>
                                </div>
                              </div>
                                  <Badge variant="outline">#{idx + 1}</Badge>
                        </div>
                      </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                  </div>
                ) : (
                    <div className="space-y-3">
                      <Input
                        placeholder="Customer Name (Optional)"
                        value={manualCustomerName}
                        onChange={(e) => setManualCustomerName(e.target.value)}
                      />
                      <Input
                        placeholder="Phone Number (Required)"
                        value={manualPhoneNumber}
                        onChange={(e) => setManualPhoneNumber(e.target.value)}
                        type="tel"
                      />
                  </div>
                )}
                
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => initiateCustomerCall()}
                      disabled={callingLoading || (callingMode === "auto" && !selectedCustomer) || (callingMode === "manual" && !manualPhoneNumber.trim())}
                      variant="outline"
                    >
                      {callingLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Generate Script
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={makeActualCall}
                      disabled={callingLoading || activeCall !== null || !(callScript || editedCallScript) || (callingMode === "auto" && !selectedCustomer) || (callingMode === "manual" && !manualPhoneNumber.trim())}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {callingLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : activeCall ? (
                        <>
                          <Phone className="h-4 w-4 mr-2" />
                          Call Active
                        </>
                      ) : (
                        <>
                          <PhoneCall className="h-4 w-4 mr-2" />
                          Make Call
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Call Script/Transcript Editor - Show after script is generated */}
                  {(callScript || editedCallScript || isEditingScript) && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">Call Transcript (Agent Script):</p>
                          <p className="text-xs text-muted-foreground">
                            This is what the agent will say during the call. Edit it to improve the conversation flow.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!isEditingScript && (callScript || editedCallScript) && (
                            <Button
                              onClick={() => setIsEditingScript(true)}
                              variant="outline"
                              size="sm"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          )}
                          {isEditingScript && (
                            <>
                              <Button
                                onClick={() => {
                                  setEditedCallScript(callScript); // Reset to original
                                  setIsEditingScript(false);
                                }}
                                variant="outline"
                                size="sm"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => {
                                  setCallScript(editedCallScript); // Save edited version
                                  setIsEditingScript(false);
                                  toast({
                                    title: "Transcript Updated",
                                    description: "Your edited transcript will be used for the call.",
                                  });
                                }}
                                variant="default"
                                size="sm"
                              >
                                Save
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {isEditingScript ? (
                        <Textarea
                          value={editedCallScript}
                          onChange={(e) => setEditedCallScript(e.target.value)}
                          placeholder="Edit the call transcript/script that the agent will use..."
                          className="min-h-[200px] font-mono text-sm"
                        />
                      ) : (
                        <ScrollArea className="h-40 border border-border rounded-lg p-3 bg-muted/30">
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {editedCallScript || callScript}
                          </p>
                        </ScrollArea>
                      )}
                    </div>
                  )}

                  {/* Manual Transcript Entry - Show if no script generated yet */}
                  {!callScript && !editedCallScript && !isEditingScript && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Or Enter Transcript Manually:</p>
                        <Button
                          onClick={() => {
                            setIsEditingScript(true);
                            setEditedCallScript("");
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Add Transcript
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        You can manually enter a transcript/script for the agent to use during the call.
                      </p>
                    </div>
                  )}

                  {/* Show manual entry textarea when editing without script */}
                  {isEditingScript && !callScript && !editedCallScript && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Enter Call Transcript:</p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setIsEditingScript(false);
                              setEditedCallScript("");
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => {
                              if (editedCallScript.trim()) {
                                setCallScript(editedCallScript);
                                setIsEditingScript(false);
                                toast({
                                  title: "Transcript Saved",
                                  description: "Your transcript will be used for the call.",
                                });
                              } else {
                                toast({
                                  title: "Transcript Required",
                                  description: "Please enter a transcript before saving.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            variant="default"
                            size="sm"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={editedCallScript}
                        onChange={(e) => setEditedCallScript(e.target.value)}
                        placeholder="Enter the call transcript/script that the agent will use during the call..."
                        className="min-h-[200px] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        This is what the agent will say during the call. Enter the complete conversation script.
                      </p>
                    </div>
                  )}
                  
                  {activeCall && (
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-primary">Call in Progress</p>
                          <p className="text-xs text-muted-foreground">
                            Status: {activeCall.status}
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

                  {/* Real-time Customer Responses - Show during/after call */}
                  {customerResponses.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <p className="text-sm font-semibold">Customer Responses (Real-time):</p>
                      <ScrollArea className="h-32 border border-border rounded-lg p-3 bg-accent/5">
                        <div className="space-y-2">
                          {customerResponses.map((response, idx) => (
                            <div key={idx} className="text-sm p-2 bg-accent/10 rounded border border-accent/20">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-accent">Customer Response:</span>
                                <span className="text-xs text-muted-foreground">
                                  {response.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-foreground">{response.content}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <p className="text-xs text-muted-foreground">
                        These are real-time responses captured from the customer during the actual phone call (not AI-generated).
                      </p>
                    </div>
                  )}

                  {/* Full Call Conversation - Show after call completes */}
                  {callConversation && callConversation.conversation_history.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <p className="text-sm font-semibold">Full Call Conversation ({callConversation.total_exchanges} exchanges):</p>
                      <ScrollArea className="h-48 border border-border rounded-lg p-3">
                        <div className="space-y-2">
                          {callConversation.conversation_history.map((log, idx) => (
                            <div
                              key={idx}
                              className={`text-sm p-2 rounded ${
                                log.role === "agent" 
                                  ? "bg-primary/10 text-primary-foreground ml-4" 
                                  : log.role === "customer"
                                  ? "bg-accent/10 text-accent-foreground mr-4"
                                  : "bg-muted"
                              }`}
                            >
                              <span className="font-semibold capitalize">{log.role}:</span> {log.content}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      
                      {callConversation.customer_responses.length > 0 && (
                        <div className="p-3 bg-success/5 rounded-lg border border-success/20">
                          <p className="text-xs font-semibold text-success mb-2">Customer Feedback Summary:</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {callConversation.customer_responses.map((response, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-success">•</span>
                                <span>{response}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
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
                        Feedback recorded and stored in memory.
                        </p>
                      </div>
                    )}

                  {callConversation && !callFeedback && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => recordCallFeedback("positive")}
                        variant="outline"
                        className="flex-1 text-success border-success hover:bg-success/10"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Campaign Working
                      </Button>
                      <Button
                        onClick={() => recordCallFeedback("negative")}
                        variant="outline"
                        className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
                            >
                        <XCircle className="h-4 w-4 mr-2" />
                        Needs Improvement
                      </Button>
                          </div>
                  )}
                </CardContent>
              </Card>
                        
              {/* Generated Campaigns Display */}
              {generatedCampaigns.length > 0 && (
                <Card className="border-success/30 bg-gradient-to-br from-success/5 to-transparent">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-success" />
                      Generated Campaigns ({generatedCampaigns.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {generatedCampaigns.map((campaign, idx) => (
                        <CampaignCard key={idx} campaign={campaign} />
                              ))}
                        </div>
                  </CardContent>
                </Card>
                      )}
                    </div>

              {/* Right Side: Flow Indicator - Vertical */}
              <div className="w-80 flex-shrink-0">
                <Card className="sticky top-6 border-border bg-gradient-to-br from-muted/50 to-background">
                  <CardHeader>
                    <CardTitle className="text-lg">Workflow Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center gap-4">
                      {/* Step 1: Chat */}
                      <div className="flex flex-col items-center gap-2 w-full">
                        <div className="flex items-center gap-3 w-full p-3 bg-accent/10 rounded-lg border border-accent/20">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                            <MessageSquare className="h-5 w-5 text-accent" />
                    </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">Step 1</p>
                            <p className="text-xs text-muted-foreground">Chat & Generate Campaigns</p>
                  </div>
                </div>
                  </div>

                      {/* Arrow Down */}
                      <ArrowDown className="h-6 w-6 text-muted-foreground" />

                      {/* Step 2: Email */}
                      <div className="flex flex-col items-center gap-2 w-full">
                        <div className="flex items-center gap-3 w-full p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">Step 2</p>
                            <p className="text-xs text-muted-foreground">Generate & Send Emails</p>
                            <p className="text-xs text-muted-foreground font-medium mt-1">(Top 50 Customers)</p>
                          </div>
                        </div>
                      </div>

                      {/* Arrow Down */}
                      <ArrowDown className="h-6 w-6 text-muted-foreground" />

                      {/* Step 3: Calls */}
                      <div className="flex flex-col items-center gap-2 w-full">
                        <div className="flex items-center gap-3 w-full p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <PhoneCall className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-foreground">Step 3</p>
                            <p className="text-xs text-muted-foreground">Make Calls & Store</p>
                            <p className="text-xs text-muted-foreground">Conversations</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-6 p-3 bg-muted/50 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground text-center">
                        All conversations are automatically stored in memory for future reference.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}