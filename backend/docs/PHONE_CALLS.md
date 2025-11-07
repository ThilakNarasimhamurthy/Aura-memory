# Phone Calling Integration

This document describes how to set up and use the phone calling feature that integrates Twilio for making actual phone calls and ElevenLabs for voice generation.

## Overview

The phone calling system allows you to:
1. Generate personalized call scripts using RAG
2. Convert scripts to speech using ElevenLabs TTS
3. Make actual phone calls to customers using Twilio
4. Test campaign effectiveness through real conversations

## Prerequisites

1. **Twilio Account**: Sign up at https://www.twilio.com/
   - Get your Account SID and Auth Token
   - Purchase a Twilio phone number
   - Configure webhook URLs

2. **ElevenLabs API Key**: Already configured (see ELEVENLABS_INTEGRATION.md)

## Setup

### 1. Install Dependencies

```bash
pip install twilio>=9.0.0
```

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number (E.164 format)

# Webhook URL (for TwiML responses)
# Use ngrok or similar for local development:
# ngrok http 8000
TWILIO_WEBHOOK_URL=https://your-ngrok-url.ngrok.io
# Or for production:
# TWILIO_WEBHOOK_URL=https://your-domain.com
```

### 3. Configure Twilio Webhooks

In your Twilio Console:
1. Go to Phone Numbers → Manage → Active Numbers
2. Click on your phone number
3. Under "Voice & Fax", set:
   - **A CALL COMES IN**: `https://your-webhook-url/phone-call/twiml`
   - **STATUS CALLBACK URL**: `https://your-webhook-url/phone-call/webhook`

## API Endpoints

### POST `/phone-call/initiate`

Initiate a phone call to a customer.

**Request Body:**
```json
{
  "phone_number": "+1234567890",
  "customer_name": "John Doe",
  "customer_id": "customer_123"
}
```

**Response:**
```json
{
  "success": true,
  "call_sid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued",
  "phone_number": "+1234567890",
  "script_preview": "Hello, this is a call...",
  "message": "Call initiated successfully..."
}
```

### GET `/phone-call/status/{call_sid}`

Get the status of a phone call.

**Response:**
```json
{
  "success": true,
  "call_sid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "completed",
  "duration": 120,
  "direction": "outbound-api",
  "to": "+1234567890",
  "from": "+0987654321",
  "start_time": "2024-01-01T12:00:00Z",
  "end_time": "2024-01-01T12:02:00Z"
}
```

### POST `/phone-call/twiml`

TwiML webhook endpoint (called by Twilio during the call).

### POST `/phone-call/handle-input`

Handle customer input during the call (speech or DTMF).

### POST `/phone-call/webhook`

Webhook for Twilio call status updates.

## Usage in Frontend

The frontend provides a "Make Actual Call" button that:
1. Generates a personalized call script using RAG
2. Initiates the phone call via Twilio
3. Monitors call status in real-time
4. Allows recording feedback after the call

## Call Flow

1. **User clicks "Make Actual Call"**
   - Frontend sends request to `/phone-call/initiate`
   - Backend generates call script using RAG
   - Backend initiates Twilio call

2. **Twilio calls the customer**
   - Twilio calls the customer's phone number
   - When answered, Twilio requests TwiML from `/phone-call/twiml`

3. **TwiML Response**
   - Backend generates TwiML with the script
   - Twilio plays the script to the customer
   - Optionally gathers customer input

4. **Call Status Updates**
   - Twilio sends status updates to `/phone-call/webhook`
   - Frontend polls `/phone-call/status/{call_sid}` for real-time updates

5. **Feedback Recording**
   - After call completion, user can record feedback
   - Feedback is stored for campaign effectiveness analysis

## Local Development

For local development, use ngrok to expose your local server:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start your backend
python -m uvicorn app.main:app --reload --port 8000

# In another terminal, start ngrok
ngrok http 8000

# Use the ngrok URL in TWILIO_WEBHOOK_URL
# Example: https://abc123.ngrok.io
```

## Troubleshooting

### Call not connecting
- Verify Twilio credentials are correct
- Check that phone number is in E.164 format (+1234567890)
- Ensure webhook URL is accessible (use ngrok for local dev)

### TwiML not loading
- Check webhook URL is correctly configured in Twilio
- Verify CORS settings allow Twilio requests
- Check server logs for errors

### No audio during call
- Verify ElevenLabs API key is set
- Check that script generation succeeded
- Review TwiML response in Twilio logs

## Cost Considerations

- **Twilio**: Charges per minute for outbound calls
- **ElevenLabs**: Charges per character for TTS (if using premium features)
- Monitor usage in both Twilio and ElevenLabs dashboards

## Security Notes

- Never commit Twilio credentials to version control
- Use environment variables for all sensitive data
- Restrict webhook endpoints to Twilio IPs in production
- Validate webhook requests using Twilio's signature verification

