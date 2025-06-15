# Email Agent

An AI-powered email assistant that helps you manage and respond to your Gmail inbox using Google's Gemini AI.

## Features

- Gmail OAuth integration for secure email access
- AI-powered email reply suggestions using Google's Gemini AI
- Focus on Primary inbox category
- Modern web interface
- Real-time email processing

## Security Notice

This application handles sensitive information and requires proper security setup:

1. Never commit the following files to version control:
   - `.env` (contains API keys and secrets)
   - `credentials/` directory (contains OAuth tokens)
   - Any `client_secret*.json` files
   - `token.pkl`

2. Always use environment variables for sensitive data
3. Keep your API keys and OAuth credentials secure

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd email-agent
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your actual API keys and secrets in `.env`
   - Required environment variables:
     - `GMAIL_CLIENT_ID`: Your Gmail OAuth client ID
     - `GMAIL_CLIENT_SECRET`: Your Gmail OAuth client secret
     - `GEMINI_API_KEY`: Your Google Gemini API key (get it from [Google AI Studio](https://makersuite.google.com/app/apikey))

5. Set up Gemini API:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add the API key to your `.env` file as `GEMINI_API_KEY`
   - Note: The Gemini API has usage limits and may require billing setup for production use

6. Set up Gmail OAuth:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable Gmail API
   - Create OAuth 2.0 credentials
   - Download the client secret JSON file
   - Rename it to `client_secret.json`
   - Place it in the `credentials/` directory

7. Run the application:
   ```bash
   python3/python run.py
   ```

8. Visit `http://localhost:5000` in your browser

## Authorization Flow

After setting up the application, you'll need to authorize it to access your Gmail account:

1. Click the "Connect to Gmail" button on the homepage
2. You'll be redirected to Google's consent screen
3. Review the permissions being requested:
   - Read and send emails
   - Manage email settings
   - View email metadata
4. Sign in with your Google account if not already signed in
5. Click "Allow" to grant the requested permissions
6. You'll be redirected back to the application
7. The application will now be able to access your Gmail account
8. Note: You can revoke access at any time through your [Google Account Security Settings](https://myaccount.google.com/security)