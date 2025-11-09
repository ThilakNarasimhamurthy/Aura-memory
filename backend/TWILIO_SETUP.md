# Twilio Setup Guide

## Quick Setup

To enable phone calling functionality, you need to:

1. **Install Twilio** (already installed)
   ```bash
   pip install twilio>=9.0.0
   ```

2. **Get Twilio Credentials**
   - Sign up at https://www.twilio.com/ (free trial available)
   - Get your Account SID and Auth Token from the Twilio Console
   - Purchase a Twilio phone number (or use trial number)

3. **Set Environment Variables**
   
   Create or update your `.env` file in the `backend/` directory:
   ```bash
   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number (E.164 format)
   
   # Optional: Webhook URL for production
   # For local development, use ngrok: https://ngrok.com/
   # TWILIO_WEBHOOK_URL=https://your-ngrok-url.ngrok.io
   ```

4. **Restart Backend Server**
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## Getting Twilio Credentials

1. **Sign up for Twilio**: https://www.twilio.com/try-twilio
2. **Get Account SID and Auth Token**:
   - Go to Twilio Console: https://console.twilio.com/
   - Your Account SID and Auth Token are on the dashboard
3. **Get a Phone Number**:
   - Go to Phone Numbers → Manage → Buy a number
   - Select a number with voice capabilities
   - Copy the number in E.164 format (e.g., +1234567890)

## Local Development (Webhooks)

For local development, you'll need to expose your local server to the internet for Twilio webhooks:

1. **Install ngrok**: https://ngrok.com/download
2. **Start ngrok**:
   ```bash
   ngrok http 8000
   ```
3. **Update .env**:
   ```bash
   TWILIO_WEBHOOK_URL=https://your-ngrok-url.ngrok.io
   ```
4. **Configure Twilio Webhook**:
   - In Twilio Console, go to your phone number
   - Set webhook URL to: `https://your-ngrok-url.ngrok.io/phone-call/twiml`

## Testing

Once configured, you can test phone calls from the Campaign Automation page:
1. Navigate to Campaign Automation
2. Select a customer or enter a phone number
3. Generate a call script
4. Click "Make Call" to initiate the call

## Troubleshooting

- **Error: "Twilio credentials not configured"**
  - Check that `.env` file exists in `backend/` directory
  - Verify all three variables are set: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
  - Restart the backend server after updating `.env`

- **Error: "Failed to make phone call"**
  - Verify your Twilio account has credits
  - Check that the phone number is in E.164 format (e.g., +1234567890)
  - Verify webhook URL is accessible (use ngrok for local development)

- **Error: "Webhook timeout"**
  - Ensure ngrok is running and URL is correct
  - Check that backend server is running on port 8000
  - Verify `TWILIO_WEBHOOK_URL` in `.env` matches ngrok URL

## Cost

- **Twilio**: Charges per minute for outbound calls (~$0.013/minute in US)
- **Trial Account**: Includes $15.50 free credit for testing
- Monitor usage in Twilio Console dashboard

## Security

- Never commit `.env` file to version control
- Use environment variables in production
- Restrict webhook endpoints to Twilio IPs in production
- Validate webhook requests using Twilio's signature verification

