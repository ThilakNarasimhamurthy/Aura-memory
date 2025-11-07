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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured. Please set it in your Supabase Edge Function secrets.");
    }

    // Helper function to generate images using OpenAI DALL-E 3
    const generateImageWithOpenAI = async (prompt: string, quality: "standard" | "hd" = "standard"): Promise<string | null> => {
      try {
        console.log("Generating image with DALL-E 3, prompt:", prompt.substring(0, 100) + "...");
        
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt,
            size: "1024x1792", // Vertical banner format (9:16 aspect ratio) for social media
            quality: quality, // "standard" or "hd" - HD takes longer but higher quality
            // Note: DALL-E 3 only generates 1 image at a time, so 'n' parameter is not supported
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: { message: errorText } };
          }
          
          console.error("OpenAI DALL-E error:", response.status, errorText);
          
          if (response.status === 401) {
            throw new Error("OpenAI API key is invalid. Please check your OPENAI_API_KEY in Supabase Edge Function secrets.");
          }
          if (response.status === 429) {
            throw new Error("OpenAI rate limit exceeded. Please try again later.");
          }
          if (response.status === 400) {
            const errorMessage = errorData.error?.message || errorText;
            throw new Error(`Invalid request to DALL-E: ${errorMessage}`);
          }
          if (response.status === 500) {
            throw new Error("OpenAI server error. Please try again later.");
          }
          throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || errorText}`);
        }

        const data = await response.json();
        const imageUrl = data.data?.[0]?.url || null;
        
        if (imageUrl) {
          console.log("Successfully generated image with DALL-E 3");
        } else {
          console.error("DALL-E returned no image URL in response:", data);
        }
        
        return imageUrl;
      } catch (error) {
        console.error("Error generating image with DALL-E:", error);
        throw error; // Re-throw to allow caller to handle
      }
    };

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

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
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

      // Generate banners for first 3 days using OpenAI DALL-E 3
      for (let i = 0; i < campaigns.length && i < 3; i++) {
        const campaign = campaigns[i];
        try {
          const bannerPrompt = `Create a stunning, professional social media banner for a coffee shop featuring ${category}. 
          
Visual elements: ${campaign.bannerDescription || campaign.caption}
Style: Modern, clean, professional coffee shop aesthetic with warm, inviting atmosphere
Format: Vertical banner (9:16 aspect ratio) perfect for Instagram Stories and Facebook posts
Quality: High-resolution, vibrant colors, appetizing food photography style
Mood: Engaging, eye-catching, premium coffee shop branding
Colors: Warm coffee tones, creamy textures, inviting ambiance

The banner should be visually appealing and immediately capture attention on social media feeds.`;
          campaign.banner = await generateImageWithOpenAI(bannerPrompt, "standard");
        } catch (error) {
          console.error(`Failed to generate banner for day ${i + 1}:`, error);
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

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
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

      // Generate banners for each day using OpenAI DALL-E 3
      for (let i = 0; i < campaigns.length && i < 3; i++) {
        const campaign = campaigns[i];
        try {
          const bannerPrompt = `Create a stunning, professional social media banner for a coffee shop. 
          
Visual concept: ${campaign.bannerDescription || campaign.caption}
Style: Modern, clean, professional coffee shop aesthetic with warm, inviting atmosphere
Format: Vertical banner (9:16 aspect ratio) perfect for Instagram Stories and Facebook posts
Quality: High-resolution, vibrant colors, appetizing food photography style
Mood: Engaging, eye-catching, premium coffee shop branding
Colors: Warm coffee tones, creamy textures, inviting ambiance

The banner should be visually appealing and immediately capture attention on social media feeds.`;
          campaign.banner = await generateImageWithOpenAI(bannerPrompt, "standard");
        } catch (error) {
          console.error(`Failed to generate banner for day ${i + 1}:`, error);
          campaign.banner = null;
        }
      }

      return new Response(
        JSON.stringify({ campaigns }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "banner") {
      // Generate banner image directly using OpenAI DALL-E 3
      const bannerPrompt = `Create a stunning, professional social media banner for a coffee shop. 
      
Target audience: ${targetAudience}
Campaign context: ${segmentData}
Campaign goal: ${campaignGoal}

Style requirements:
- Modern, clean, professional coffee shop aesthetic
- Warm, inviting atmosphere with premium branding
- Vertical banner format (9:16 aspect ratio) perfect for Instagram Stories and Facebook posts
- High-resolution, vibrant colors, appetizing food photography style
- Eye-catching design that immediately captures attention
- Colors: Warm coffee tones, creamy textures, inviting ambiance
- Mood: Engaging, premium, visually striking

The banner should be visually appealing and immediately capture attention on social media feeds while conveying the coffee shop's premium brand identity.`;
      
      try {
        console.log("Generating banner with DALL-E 3 for type: banner");
        const image = await generateImageWithOpenAI(bannerPrompt, "standard");
        
        if (!image) {
          return new Response(
            JSON.stringify({ 
              error: "Failed to generate banner image with DALL-E. Please check your OpenAI API key and try again." 
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Generate campaign description using OpenAI GPT
        const campaignResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are a creative director for a coffee shop. Generate a brief, engaging social media banner description."
              },
              {
                role: "user",
                content: `Target audience: ${targetAudience}. ${segmentData}. Campaign goal: ${campaignGoal}. Create a brief, compelling banner description (1-2 sentences).`
              }
            ],
            max_tokens: 150,
          }),
        });

        let campaign = "AI-generated social media banner created with DALL-E 3";
        if (campaignResponse.ok) {
          const campaignData = await campaignResponse.json();
          campaign = campaignData.choices?.[0]?.message?.content || campaign;
        }

        console.log("Successfully generated banner with DALL-E 3");

        return new Response(
          JSON.stringify({ campaign, image }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error generating banner with DALL-E:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to generate banner";
        return new Response(
          JSON.stringify({ 
            error: `DALL-E image generation failed: ${errorMessage}. Please ensure OPENAI_API_KEY is correctly configured in Supabase Edge Function secrets.`
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "OpenAI API key is invalid. Please check your OPENAI_API_KEY configuration." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "OpenAI API error" }),
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
