/**
 * Mock Data for Fallback when API is unavailable
 * Provides realistic sample data for development and offline scenarios
 */

import type { CampaignQueryResponse, CustomerDocument } from './api';

// Mock customer data
export const mockCustomers: CustomerDocument[] = [
  {
    customer_id: "1",
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@example.com",
    phone: "+1-555-0101",
    customer_segment: "Premium",
    total_purchases: 45,
    total_spent: 12500,
    lifetime_value: 14500,
    responded_to_campaigns: 12,
    converted_campaigns: 8,
    email_open_rate: 85,
    email_click_rate: 42,
    churn_risk_score: 0.15,
    satisfaction_score: 4.5,
    preferred_contact_method: "Email",
    favorite_product_category: "Cold Brew",
    loyalty_member: true,
  },
  {
    customer_id: "2",
    first_name: "Jane",
    last_name: "Smith",
    email: "jane.smith@example.com",
    phone: "+1-555-0102",
    customer_segment: "Regular",
    total_purchases: 28,
    total_spent: 6800,
    lifetime_value: 7500,
    responded_to_campaigns: 8,
    converted_campaigns: 5,
    email_open_rate: 72,
    email_click_rate: 35,
    churn_risk_score: 0.25,
    satisfaction_score: 4.2,
    preferred_contact_method: "Email",
    favorite_product_category: "Latte",
    loyalty_member: true,
  },
  {
    customer_id: "3",
    first_name: "Michael",
    last_name: "Johnson",
    email: "michael.j@example.com",
    phone: "+1-555-0103",
    customer_segment: "VIP",
    total_purchases: 62,
    total_spent: 18900,
    lifetime_value: 21000,
    responded_to_campaigns: 18,
    converted_campaigns: 14,
    email_open_rate: 92,
    email_click_rate: 58,
    churn_risk_score: 0.08,
    satisfaction_score: 4.8,
    preferred_contact_method: "Email",
    favorite_product_category: "Espresso",
    loyalty_member: true,
  },
  {
    customer_id: "4",
    first_name: "Sarah",
    last_name: "Williams",
    email: "sarah.w@example.com",
    phone: "+1-555-0104",
    customer_segment: "Regular",
    total_purchases: 32,
    total_spent: 7200,
    lifetime_value: 8000,
    responded_to_campaigns: 10,
    converted_campaigns: 6,
    email_open_rate: 68,
    email_click_rate: 32,
    churn_risk_score: 0.35,
    satisfaction_score: 3.9,
    preferred_contact_method: "SMS",
    favorite_product_category: "Iced Coffee",
    loyalty_member: false,
  },
  {
    customer_id: "5",
    first_name: "David",
    last_name: "Brown",
    email: "david.brown@example.com",
    phone: "+1-555-0105",
    customer_segment: "Premium",
    total_purchases: 38,
    total_spent: 9800,
    lifetime_value: 11200,
    responded_to_campaigns: 11,
    converted_campaigns: 7,
    email_open_rate: 78,
    email_click_rate: 38,
    churn_risk_score: 0.22,
    satisfaction_score: 4.3,
    preferred_contact_method: "Email",
    favorite_product_category: "Cold Brew",
    loyalty_member: true,
  },
  {
    customer_id: "6",
    first_name: "Emily",
    last_name: "Davis",
    email: "emily.d@example.com",
    phone: "+1-555-0106",
    customer_segment: "New",
    total_purchases: 5,
    total_spent: 850,
    lifetime_value: 1000,
    responded_to_campaigns: 2,
    converted_campaigns: 1,
    email_open_rate: 55,
    email_click_rate: 18,
    churn_risk_score: 0.65,
    satisfaction_score: 3.5,
    preferred_contact_method: "Email",
    favorite_product_category: "Latte",
    loyalty_member: false,
  },
  {
    customer_id: "7",
    first_name: "Robert",
    last_name: "Miller",
    email: "robert.m@example.com",
    phone: "+1-555-0107",
    customer_segment: "Regular",
    total_purchases: 22,
    total_spent: 5200,
    lifetime_value: 5800,
    responded_to_campaigns: 6,
    converted_campaigns: 3,
    email_open_rate: 65,
    email_click_rate: 28,
    churn_risk_score: 0.45,
    satisfaction_score: 4.0,
    preferred_contact_method: "SMS",
    favorite_product_category: "Espresso",
    loyalty_member: false,
  },
  {
    customer_id: "8",
    first_name: "Lisa",
    last_name: "Wilson",
    email: "lisa.w@example.com",
    phone: "+1-555-0108",
    customer_segment: "Premium",
    total_purchases: 41,
    total_spent: 11200,
    lifetime_value: 12800,
    responded_to_campaigns: 13,
    converted_campaigns: 9,
    email_open_rate: 82,
    email_click_rate: 45,
    churn_risk_score: 0.18,
    satisfaction_score: 4.6,
    preferred_contact_method: "Email",
    favorite_product_category: "Cold Brew",
    loyalty_member: true,
  },
  {
    customer_id: "9",
    first_name: "James",
    last_name: "Moore",
    email: "james.moore@example.com",
    phone: "+1-555-0109",
    customer_segment: "VIP",
    total_purchases: 55,
    total_spent: 16200,
    lifetime_value: 18000,
    responded_to_campaigns: 16,
    converted_campaigns: 12,
    email_open_rate: 88,
    email_click_rate: 52,
    churn_risk_score: 0.12,
    satisfaction_score: 4.7,
    preferred_contact_method: "Email",
    favorite_product_category: "Espresso",
    loyalty_member: true,
  },
  {
    customer_id: "10",
    first_name: "Maria",
    last_name: "Taylor",
    email: "maria.t@example.com",
    phone: "+1-555-0110",
    customer_segment: "Regular",
    total_purchases: 19,
    total_spent: 4200,
    lifetime_value: 4800,
    responded_to_campaigns: 5,
    converted_campaigns: 2,
    email_open_rate: 60,
    email_click_rate: 25,
    churn_risk_score: 0.50,
    satisfaction_score: 3.8,
    preferred_contact_method: "SMS",
    favorite_product_category: "Iced Coffee",
    loyalty_member: false,
  },
];

