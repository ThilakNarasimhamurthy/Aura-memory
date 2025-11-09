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


export function SocialBannerGenerator({ dateRange }: { dateRange: string }) {
  const [banners, setBanners] = useState<BannerOption[]>([]);
  const [generatingAll, setGeneratingAll] = useState(false);
  const { toast } = useToast();

  // Load popular products from API to determine banner categories
  const loadPopularProducts = async (): Promise<Omit<BannerOption, "image" | "loading">[]> => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/analytics/popular-products?limit=3`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.popular_products && data.popular_products.length > 0) {
          return data.popular_products.map((product: any, index: number) => ({
            category: product.category,
            reason: product.reason || `${product.percentage}% of orders`,
            priority: index === 0 ? "high" : index === 1 ? "medium" : "low" as "high" | "medium" | "low"
          }));
        }
      }
    } catch (error) {
    }
    
    // Fallback to default options
    return [
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
  };

  const generateAllBannersWithOptions = async (options?: Omit<BannerOption, "image" | "loading">[]) => {
    setGeneratingAll(true);
    
    // Use provided options or current banners
    const bannerOptions = options || banners.map(b => ({
      category: b.category,
      reason: b.reason,
      priority: b.priority
    }));
    
    // Update banners state with options and set loading
    setBanners(bannerOptions.map(opt => ({ 
      ...opt, 
      image: null,
      loading: true 
    })));

    // Generate all banners in parallel using DALL-E only
    const bannerPromises = bannerOptions.map(async (option) => {
      try {
        const image = await generateBanner(option.category);
        return {
          ...option,
          image: image,
          loading: false,
        };
      } catch (error: any) {
        return {
          ...option,
          image: null,
          loading: false,
        };
      }
    });

    const results = await Promise.all(bannerPromises);
    setBanners(results);

    setGeneratingAll(false);

    const successCount = results.filter(r => r.image !== null).length;
    const failCount = results.filter(r => r.image === null).length;
    
    if (successCount > 0) {
      toast({
        title: "Banners Generated!",
        description: `Successfully generated ${successCount} AI-powered banner${successCount > 1 ? 's' : ''} using DALL-E 3.${failCount > 0 ? ` ${failCount} failed. Check console for errors.` : ''}`,
      });
    } else {
      toast({
        title: "Banner Generation Failed",
        description: "Failed to generate banners. Please check your OpenAI API key and try again.",
        variant: "destructive",
      });
    }
  };

  const generateAllBanners = async () => {
    await generateAllBannersWithOptions();
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    // Load popular products and initialize banners
    const initializeBanners = async () => {
      const options = await loadPopularProducts();
      setBanners(options.map(opt => ({ 
      ...opt, 
        image: null, // Only DALL-E generated images
      loading: false 
    })));
    
      // Auto-generate banners on page load if OpenAI API key is configured
      // Note: Only VITE_ prefixed vars are exposed by Vite
      const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY?.trim();
      if (OPENAI_API_KEY) {
        // Small delay to ensure component is fully mounted and banners are initialized
        timer = setTimeout(() => {
          generateAllBannersWithOptions(options);
        }, 1000);
      }
    };
    
    initializeBanners();
    
    // Cleanup
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  // Helper function to generate image using OpenAI DALL-E 3 directly
  const generateImageWithDALLE = async (prompt: string): Promise<string | null> => {
    // Check for API key in environment variables (Vite only exposes VITE_ prefixed vars)
    // Note: Vite requires VITE_ prefix and dev server restart after .env changes
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
    
    // Debug: Log if key is missing (remove in production)
    if (!OPENAI_API_KEY) {
      console.warn("⚠️ OpenAI API key not found. Make sure:");
      console.warn("  1. VITE_OPENAI_API_KEY is set in frontend/.env");
      console.warn("  2. Dev server was restarted after adding the key");
      console.warn("  3. Key is not wrapped in quotes in .env file");
      return null;
    }
    
    // Trim any whitespace that might have been added
    const apiKey = OPENAI_API_KEY.trim();
    if (!apiKey) {
      console.warn("⚠️ OpenAI API key is empty after trimming");
      return null;
    }

    try {
      
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
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
      } else {
      }
      
      return imageUrl;
    } catch (error) {
      throw error;
    }
  };

  const generateBanner = async (category: string): Promise<string | null> => {
    // Check if OpenAI API key is configured (Vite only exposes VITE_ prefixed vars)
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY?.trim();
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required for banner generation. Please configure VITE_OPENAI_API_KEY in frontend/.env file and restart the dev server.');
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
      
      
      const image = await generateImageWithDALLE(bannerPrompt);
      
      if (image) {
        return image;
      } else {
        throw new Error('DALL-E did not return an image. Please try again.');
      }
    } catch (error: any) {
      // Log error details
      const errorMessage = error?.message || error?.toString() || '';
      throw error; // Re-throw error - no fallback images
    }
  };


  const regenerateBanner = async (category: string, index: number) => {
    setBanners(prev => prev.map((b, i) => 
      i === index ? { ...b, loading: true } : b
    ));

    try {
      // Generate banner with DALL-E only
      const image = await generateBanner(category);
    
    setBanners(prev => prev.map((b, i) => 
        i === index ? { ...b, image: image, loading: false } : b
    ));

        toast({
          title: "Banner Generated!",
          description: `New AI-generated banner for ${category} using DALL-E 3.`,
        });
    } catch (error: any) {
      setBanners(prev => prev.map((b, i) => 
        i === index ? { ...b, image: null, loading: false } : b
      ));

      toast({
        title: "Banner Generation Failed",
        description: error?.message || `Failed to generate banner for ${category}. Please try again.`,
        variant: "destructive",
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
            disabled={generatingAll || !import.meta.env.VITE_OPENAI_API_KEY?.trim()}
            variant="outline"
            size="sm"
            title={!import.meta.env.VITE_OPENAI_API_KEY?.trim() ? "OpenAI API key not configured. Set VITE_OPENAI_API_KEY in frontend/.env and restart dev server" : ""}
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
                          // If DALL-E image fails to load, show error state
                          setBanners(prev => prev.map((b, i) => 
                            i === idx ? { ...b, image: null } : b
                          ));
                          toast({
                            title: "Image Load Error",
                            description: `Failed to load banner image for ${banner.category}. Please regenerate.`,
                            variant: "destructive",
                          });
                        }}
                      />
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          onClick={() => regenerateBanner(banner.category, idx)}
                          size="sm"
                          variant="secondary"
                          className="bg-background/90 hover:bg-background"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate
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
                        {import.meta.env.VITE_OPENAI_API_KEY?.trim()
                          ? "Generate AI banner"
                          : "AI generation not configured"}
                      </p>
                      <p className="text-xs text-muted-foreground/70 text-center mb-3">
                        {import.meta.env.VITE_OPENAI_API_KEY?.trim()
                          ? "Click below to generate with DALL-E 3"
                          : "Set VITE_OPENAI_API_KEY in frontend/.env and restart dev server to enable AI banners"}
                      </p>
                      <Button
                        onClick={() => regenerateBanner(banner.category, idx)}
                        size="sm"
                        variant="outline"
                        className="mt-1"
                        disabled={!import.meta.env.VITE_OPENAI_API_KEY?.trim()}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate Banner
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
