# Banner Images Directory

This directory contains static fallback banner images for the Social Banner Generator.

## Current Status

⚠️ **Placeholder images are currently in use.** Replace `placeholder.svg` with actual banner images.

## Required Images

Place the following banner images in this directory:

- `cold-brew.jpg` (or .png) - Fallback image for Cold Brew category
- `latte.jpg` (or .png) - Fallback image for Latte category  
- `seasonal.jpg` (or .png) - Fallback image for Seasonal Special category
- `default.jpg` (or .png) - Default fallback image for any other category

## Image Specifications

- **Format**: JPEG, PNG, or WebP
- **Size**: 1024x1792 pixels (vertical banner format)
- **Aspect Ratio**: 9:16 (suitable for Instagram Stories, Facebook Posts)
- **Style**: Modern, clean, professional coffee shop aesthetic
- **File Size**: Keep under 500KB for optimal loading

## Usage

These images are used as fallbacks when:
- AI banner generation fails
- OpenAI API is not configured
- Network errors occur
- Rate limits are exceeded
- **On initial load** (fallback images are shown by default)

The component will automatically use these fallback images if AI generation is unavailable.

## Getting Banner Images

### Option 1: Free Stock Photos
- [Unsplash](https://unsplash.com/s/photos/coffee-banner) - Search for "coffee banner"
- [Pexels](https://www.pexels.com/search/coffee/) - Free coffee images
- [Pixabay](https://pixabay.com/images/search/coffee/) - Free coffee images

### Option 2: AI Generated (One-time)
- Generate banners using DALL-E or Midjourney
- Save them as static images in this directory
- They'll be used as fallbacks

### Option 3: Custom Design
- Create custom banners using Canva, Figma, or Photoshop
- Export as JPEG/PNG in 1024x1792 format

## Adding New Fallback Images

1. Add the image file to this directory
2. Update the `FALLBACK_BANNERS` object in `SocialBannerGenerator.tsx`:
   ```typescript
   const FALLBACK_BANNERS: Record<string, string> = {
     "Cold Brew": "/banners/cold-brew.jpg",
     "Latte": "/banners/latte.jpg",
     "Seasonal Special": "/banners/seasonal.jpg",
     "Your New Category": "/banners/your-new-category.jpg",
     "default": "/banners/default.jpg",
   };
   ```

