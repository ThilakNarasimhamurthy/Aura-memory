# DALL-E 3 Banner Generation Setup (Frontend Direct)

## Overview

The Social Banner Generator uses **OpenAI DALL-E 3** directly from the frontend to generate high-quality social media banners. This provides professional, AI-generated images optimized for Instagram Stories, Facebook posts, and other social media platforms.

## Configuration

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Create a new API key
5. Copy the API key (you won't be able to see it again)

### 2. Set Up Frontend Environment Variable

1. Create or edit `.env` file in the `frontent/` directory
2. Add your OpenAI API key:
   ```env
   VITE_OPENAI_API_KEY=your-openai-api-key-here
   ```
3. Restart your development server (Vite needs to be restarted to pick up new env variables)

### Example .env File

```env
# OpenAI API Key for DALL-E 3 Banner Generation
VITE_OPENAI_API_KEY=sk-...

# Optional: Supabase (if you're using it for other features)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-key
```

## How It Works

1. **Frontend** calls OpenAI DALL-E 3 API directly
2. **DALL-E 3** generates images:
   - Model: `dall-e-3`
   - Size: `1024x1792` (vertical banner format, 9:16 aspect ratio)
   - Quality: `standard` (can be changed to `hd` for higher quality)
   - Format: Optimized for Instagram Stories and Facebook posts
3. **Generated images** are returned as URLs and displayed in the UI

## Features

### DALL-E 3 Capabilities
- ✅ High-quality image generation
- ✅ Vertical banner format (1024x1792)
- ✅ Professional coffee shop aesthetic
- ✅ Vibrant colors and appetizing food photography
- ✅ Optimized for social media
- ✅ Direct API calls from frontend (no backend required)

### Fallback System
- Static fallback images are shown by default
- If DALL-E generation fails, fallback images are used automatically
- Users can always see banners, even if AI generation is unavailable

## Image Specifications

- **Model**: DALL-E 3
- **Size**: 1024x1792 pixels (vertical banner)
- **Aspect Ratio**: 9:16 (Instagram Stories format)
- **Quality**: Standard (fast) or HD (higher quality, slower)
- **Style**: Modern, clean, professional coffee shop aesthetic

## Cost Considerations

DALL-E 3 pricing (as of 2024):
- **Standard quality**: $0.040 per image
- **HD quality**: $0.080 per image

Each banner generation uses 1 API call. With fallback images, costs are only incurred when users explicitly request AI generation.

## Security Note

⚠️ **Important**: API keys in frontend environment variables are exposed to the browser. 

For production applications, consider:
1. **Using a backend proxy** (recommended for production)
2. **Implementing rate limiting** on your backend
3. **Using API key restrictions** in OpenAI dashboard
4. **Setting spending limits** in OpenAI account

For development and small projects, frontend API keys are acceptable.

## Error Handling

The system handles various error scenarios:

1. **Missing API Key**: Shows fallback images
2. **Invalid API Key**: Clear error message in console
3. **Rate Limits**: Automatic fallback to static images
4. **Network Errors**: Automatic fallback to static images
5. **API Errors**: Detailed error logging for debugging

## Testing

To test DALL-E generation:

1. Ensure `VITE_OPENAI_API_KEY` is set in `.env` file
2. Restart your development server
3. Click "Regenerate All" in the Social Banner Generator
4. Check browser console for generation logs
5. Images should appear within 10-30 seconds

## Troubleshooting

### Images Not Generating

1. **Check API Key**: Verify `VITE_OPENAI_API_KEY` is set in `.env`
2. **Restart Server**: Vite needs to be restarted to pick up new env variables
3. **Check Console**: Look for error messages in browser console
4. **Check Billing**: Ensure your OpenAI account has credits
5. **Check Rate Limits**: DALL-E has rate limits per minute/hour

### Common Errors

- **401 Unauthorized**: API key is invalid or missing
- **429 Rate Limit**: Too many requests, wait and try again
- **400 Bad Request**: Invalid prompt or parameters
- **500 Server Error**: OpenAI server issue, try again later

### Debugging

Enable detailed logging:
1. Check browser console for generation logs
2. Verify API key is correctly set in `.env`
3. Test API key directly with OpenAI API
4. Check network tab in browser DevTools

## Best Practices

1. **Use Fallback Images**: Always have static fallback images ready
2. **Monitor Costs**: Track API usage in OpenAI dashboard
3. **Handle Errors Gracefully**: Always fall back to static images
4. **Set Spending Limits**: Configure spending limits in OpenAI dashboard
5. **Optimize Prompts**: Clear, detailed prompts produce better results
6. **Cache Results**: Consider caching generated images to reduce API calls

## Advanced Configuration

### Using HD Quality

To use HD quality (higher quality, slower generation), modify the component:

```typescript
body: JSON.stringify({
  model: "dall-e-3",
  prompt: prompt,
  size: "1024x1792",
  quality: "hd", // Change from "standard" to "hd"
}),
```

### Custom Prompts

Modify the banner prompts in `SocialBannerGenerator.tsx` to customize:
- Style
- Colors
- Mood
- Visual elements
- Branding

## Production Deployment

For production, consider:

1. **Backend Proxy**: Move API calls to backend for security
2. **Environment Variables**: Use platform-specific env var management
3. **Rate Limiting**: Implement rate limiting on backend
4. **Caching**: Cache generated images to reduce API calls
5. **CDN**: Serve images from CDN for better performance

## Support

For issues or questions:
1. Check OpenAI API status: https://status.openai.com/
2. Review OpenAI documentation: https://platform.openai.com/docs/guides/images
3. Check OpenAI API keys: https://platform.openai.com/api-keys
