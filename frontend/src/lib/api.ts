/**
 * API Client for Backend Integration
 * Connects frontend to FastAPI backend endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==================== LangChain RAG Endpoints ====================

export interface StoreDocumentsRequest {
  texts: string[];
  metadatas?: Array<Record<string, any>>;
  source?: string;
}

export interface SearchDocumentsRequest {
  query: string;
  k?: number;
  filter?: Record<string, any>;
}

export interface RAGQueryRequest {
  query: string;
  k?: number;
  include_memories?: boolean;
  user_id?: string;
}

export interface CampaignQueryRequest {
  query: string;
  k?: number;
  include_memories?: boolean;
  user_id?: string;
}

export interface CustomerDocument {
  customer_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  customer_segment?: string;
  loyalty_member?: boolean | string;
  loyalty_points?: number;
  total_purchases?: number;
  total_spent?: number;
  avg_order_value?: number;
  lifetime_value?: number;
  churn_risk_score?: number;
  favorite_product_category?: string;
  preferred_category?: string;
  preferred_contact_method?: string;
  responded_to_campaigns?: number;
  clicked_campaigns?: number;
  converted_campaigns?: number;
  email_open_rate?: number;
  email_click_rate?: number;
  sms_response_rate?: number;
  satisfaction_score?: number;
  social_shares?: number;
  video_completion_rate?: number;
  app_downloads?: number;
  store_visits?: number;
  referrals_made?: number;
  repeat_purchase_rate?: number;
  days_since_last_purchase?: number;
  first_purchase_date?: string;
  last_purchase_date?: string;
  [key: string]: any;
}

export interface CampaignQueryResponse {
  query: string;
  answer: string;
  sources: string[];
  customers_found: number;
  customer_summaries: Array<{
    id?: string;
    name?: string;
    email?: string;
  }>;
  documents: Array<{
    content: string;
    metadata: CustomerDocument;
  }>;
  total_context: number;
  conversation_ready: boolean;
}

// ==================== API Client Functions ====================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle 402 Payment Required (ElevenLabs quota exceeded) gracefully
        if (response.status === 402) {
          try {
            const errorData = await response.json();
            const errorMsg = errorData.detail || "Quota exceeded";
            throw new Error(errorMsg);
          } catch (jsonError) {
            throw new Error("ElevenLabs quota exceeded. The call will still work using Twilio's built-in TTS.");
          }
        }
        
        let errorDetail = response.statusText;
        try {
          const error = await response.json();
          // FastAPI validation errors have 'detail' field
          if (error.detail) {
            if (Array.isArray(error.detail)) {
              // Pydantic validation errors are arrays
              errorDetail = error.detail.map((e: any) => 
                `${e.loc?.join('.')}: ${e.msg}`
              ).join(', ');
            } else {
              errorDetail = error.detail;
            }
          } else if (error.message) {
            errorDetail = error.message;
          }
        } catch {
          // If JSON parsing fails, use status text
        }
        
        throw new Error(errorDetail || `HTTP ${response.status}`);
      }

      // Handle audio responses
      if (response.headers.get('content-type')?.includes('audio')) {
        return response.blob() as unknown as T;
      }

      const data = await response.json();
      return data;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error(`Request timeout: ${url} took longer than 30 seconds to respond`);
      }
      throw fetchError;
    }
  } catch (error) {
    if (error instanceof TypeError) {
      if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        const errorMsg = `Failed to connect to backend at ${API_BASE_URL}. Please ensure the backend server is running and accessible.`;
        throw new Error(errorMsg);
      }
      if (error.message.includes('NetworkError') || error.message.includes('network')) {
        const errorMsg = `Network error connecting to ${API_BASE_URL}. Check your internet connection and backend server status.`;
        throw new Error(errorMsg);
      }
    }
    throw error;
  }
}

// ==================== Document Management ====================

export const documentsApi = {
  /**
   * Store documents in the vector store
   */
  store: async (request: StoreDocumentsRequest) => {
    return apiRequest<{
      success: boolean;
      document_count: number;
      chunk_count: number;
      ids: string[];
      storage_mode: string;
    }>('/langchain-rag/documents', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Search documents
   */
  search: async (request: SearchDocumentsRequest) => {
    return apiRequest<{
      success: boolean;
      query: string;
      results: Array<{
        content: string;
        metadata: Record<string, any>;
      }>;
      total: number;
    }>('/langchain-rag/documents/search', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * List all documents
   */
  list: async (limit: number = 100) => {
    return apiRequest<{
      success: boolean;
      documents: Array<{
        id: string;
        content_preview: string;
        metadata: Record<string, any>;
      }>;
      total: number;
    }>(`/langchain-rag/documents?limit=${limit}`, {
      method: 'GET',
    });
  },

  /**
   * Delete documents by source
   */
  delete: async (source: string) => {
    return apiRequest<{
      success: boolean;
      deleted_count: number;
      message: string;
    }>(`/langchain-rag/documents?source=${encodeURIComponent(source)}`, {
      method: 'DELETE',
    });
  },
};

// ==================== RAG Queries ====================

export const ragApi = {
  /**
   * Standard RAG query
   */
  query: async (request: RAGQueryRequest) => {
    return apiRequest<{
      query: string;
      answer: string;
      sources: string[];
      documents: Array<{
        content: string;
        metadata: Record<string, any>;
      }>;
      total_context: number;
    }>('/langchain-rag/query', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Campaign conversation query (text response)
   * Optimized for voice conversations about campaigns
   */
  campaignQuery: async (request: CampaignQueryRequest): Promise<CampaignQueryResponse> => {
    const response = await apiRequest<CampaignQueryResponse>('/langchain-rag/query/campaign', {
      method: 'POST',
      body: JSON.stringify({
        query: request.query,
        k: Math.min(request.k || 10, 20), // Backend allows up to 20
        include_memories: request.include_memories ?? true,
        user_id: request.user_id,
      }),
    });
    
    // Return empty structure if response is empty
    if (!response || !response.documents || response.documents.length === 0) {
      return {
        query: request.query,
        answer: response?.answer || "No data available",
        sources: response?.sources || [],
        customers_found: 0,
        customer_summaries: [],
        documents: [],
        total_context: 0,
        conversation_ready: false,
      };
    }
    
    return response;
  },

  /**
   * Campaign conversation with voice (audio response)
   * Returns MP3 audio blob
   */
  campaignVoice: async (request: CampaignQueryRequest, voiceId?: string): Promise<Blob> => {
    const url = new URL(`${API_BASE_URL}/langchain-rag/query/campaign/voice`);
    if (voiceId) {
      url.searchParams.set('voice_id', voiceId);
    }

    return apiRequest<Blob>(url.pathname + url.search, {
      method: 'POST',
      body: JSON.stringify({
        query: request.query,
        k: request.k || 10,
        include_memories: request.include_memories ?? true,
        user_id: request.user_id,
      }),
    });
  },

  /**
   * Retrieve context for RAG
   */
  retrieve: async (request: RAGQueryRequest) => {
    return apiRequest<{
      success: boolean;
      query: string;
      documents: Array<{
        content: string;
        metadata: Record<string, any>;
      }>;
      memories: Array<{
        content: string;
        metadata: Record<string, any>;
      }>;
      total_context: number;
    }>('/langchain-rag/retrieve', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};

// ==================== Customer Queries ====================

export const customersApi = {
  /**
   * Find most active customers
   * First tries structured data API, falls back to RAG if needed
   */
  findActive: async (k: number = 10000) => {
    try {
      // Limit to prevent huge responses that can hang the browser
      // 1000 customers is a reasonable limit - implement pagination if more needed
      const safeLimit = Math.min(k, 1000);
      // Try structured data API first (faster, more reliable)
      const response = await apiRequest<{
        success: boolean;
        customers: CustomerDocument[];
        total: number;
      }>(`/api/customers?limit=${safeLimit}`, {
        method: 'GET',
      });
      
      if (response.success && response.customers && response.customers.length > 0) {
        // Convert structured data to RAG-like format for frontend compatibility
        const result = {
          query: 'Who are our most active customers?',
          answer: `Found ${response.customers.length} active customers.`,
          sources: ['customers'],
          customers_found: response.customers.length,
          customer_summaries: response.customers.map(c => ({
            id: c.customer_id,
            name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
            email: c.email,
          })),
          documents: response.customers.map(customer => ({
            content: `${customer.first_name} ${customer.last_name} is a ${customer.customer_segment} customer with ${customer.total_purchases} purchases and $${customer.total_spent} total spent.`,
            metadata: customer,
          })),
          total_context: response.customers.length,
          conversation_ready: true,
        };
        return result;
      }
    } catch (error) {
      // Fallback to RAG query
    }
    
    // Fallback to RAG query
    return ragApi.campaignQuery({
      query: 'Who are our most active customers? Show customers with high total purchases, total spent, and lifetime value.',
      k,
    });
  },

  /**
   * Get customer campaign engagement
   */
  getCampaignEngagement: async (customerId?: string) => {
    const query = customerId
      ? `What is the campaign engagement for customer ${customerId}? Show response rates, conversion rates, and email metrics.`
      : 'Which customers have the highest campaign engagement? Show response rates and conversion rates.';
    
    return ragApi.campaignQuery({
      query,
      k: customerId ? 5 : 10,
    });
  },

  /**
   * Search customers by query
   */
  search: async (query: string, k: number = 10) => {
    return ragApi.campaignQuery({
      query: `Find customers: ${query}`,
      k,
    });
  },
};

// ==================== Campaign Queries ====================

export const campaignsApi = {
  /**
   * Get revenue by channel
   */
  getRevenueByChannel: async () => {
    try {
      const response = await apiRequest<{
        success: boolean;
        revenue_by_channel: Array<{
          name: string;
          revenue: number;
          spend: number;
          count: number;
          roi: number;
        }>;
      }>('/api/analytics/revenue-by-channel', {
        method: 'GET',
      });
      
      if (response.success && response.revenue_by_channel) {
        return response.revenue_by_channel;
      }
      return [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Get revenue by segment
   */
  getRevenueBySegment: async () => {
    try {
      const response = await apiRequest<{
        success: boolean;
        revenue_by_segment: Array<{
          name: string;
          value: number;
          revenue: number;
          spend: number;
          campaign_count: number;
          customer_count: number;
        }>;
      }>('/api/analytics/revenue-by-segment', {
        method: 'GET',
      });
      
      if (response.success && response.revenue_by_segment) {
        return response.revenue_by_segment;
      }
      return [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Get AI-predicted campaign performance
   */
  getPredictedPerformance: async (campaignType: string = "general", targetSegment: string = "all", channel: string = "all") => {
    try {
      const response = await apiRequest<{
        success: boolean;
        predictions: {
          predicted_response_rate: number;
          predicted_conversion_rate: number;
          predicted_open_rate: number;
          predicted_click_rate: number;
          predicted_roi: number;
          confidence_score: number;
          recommendations: string[];
          optimal_send_time: string;
          expected_revenue_multiplier: number;
        };
        historical_campaigns_analyzed: number;
        optimal_channel: {
          channel: string;
          expected_roi: number;
        };
        campaign_context: {
          campaign_type: string;
          target_segment: string;
          channel: string;
        };
      }>(`/api/analytics/predict-campaign-performance?campaign_type=${campaignType}&target_segment=${targetSegment}&channel=${channel}`, {
        method: 'GET',
      });
      
      if (response.success && response.predictions) {
        return response;
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get campaign effectiveness analysis
   * First tries structured data API, falls back to RAG if needed
   */
  getEffectiveness: async () => {
    try {
      // Try structured data API first
      const response = await apiRequest<{
        success: boolean;
        campaigns: Array<{
          campaign_id: string;
          name: string;
          type: string;
          status: string;
          target_segment: string;
          response_rate: number;
          conversion_rate: number;
          open_rate: number;
          click_rate: number;
        }>;
        total_campaigns: number;
      }>('/api/analytics/campaigns', {
        method: 'GET',
      });
      
      
      if (response.success && response.campaigns && response.campaigns.length > 0) {
        // Convert to RAG-like format
        return {
          query: 'How are our campaigns performing?',
          answer: `Found ${response.campaigns.length} campaigns. Average response rate: ${Math.round(response.campaigns.reduce((sum, c) => sum + c.response_rate, 0) / response.campaigns.length)}%`,
          sources: ['campaigns'],
          customers_found: 0,
          customer_summaries: [],
          documents: response.campaigns.map(campaign => ({
                  content: `${campaign.name} is a ${campaign.type} campaign targeting ${campaign.target_segment} customers. Response rate: ${Math.round(campaign.response_rate)}%, Conversion rate: ${Math.round(campaign.conversion_rate)}%`,
            metadata: {
              campaign_id: campaign.campaign_id,
              name: campaign.name,
              campaign_name: campaign.name,  // Also include campaign_name for frontend
              type: campaign.type,
              status: campaign.status,
              target_segment: campaign.target_segment,
              customer_segment: campaign.target_segment,  // Also include customer_segment for frontend
              response_rate: campaign.response_rate,
              conversion_rate: campaign.conversion_rate,
              open_rate: campaign.open_rate,
              click_rate: campaign.click_rate,
              // Financial metrics
              total_spend: campaign.total_spend || 0,
              total_revenue: campaign.total_revenue || 0,
              roi: campaign.roi || 0,
              // Channel information
              channel: campaign.channel || "Email",
              preferred_contact_method: campaign.channel || "Email",  // For frontend compatibility
              // Campaign engagement (calculate if not present)
              responded_to_campaigns: campaign.responded_to_campaigns || Math.round(campaign.response_rate * 10),
              converted_campaigns: campaign.converted_campaigns || Math.round(campaign.conversion_rate * 10),
              // Email metrics
              email_open_rate: campaign.open_rate,
              email_click_rate: campaign.click_rate,
              // Dates
              start_date: campaign.start_date,
              end_date: campaign.end_date,
            },
          })),
          total_context: response.campaigns.length,
          conversation_ready: true,
        };
      }
    } catch (error) {
    }
    
    // Fallback to RAG query
    return ragApi.campaignQuery({
      query: 'How are our campaigns performing? Show response rates, conversion rates, email open rates, and click rates across all customers.',
      k: 15,
    });
  },

  /**
   * Get campaign performance by channel
   */
  getByChannel: async (channel?: string) => {
    const query = channel
      ? `How are ${channel} campaigns performing? Show metrics and customer engagement.`
      : 'How are campaigns performing across different channels? Show email, SMS, and social media performance.';
    
    return ragApi.campaignQuery({
      query,
      k: 15,
    });
  },

  /**
   * Get customer response to campaigns
   */
  getCustomerResponse: async () => {
    return ragApi.campaignQuery({
      query: 'Which customers are responding best to our campaigns? Show customers with high response rates, conversions, and engagement.',
      k: 15,
    });
  },
};

// ==================== Health Check ====================

export const healthApi = {
  check: async () => {
    return apiRequest<{
      status: string;
      timestamp: string;
    }>('/health', {
      method: 'GET',
    });
  },
};

// ==================== Utility Functions ====================

/**
 * Play audio blob (for voice responses)
 */
export function playAudio(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    
    audio.src = url;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = (error) => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    
    audio.play().catch(reject);
  });
}

/**
 * Download audio blob as file
 */
export function downloadAudio(blob: Blob, filename: string = 'campaign_response.mp3') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==================== Phone Calls ====================

export interface PhoneCallRequest {
  phone_number: string;
  customer_name?: string;
  customer_id?: string;
  script_text?: string; // Optional script/transcript to use for the call
}

export interface PhoneCallResponse {
  success: boolean;
  call_sid: string;
  status: string;
  phone_number: string;
  script_preview: string;
  message: string;
}

export interface CallStatus {
  success: boolean;
  call_sid: string;
  status: string;
  duration?: number;
  direction?: string;
  to?: string;
  from?: string;
  start_time?: string;
  end_time?: string;
}

export interface CallConversation {
  success: boolean;
  call_sid: string;
  conversation_history: Array<{
    role: string;
    content: string;
  }>;
  customer_responses: string[];
  customer_info: {
    customer_id?: string;
    customer_name?: string;
    phone_number?: string;
  };
  total_exchanges: number;
}

// ==================== Memory API ====================
export const memoriesApi = {
  /**
   * Add memory to MemMachine
   */
  add: async (content: string, user_id?: string) => {
    return apiRequest<{
      success: boolean;
      result: any;
    }>('/memories', {
      method: 'POST',
      body: JSON.stringify({
        content,
        user_id,
      }),
    });
  },

  /**
   * Search memories in MemMachine
   */
  search: async (query: string, limit: number = 5, user_id?: string) => {
    return apiRequest<{
      success: boolean;
      result: any;
    }>('/memories/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        limit,
        user_id,
      }),
    });
  },
};

export const phoneCallApi = {
  /**
   * Initiate an actual phone call to a customer
   */
  initiate: async (request: PhoneCallRequest): Promise<PhoneCallResponse> => {
    return apiRequest<PhoneCallResponse>('/phone-call/initiate', {
      method: 'POST',
      body: JSON.stringify({
        phone_number: request.phone_number,
        customer_name: request.customer_name,
        customer_id: request.customer_id,
      }),
    });
  },

  /**
   * Get call status
   */
  getStatus: async (callSid: string): Promise<CallStatus> => {
    return apiRequest<CallStatus>(`/phone-call/status/${callSid}`, {
      method: 'GET',
    });
  },

  /**
   * Get conversation history from a call
   */
  getConversation: async (callSid: string): Promise<CallConversation> => {
    return apiRequest<CallConversation>(`/phone-call/conversation/${callSid}`, {
      method: 'GET',
    });
  },
};

// ==================== Email Campaigns ====================

export interface EmailRecipient {
  email: string;
  customer_id?: string;
  name?: string;
  personalization?: Record<string, any>;
}

export interface BulkEmailRequest {
  recipients: EmailRecipient[];
  subject: string;
  body: string;
  campaign_id?: string;
  campaign_name?: string;
}

export interface BulkEmailResponse {
  success: boolean;
  sent_count: number;
  failed_count: number;
  message_ids: string[];
  failed_recipients: Array<{
    email: string;
    error: string;
  }>;
  message: string;
}

export interface EmailStatus {
  success: boolean;
  message_id: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  recipient: string;
  timestamp?: string;
}

export const emailApi = {
  /**
   * Send bulk emails to multiple recipients
   */
  sendBulk: async (request: BulkEmailRequest): Promise<BulkEmailResponse> => {
    return apiRequest<BulkEmailResponse>('/email/send-bulk', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Get email status
   */
  getStatus: async (messageId: string): Promise<EmailStatus> => {
    return apiRequest<EmailStatus>(`/email/status/${messageId}`, {
      method: 'GET',
    });
  },
};

