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
  customer_segment?: string;
  total_purchases?: number;
  total_spent?: number;
  lifetime_value?: number;
  responded_to_campaigns?: number;
  converted_campaigns?: number;
  email_open_rate?: number;
  email_click_rate?: number;
  churn_risk_score?: number;
  satisfaction_score?: number;
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
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
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

  return response.json();
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
    return apiRequest<CampaignQueryResponse>('/langchain-rag/query/campaign', {
      method: 'POST',
      body: JSON.stringify({
        query: request.query,
        k: Math.min(request.k || 10, 20), // Backend allows up to 20
        include_memories: request.include_memories ?? true,
        user_id: request.user_id,
      }),
    });
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
   */
  findActive: async (k: number = 10) => {
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
   * Get campaign effectiveness analysis
   */
  getEffectiveness: async () => {
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
};

