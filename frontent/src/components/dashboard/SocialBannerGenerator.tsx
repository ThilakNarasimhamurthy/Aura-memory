import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Download, RefreshCw, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface BannerResult {
  campaign: string;
  image: string | null;
}

interface BannerOption {
  category: string;
  reason: string;
  priority: "high" | "medium" | "low";
  image: string | null;
  loading: boolean;
}

// Static fallback images for banners
// Note: Replace these with actual banner images in /public/banners/
// For now, using SVG placeholder. You can use:
// - Stock photos from Unsplash, Pexels, etc.
// - Custom designed banners
// - AI-generated images saved as static assets
const FALLBACK_BANNERS: Record<string, string> = {
  "Cold Brew": "/banners/placeholder.svg", // Replace with /banners/cold-brew.jpg
  "Latte": "/banners/placeholder.svg", // Replace with /banners/latte.jpg
  "Seasonal Special": "/banners/placeholder.svg", // Replace with /banners/seasonal.jpg
  "default": "/banners/placeholder.svg", // Replace with /banners/default.jpg
};

// Function to get fallback image URL
const getFallbackBanner = (category: string): string => {
  return FALLBACK_BANNERS[category] || FALLBACK_BANNERS["default"];
};

export function SocialBannerGenerator({ dateRange }: { dateRange: string }) {
  const [banners, setBanners] = useState<BannerOption[]>([]);
  const [generatingAll, setGeneratingAll] = useState(false);
  const { toast } = useToast();

  const initialOptions: Omit<BannerOption, "image" | "loading">[] = [
    { 
      category: "Cold Brew", 
      reason: "35% predicted preference increase",
      priority: "high"
    },
    { 
      category: "Latte", 
      reason: "28% customer preference",
      priority: "medium"
    },
    { 
      category: "Seasonal Special", 
      reason: "Trending searches detected",
      priority: "high"
    }
  ];

  useEffect(() => {
    // Initialize banners with fallback images
    setBanners(initialOptions.map(opt => ({ 
      ...opt, 
      image: getFallbackBanner(opt.category), // Use fallback images by default
      loading: false 
    })));
    
    // Only auto-generate if Supabase is configured
    // Note: Auto-generation is disabled by default to avoid payment errors
    // Users can manually trigger generation with the "Regenerate All" button
    // Fallback images are shown by default
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Helper function to generate image using OpenAI DALL-E 3 directly
  const generateImageWithDALLE = async (prompt: string): Promise<string | null> => {
    // Check for API key in environment variables (support both VITE_OPENAI_API_KEY and OPENAI_API_KEY)
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.warn('SocialBannerGenerator: OpenAI API key not configured. Set VITE_OPENAI_API_KEY or OPENAI_API_KEY in your .env file.');
      return null;
    }

    try {
      console.log('SocialBannerGenerator: Generating image with DALL-E 3...');
      
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
          quality: "standard",
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
          throw new Error("OpenAI API key is invalid. Please check your VITE_OPENAI_API_KEY in .env file.");
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
      throw error;
    }
  };

  const generateBanner = async (category: string, useFallback: boolean = true): Promise<string | null> => {
    // Check if OpenAI API key is configured (support both VITE_OPENAI_API_KEY and OPENAI_API_KEY)
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      console.warn('SocialBannerGenerator: OpenAI API key not configured. Set VITE_OPENAI_API_KEY or OPENAI_API_KEY in .env. Using fallback image.');
      return useFallback ? getFallbackBanner(category) : null;
    }

    try {
      const bannerPrompt = `Create a stunning, professional social media banner for a coffee shop featuring ${category}. 
      
Target audience: All Segments
Campaign context: AI-predicted top performing category: ${category}
Campaign goal: Generate high-impact marketing banner image

Style requirements:
- Modern, clean, professional coffee shop aesthetic
- Warm, inviting atmosphere with premium branding
- Vertical banner format (9:16 aspect ratio) perfect for Instagram Stories and Facebook posts
- High-resolution, vibrant colors, appetizing food photography style
- Eye-catching design that immediately captures attention
- Colors: Warm coffee tones, creamy textures, inviting ambiance
- Mood: Engaging, premium, visually striking

The banner should be visually appealing and immediately capture attention on social media feeds while conveying the coffee shop's premium brand identity.`;
      
      console.log('SocialBannerGenerator: Generating banner for', category, 'using DALL-E 3');
      
      const image = await generateImageWithDALLE(bannerPrompt);
      
      if (image) {
        console.log('SocialBannerGenerator: Successfully generated banner with DALL-E 3 for', category);
        return image;
      } else {
        console.warn('SocialBannerGenerator: No image returned from DALL-E for', category, 'Using fallback.');
        return useFallback ? getFallbackBanner(category) : null;
      }
    } catch (error: any) {
      // Log error details
      const errorMessage = error?.message || error?.toString() || '';
      console.error('SocialBannerGenerator: Error generating banner for', category, ':', error);
      
      // Use fallback on any error if enabled
      if (useFallback) {
        console.log('SocialBannerGenerator: Using fallback image due to error:', errorMessage);
        return getFallbackBanner(category);
      }
      return null;
    }
  };

  const generateAllBanners = async () => {
    setGeneratingAll(true);
    
    // Set all banners to loading
    setBanners(prev => prev.map(b => ({ ...b, loading: true })));

    // Generate all banners in parallel (always use fallback as backup)
    const bannerPromises = initialOptions.map(async (option) => {
      const image = await generateBanner(option.category, true);
      return {
        ...option,
        image: image || getFallbackBanner(option.category),
        loading: false,
      };
    });

    const results = await Promise.all(bannerPromises);
    setBanners(results);

    setGeneratingAll(false);

    const aiGeneratedCount = results.filter(r => r.image && r.image !== getFallbackBanner(r.category)).length;
    const fallbackCount = results.filter(r => r.image === getFallbackBanner(r.category)).length;
    
    if (aiGeneratedCount > 0) {
      toast({
        title: "Banners Generated!",
        description: `Successfully generated ${aiGeneratedCount} AI-powered banners. ${fallbackCount > 0 ? `${fallbackCount} using fallback images.` : ''}`,
      });
    } else if (fallbackCount > 0) {
      const hasOpenAI = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
      toast({
        title: "Using Fallback Images",
        description: hasOpenAI 
          ? "Using static fallback images. Check console for DALL-E generation errors."
          : "Using static fallback images. Set VITE_OPENAI_API_KEY or OPENAI_API_KEY in .env to enable AI banner generation.",
      });
    }
  };

  const regenerateBanner = async (category: string, index: number) => {
    setBanners(prev => prev.map((b, i) => 
      i === index ? { ...b, loading: true } : b
    ));

    // Always use fallback as backup
    const image = await generateBanner(category, true);
    
    setBanners(prev => prev.map((b, i) => 
      i === index ? { ...b, image: image || getFallbackBanner(category), loading: false } : b
    ));

    const isFallback = image === getFallbackBanner(category);
    if (image) {
      if (isFallback) {
        const hasOpenAI = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
        toast({
          title: "Using Fallback Image",
          description: hasOpenAI 
            ? `Using static fallback image for ${category}. Check console for DALL-E errors.`
            : `Using static fallback image for ${category}. Set VITE_OPENAI_API_KEY or OPENAI_API_KEY in .env to enable AI generation.`,
        });
      } else {
        toast({
          title: "Banner Generated!",
          description: `New AI-generated banner for ${category} using DALL-E 3.`,
        });
      }
    } else {
      // Should not happen since we use fallback, but just in case
      toast({
        title: "Using Fallback Image",
        description: `Using static fallback image for ${category}.`,
      });
    }
  };

  const downloadBanner = (image: string, category: string) => {
    const link = document.createElement('a');
    link.href = image;
    link.download = `${category.toLowerCase().replace(/\s+/g, '-')}-banner.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-danger/20 text-danger border-danger/30";
      case "medium": return "bg-warning/20 text-warning border-warning/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI Social Media Banner Generator
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              AI-generated banners based on predictive analytics ({dateRange})
            </p>
          </div>
          <Button
            onClick={generateAllBanners}
            disabled={generatingAll || !(import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY)}
            variant="outline"
            size="sm"
            title={!(import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY) ? "OpenAI API key not configured. Set VITE_OPENAI_API_KEY or OPENAI_API_KEY in .env" : ""}
          >
            {generatingAll ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate All
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {banners.map((banner, idx) => (
            <Card 
              key={idx} 
              className="border-border/50 bg-card/50 hover:border-accent/50 transition-all overflow-hidden group"
            >
              <CardContent className="p-0">
                {/* Banner Image */}
                <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                  {banner.loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <Loader2 className="h-8 w-8 animate-spin text-accent" />
                    </div>
                  ) : banner.image ? (
                    <>
                      <img 
                        src={banner.image} 
                        alt={`${banner.category} banner`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // If image fails to load, try fallback
                          const target = e.target as HTMLImageElement;
                          const fallback = getFallbackBanner(banner.category);
                          if (target.src !== fallback && !target.src.includes('fallback')) {
                            target.src = fallback;
                          }
                        }}
                      />
                      {/* Show badge if using fallback */}
                      {banner.image === getFallbackBanner(banner.category) && (
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-xs">
                            Static Image
                          </Badge>
                        </div>
                      )}
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          onClick={() => regenerateBanner(banner.category, idx)}
                          size="sm"
                          variant="secondary"
                          className="bg-background/90 hover:bg-background"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {banner.image === getFallbackBanner(banner.category) ? "Generate AI" : "Regenerate"}
                        </Button>
                        <Button
                          onClick={() => downloadBanner(banner.image!, banner.category)}
                          size="sm"
                          variant="secondary"
                          className="bg-background/90 hover:bg-background"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-4">
                      <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground text-center mb-2">
                        {(import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY)
                          ? "AI generation unavailable"
                          : "AI generation not configured"}
                      </p>
                      <p className="text-xs text-muted-foreground/70 text-center mb-3">
                        {(import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY)
                          ? "Check console for error details"
                          : "Set VITE_OPENAI_API_KEY or OPENAI_API_KEY in .env to enable AI banners"}
                      </p>
                      <Button
                        onClick={() => regenerateBanner(banner.category, idx)}
                        size="sm"
                        variant="outline"
                        className="mt-1"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {(import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY) ? "Try Again" : "Use Fallback Image"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Banner Info */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-foreground">{banner.category}</h4>
                    <Badge className={getPriorityColor(banner.priority)}>
                      {banner.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{banner.reason}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
