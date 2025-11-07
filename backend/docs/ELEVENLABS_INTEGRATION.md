# ElevenLabs Voice Integration Guide

This guide shows how to use ElevenLabs Text-to-Speech with the campaign conversation system for voice interactions with customers.

## Setup

### 1. Install Dependencies

The ElevenLabs SDK is already included in `requirements.txt`. Install it:

```bash
pip install -r requirements.txt
```

### 2. Get ElevenLabs API Key

1. Sign up at [ElevenLabs](https://elevenlabs.io)
2. Create an API key in the [dashboard](https://elevenlabs.io/app/settings/api-keys)
3. Add it to your `.env` file:

```env
ELEVENLABS_API_KEY=your_api_key_here
```

### 3. Optional Configuration

You can customize the voice and model in your `.env`:

```env
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb  # Default professional voice
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
ELEVENLABS_OUTPUT_FORMAT=mp3_44100_128
```

## API Endpoints

### 1. Text-Only Campaign Conversation

Get a conversational text response about campaigns and customers:

```bash
POST /langchain-rag/query/campaign
Content-Type: application/json

{
  "query": "Who are our most active customers and how are they responding to campaigns?",
  "k": 10,
  "include_memories": true,
  "user_id": "optional_user_id"
}
```

**Response:**
```json
{
  "query": "...",
  "answer": "Based on our customer data, I can see that...",
  "customers_found": 10,
  "customer_summaries": [...],
  "conversation_ready": true
}
```

### 2. Voice Campaign Conversation (ElevenLabs TTS)

Get an audio response ready for voice playback:

```bash
POST /langchain-rag/query/campaign/voice?voice_id=JBFqnCBsd6RMkjVDRZzb
Content-Type: application/json

{
  "query": "Who are our most active customers and how are they responding to campaigns?",
  "k": 10,
  "include_memories": true
}
```

**Response:**
- Content-Type: `audio/mpeg`
- Audio file (MP3) ready for playback
- Headers include query and customer count

### Python Example

```python
import requests

# Text response
response = requests.post(
    "http://localhost:8000/langchain-rag/query/campaign",
    json={
        "query": "Find our most active customers who responded to campaigns",
        "k": 10,
    }
)
result = response.json()
print(result["answer"])

# Voice response (audio)
audio_response = requests.post(
    "http://localhost:8000/langchain-rag/query/campaign/voice",
    json={
        "query": "Tell me about campaign effectiveness for our top customers",
        "k": 10,
    }
)

# Save audio file
with open("campaign_response.mp3", "wb") as f:
    f.write(audio_response.content)

# Or play directly (requires appropriate audio player)
```

### JavaScript/TypeScript Example

```javascript
// Text response
const textResponse = await fetch('http://localhost:8000/langchain-rag/query/campaign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Who are our most active customers?",
    k: 10
  })
});
const textData = await textResponse.json();
console.log(textData.answer);

// Voice response (audio)
const audioResponse = await fetch('http://localhost:8000/langchain-rag/query/campaign/voice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "Tell me about campaign performance",
    k: 10
  })
});

// Get audio blob and play
const audioBlob = await audioResponse.blob();
const audioUrl = URL.createObjectURL(audioBlob);
const audio = new Audio(audioUrl);
audio.play();
```

## Use Cases

### 1. Voice Agent for Campaign Conversations

Use the `/query/campaign/voice` endpoint to:
- Target most active customers
- Discuss campaign effectiveness
- Have natural voice conversations
- Get audio responses ready for ElevenLabs playback

### 2. Customer Targeting

The system automatically:
- Identifies active customers (high purchases, engagement, lifetime value)
- Retrieves campaign performance data
- Provides complete customer context in one chunk
- Generates natural, conversational responses

### 3. Campaign Effectiveness Analysis

Query examples:
- "Who are our most active customers?"
- "How are customers responding to our email campaigns?"
- "Which customers have the highest campaign conversion rates?"
- "Show me customers with high lifetime value who engaged with campaigns"

## Voice Settings

The service uses optimized voice settings for conversational agents:
- **Stability**: 0.5 (balanced)
- **Similarity Boost**: 0.75 (natural)
- **Speaker Boost**: Enabled
- **Model**: `eleven_multilingual_v2` (supports multiple languages)

You can customize these in the `ElevenLabsService` class.

## Available Voices

To get available voices:

```python
from app.services.elevenlabs_service import get_elevenlabs_service

service = get_elevenlabs_service()
voices = service.get_available_voices()
print(voices)
```

## Troubleshooting

### "ElevenLabs service is not available"
- Install: `pip install elevenlabs`
- Set `ELEVENLABS_API_KEY` in `.env`

### "Failed to generate speech"
- Check your API key is valid
- Verify you have API credits
- Check the text is not empty

### Audio quality issues
- Try different voice IDs
- Adjust voice settings (stability, similarity_boost)
- Use different output formats

## References

- [ElevenLabs Quickstart](https://elevenlabs.io/docs/quickstart)
- [ElevenLabs API Reference](https://elevenlabs.io/docs/api-reference)
- [Voice Agents Documentation](https://elevenlabs.io/docs/voice-agents)