// Mock campaign query response
export const mockCampaignQueryResponse: CampaignQueryResponse = {
  query: "Find active customers",
  answer: "Based on the customer data, here are the most active customers with high engagement rates and lifetime value.",
  sources: ["customer_data"],
  customers_found: mockCustomers.length,
  customer_summaries: mockCustomers.slice(0, 10).map(c => ({
    id: c.customer_id,
    name: `${c.first_name} ${c.last_name}`,
    email: c.email,
  })),
  documents: mockCustomers.map(c => ({
    content: `Customer ${c.first_name} ${c.last_name} has ${c.total_purchases} purchases and a lifetime value of $${c.lifetime_value}. They have responded to ${c.responded_to_campaigns} campaigns with a ${c.email_open_rate}% email open rate.`,
    metadata: c,
  })),
  total_context: mockCustomers.length,
  conversation_ready: true,
};

// Mock campaign effectiveness response
export const mockCampaignEffectivenessResponse: CampaignQueryResponse = {
  query: "Campaign effectiveness analysis",
  answer: "Campaign performance analysis shows strong engagement rates across email and SMS channels with an average conversion rate of 65%.",
  sources: ["campaign_data"],
  customers_found: mockCustomers.length,
  customer_summaries: [],
  documents: mockCustomers.map(c => ({
    content: `Campaign metrics for ${c.first_name} ${c.last_name}: ${c.responded_to_campaigns} responses, ${c.converted_campaigns} conversions, ${c.email_open_rate}% open rate, ${c.email_click_rate}% click rate.`,
    metadata: c,
  })),
  total_context: mockCustomers.length,
  conversation_ready: true,
};

// Helper function to get mock customer response
export function getMockCustomerResponse(k: number = 10): CampaignQueryResponse {
  const limitedCustomers = mockCustomers.slice(0, k);
  return {
    ...mockCampaignQueryResponse,
    customers_found: limitedCustomers.length,
    customer_summaries: limitedCustomers.map(c => ({
      id: c.customer_id,
      name: `${c.first_name} ${c.last_name}`,
      email: c.email,
    })),
    documents: limitedCustomers.map(c => ({
      content: `Customer ${c.first_name} ${c.last_name} has ${c.total_purchases} purchases and a lifetime value of $${c.lifetime_value}.`,
      metadata: c,
    })),
    total_context: limitedCustomers.length,
  };
}

// Helper function to get mock campaign effectiveness response
export function getMockCampaignEffectivenessResponse(): CampaignQueryResponse {
  return mockCampaignEffectivenessResponse;
}

// Helper function to check if data is empty or invalid
export function isDataEmpty<T>(data: T | null | undefined): boolean {
  if (!data) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') {
    // Check for CampaignQueryResponse
    if ('documents' in data) {
      const response = data as CampaignQueryResponse;
      return !response.documents || response.documents.length === 0;
    }
    return Object.keys(data).length === 0;
  }
  return false;
}

