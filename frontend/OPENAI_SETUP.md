# OpenAI API Key Setup for Frontend

## Issue: OpenAI API Key Not Being Used

If you've added the OpenAI API key to your `.env` file but it's not being used, follow these steps:

## Solution

### 1. Check .env File Location
The `.env` file must be in the `frontend/` directory (not the root directory).

```bash
cd frontend
ls -la .env  # Should exist here
```

### 2. Verify Environment Variable Name
Vite only exposes environment variables prefixed with `VITE_` to the client code.

Your `.env` file should contain:
```env
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
```

**Important:**
- ✅ Use `VITE_OPENAI_API_KEY` (with `VITE_` prefix)
- ❌ Do NOT use `OPENAI_API_KEY` (without prefix - won't be exposed)
- ❌ Do NOT wrap the key in quotes: `VITE_OPENAI_API_KEY="sk-..."`
- ✅ No quotes: `VITE_OPENAI_API_KEY=sk-...`

### 3. Restart Dev Server
**Critical:** After adding or changing environment variables in `.env`, you must restart the Vite dev server.

```bash
# Stop the current dev server (Ctrl+C)
# Then restart it:
cd frontend
npm run dev
```

### 4. Verify the Key is Loaded
Check the browser console for any warnings about the API key. The component will log warnings if the key is missing.

You can also temporarily add this to your component to debug:
```typescript
console.log("OpenAI API Key:", import.meta.env.VITE_OPENAI_API_KEY ? "SET" : "NOT SET");
```

### 5. Common Issues

#### Issue: Key has quotes
```env
# ❌ Wrong
VITE_OPENAI_API_KEY="sk-..."

# ✅ Correct
VITE_OPENAI_API_KEY=sk-...
```

#### Issue: Key has extra spaces
```env
# ❌ Wrong
VITE_OPENAI_API_KEY = sk-...

# ✅ Correct
VITE_OPENAI_API_KEY=sk-...
```

#### Issue: Dev server not restarted
- Environment variables are only loaded when the dev server starts
- Changes to `.env` require a restart

#### Issue: Wrong prefix
```env
# ❌ Wrong (won't be exposed to client)
OPENAI_API_KEY=sk-...

# ✅ Correct
VITE_OPENAI_API_KEY=sk-...
```

## Where is the Key Used?

The OpenAI API key is used in:
- **SocialBannerGenerator.tsx**: For generating banner images using DALL-E 3
- Located in: `frontend/src/components/dashboard/SocialBannerGenerator.tsx`

## Testing

1. Add the key to `frontend/.env`:
   ```env
   VITE_OPENAI_API_KEY=sk-your-key-here
   ```

2. Restart the dev server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to the Dashboard page
4. Check the Social Banner Generator component
5. Try generating a banner - it should work if the key is properly configured

## Security Note

⚠️ **Important:** The `VITE_OPENAI_API_KEY` will be exposed in the browser's JavaScript bundle. This is acceptable for client-side features like DALL-E image generation, but be aware that:
- Anyone can see the key in the browser's developer tools
- Consider using rate limiting on your OpenAI account
- For sensitive operations, use the backend API instead

## Still Not Working?

If the key still isn't working after following these steps:

1. **Verify the key is valid**: Test it with curl:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer sk-your-key-here"
   ```

2. **Check browser console**: Look for error messages

3. **Verify .env file format**: Make sure there are no hidden characters or encoding issues

4. **Clear browser cache**: Sometimes cached JavaScript can cause issues

5. **Check Vite config**: Ensure `vite.config.ts` doesn't have any custom env variable handling that might interfere

