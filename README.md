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

5. Set up Gmail OAuth:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable Gmail API
   - Create OAuth 2.0 credentials
   - Download the client secret JSON file
   - Rename it to `client_secret.json`
   - Place it in the `credentials/` directory

6. Run the application:
   ```bash
   python run.py
   ```

7. Visit `http://localhost:5000` in your browser

## Development

- The application uses Flask for the backend
- Frontend is built with HTML, Tailwind CSS, and JavaScript
- Gmail API is used for email access
- Gemini AI is used for reply suggestions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 