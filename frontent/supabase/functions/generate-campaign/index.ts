import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type = "campaign", targetAudience, campaignGoal, segmentData, period, historicalData, category } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt, userPrompt;

    if (type === "category-campaign") {
      // Category-based campaign generation with email/SMS
      const days = period === "7days" ? 7 : period === "30days" ? 30 : 7;
      const periodName = period === "7days" ? "next 7 days" : period === "30days" ? "next 30 days" : "next 7 days";
      
      systemPrompt = `You are an AI marketing specialist for a coffee shop. Generate a detailed campaign schedule for ${category} for the ${periodName}.

For each day, provide:
1. Day name and date
2. Banner concept description (visual elements, colors, mood for ${category})
3. Social media caption (engaging, 1-2 sentences about ${category})
4. Story content (brief narrative about ${category}, 2-3 sentences)
5. Email content (compelling email promoting ${category}, subject + body, 3-4 sentences)
6. SMS content (short text message about ${category}, max 160 characters)
7. Optimal posting time (specific time with reason)
8. Best channel (Email/SMS/Instagram/Facebook)
9. Channel selection reason (why this channel for this day)

Format as a JSON array with objects containing: day, date, bannerDescription, caption, story, emailContent, smsContent, timing, channel, channelReason

Base recommendations on: ${historicalData}`;

      userPrompt = `Generate ${days} days of ${category}-focused campaign content. Make it compelling and action-oriented.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI gateway error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      let campaignsText = data.choices?.[0]?.message?.content || "[]";
      
      const jsonMatch = campaignsText.match(/```json\n([\s\S]*?)\n```/) || campaignsText.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        campaignsText = jsonMatch[1];
      }
      
      let campaigns = [];
      try {
        campaigns = JSON.parse(campaignsText);
      } catch (e) {
        console.error("Failed to parse campaigns JSON:", e);
        campaigns = [];
      }

      // Generate banners for first 3 days
      for (let i = 0; i < campaigns.length && i < 3; i++) {
        const campaign = campaigns[i];
        try {
          const bannerResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [
                { 
                  role: "user", 
                  content: `Create a coffee shop social media banner for ${category}: ${campaign.bannerDescription || campaign.caption}. Style: Modern, clean, professional coffee shop aesthetic with focus on ${category}.`
                }
              ],
              modalities: ["image", "text"]
            }),
          });

          if (bannerResponse.ok) {
            const bannerData = await bannerResponse.json();
            campaign.banner = bannerData.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
          }
        } catch (error) {
          console.error(`Failed to generate banner for day ${i}:`, error);
          campaign.banner = null;
        }
      }

      return new Response(
        JSON.stringify({ campaigns }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "automation") {
      // Campaign automation for multiple days
      const days = period === "7days" ? 7 : period === "30days" ? 30 : 5;
      const periodName = period === "7days" ? "next 7 days" : period === "30days" ? "next 30 days" : "upcoming festivals";
      
      systemPrompt = `You are an AI marketing automation specialist for a coffee shop. Generate a detailed campaign schedule for the ${periodName}.

For each day, provide:
1. Day name and date
2. Banner concept description (visual elements, colors, mood)
3. Social media caption (engaging, 1-2 sentences)
4. Story content (brief narrative, 2-3 sentences)
5. Optimal posting time (specific time with reason)
6. Best channel (Instagram/Facebook/Twitter/Email)
7. Channel selection reason (why this channel for this day)

Format as a JSON array with objects containing: day, date, bannerDescription, caption, story, timing, channel, channelReason

Base recommendations on: ${historicalData}`;

      userPrompt = `Generate ${days} days of campaign content. Consider seasonal trends, customer behavior patterns, and engagement history.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI gateway error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      let campaignsText = data.choices?.[0]?.message?.content || "[]";
      
      // Extract JSON from markdown code blocks if present
      const jsonMatch = campaignsText.match(/```json\n([\s\S]*?)\n```/) || campaignsText.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        campaignsText = jsonMatch[1];
      }
      
      let campaigns = [];
      try {
        campaigns = JSON.parse(campaignsText);
      } catch (e) {
        console.error("Failed to parse campaigns JSON:", e);
        campaigns = [];
      }

      // Generate banners for each day
      for (let i = 0; i < campaigns.length && i < 3; i++) {
        const campaign = campaigns[i];
        try {
          const bannerResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [
                { 
                  role: "user", 
                  content: `Create a coffee shop social media banner: ${campaign.bannerDescription || campaign.caption}. Style: Modern, clean, professional coffee shop aesthetic.`
                }
              ],
              modalities: ["image", "text"]
            }),
          });

          if (bannerResponse.ok) {
            const bannerData = await bannerResponse.json();
            campaign.banner = bannerData.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
          }
        } catch (error) {
          console.error(`Failed to generate banner for day ${i}:`, error);
          campaign.banner = null;
        }
      }

      return new Response(
        JSON.stringify({ campaigns }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "banner") {
      systemPrompt = `You are a creative director for a coffee shop. Generate a social media banner concept including:
1. Visual Description (colors, mood, elements)
2. Headline Text
3. Body Copy (short)
4. Call-to-Action
5. Optimal Posting Time (day and time)
6. Platform Recommendation (Instagram/Facebook/Twitter)

Format as JSON.`;

      userPrompt = `Target: ${targetAudience}. ${segmentData}. Goal: ${campaignGoal}. Create a banner concept.`;
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            { role: "user", content: `${systemPrompt}\n\n${userPrompt}` }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI gateway error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const campaign = data.choices?.[0]?.message?.content || "Unable to generate banner";
      const image = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;

      return new Response(
        JSON.stringify({ campaign, image }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default campaign generation
    systemPrompt = `You are a world-class marketing strategist for a coffee shop. Your goal is to generate a concise, 3-step marketing campaign plan based on the target audience data provided.

Format your response as:
**Channel:** [Best marketing channel]
**Offer:** [Specific promotional offer]
**Creative Hook:** [Engaging message/hook]

Keep it practical and actionable for a small coffee shop business.`;

    userPrompt = `The target audience is ${targetAudience}. ${segmentData}

Generate a campaign to achieve this goal: ${campaignGoal}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const campaign = data.choices?.[0]?.message?.content || "Unable to generate campaign";

    return new Response(
      JSON.stringify({ campaign }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
