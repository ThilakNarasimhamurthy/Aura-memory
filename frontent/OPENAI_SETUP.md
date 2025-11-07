# OpenAI API Key Setup for Banner Generation

## Quick Setup

The banner generator uses OpenAI DALL-E 3 directly from the frontend. To enable it:

1. **Add to `.env` file** in the `frontent/` directory:
   ```env
   VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

2. **Get your OpenAI API key** from: https://platform.openai.com/api-keys

3. **Restart your development server** (Vite needs to restart to pick up new env variables)

## Important Notes

### Vite Environment Variables
- Vite **requires** the `VITE_` prefix to expose environment variables to the frontend
- Variables without the `VITE_` prefix are not accessible in the browser
- After adding/changing env variables, you **must restart** the Vite dev server

### Security Warning
⚠️ **API keys in frontend are visible to users in the browser**

For production, consider:
- Using a backend proxy to keep API keys secure
- Setting spending limits in OpenAI dashboard
- Using API key restrictions in OpenAI settings

### Current .env File
If you already have `OPENAI_API_KEY` in your `.env`, you need to also add:
```env
VITE_OPENAI_API_KEY=sk-your-key-here
```

The code will check for both, but `VITE_OPENAI_API_KEY` takes precedence.

## Testing

1. Add `VITE_OPENAI_API_KEY` to `.env`
2. Restart dev server: `npm run dev` or `vite`
3. Click "Regenerate All" in the banner generator
4. Check browser console for generation logs
5. Images should appear within 10-30 seconds

## Troubleshooting

### "API key not configured" error
- Make sure `VITE_OPENAI_API_KEY` is in `.env` file (with `VITE_` prefix)
- Restart your dev server
- Check that the variable name is exactly `VITE_OPENAI_API_KEY`

### "401 Unauthorized" error
- API key is invalid
- Check that your API key is correct
- Verify the key is active in OpenAI dashboard

### Images not generating
- Check browser console for errors
- Verify API key is set correctly
- Check OpenAI account has credits
- Verify rate limits haven't been exceeded

