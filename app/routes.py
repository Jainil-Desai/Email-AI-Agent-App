from flask import Blueprint, render_template, jsonify, request, session, redirect, url_for
from app.services.gmail import GmailClient
from app.services.llm import LLMResponder
from app.services.file_processor import FileProcessor
from config import Config
import google.generativeai as genai
import pickle
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
import base64

main = Blueprint('main', __name__)

# Initialize services
gmail_client = None
llm_responder = None
file_processor = None

def init_services():
    global gmail_client, llm_responder, file_processor
    
    if not gmail_client:
        gmail_client = GmailClient(
            creds_path=Config.GMAIL_CREDENTIALS_PATH,
            token_path=Config.GMAIL_TOKEN_PATH
        )
    
    if not llm_responder:
        genai.configure(api_key=Config.GEMINI_API_KEY)
        model = genai.GenerativeModel(model_name=Config.GEMINI_MODEL)
        llm_responder = LLMResponder(model, signature=Config.DEFAULT_SIGNATURE)
    
    if not file_processor:
        file_processor = FileProcessor()

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/auth', methods=['GET', 'POST'])
def auth():
    """Handle Gmail OAuth authentication"""
    if not gmail_client:
        init_services()
    
    try:
        if request.method == 'POST':
            # Handle authorization code submission
            data = request.get_json()
            code = data.get('code')
            if not code:
                return jsonify({'status': 'error', 'message': 'No authorization code provided'}), 400
            
            # Complete the OAuth flow with the code
            flow = Flow.from_client_secrets_file(
                Config.GMAIL_CREDENTIALS_PATH,
                scopes=["https://www.googleapis.com/auth/gmail.modify"],
                redirect_uri='urn:ietf:wg:oauth:2.0:oob'
            )
            flow.fetch_token(code=code)
            
            # Save the credentials
            with open(Config.GMAIL_TOKEN_PATH, 'wb') as token:
                pickle.dump(flow.credentials, token)
            
            # Initialize the Gmail client with new credentials
            gmail_client.service = build('gmail', 'v1', credentials=flow.credentials)
            return jsonify({'status': 'success'})
        else:
            # Initial authentication request
            try:
                gmail_client.authenticate()
                return jsonify({'status': 'success'})
            except Exception as e:
                if 'Please authenticate at:' in str(e):
                    return jsonify({'status': 'error', 'message': str(e)}), 401
                raise
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 401

@main.route('/emails')
def get_emails():
    """Get unread emails with enhanced analysis"""
    if not all([gmail_client, llm_responder, file_processor]):
        init_services()
    
    try:
        emails = gmail_client.get_unread_emails()
        summaries = []
        
        for email in emails:
            # Get attachments and process them
            attachments = gmail_client.get_attachments(email['id'])
            attachment_summaries = []
            
            for attachment in attachments:
                file_type = attachment.split('.')[-1].lower()
                summary = llm_responder.process_attachment(attachment, file_type)
                attachment_summaries.append({
                    'filename': attachment.split('/')[-1],
                    'summary': summary,
                    'sentiment': llm_responder.detect_sentiment(summary)
                })
            
            # Analyze email priority
            priority_analysis = llm_responder.analyze_email_priority(
                email['subject'],
                email['body'],
                email['from']
            )
            
            # Analyze sentiment
            sentiment_analysis = llm_responder.detect_sentiment(email['body'])
            
            # Generate summary
            summary = llm_responder.summarize_text(
                email['body'],
                prefix="Summarize this email and extract key points:"
            )
            
            summaries.append({
                'id': email['id'],
                'from': email['from'],
                'subject': email['subject'],
                'body': email['body'],
                'summary': summary,
                'priority_analysis': priority_analysis,
                'sentiment': sentiment_analysis,
                'attachments': attachment_summaries,
                'suggested_response_time': priority_analysis['suggested_response_time']
            })
        
        # Rank emails by importance with enhanced analysis
        ranked_indices = llm_responder.rank_emails_by_importance(summaries)
        ranked_emails = [summaries[i] for i in ranked_indices]
        
        return jsonify({
            'status': 'success',
            'emails': ranked_emails,
            'analysis_summary': {
                'total_emails': len(ranked_emails),
                'urgent_count': sum(1 for e in ranked_emails if e['priority_analysis']['urgency_score'] >= 4),
                'important_count': sum(1 for e in ranked_emails if e['priority_analysis']['importance_score'] >= 4),
                'sentiment_distribution': {
                    'positive': sum(1 for e in ranked_emails if e['sentiment']['primary_emotion'] in ['Joy', 'Gratitude', 'Excitement']),
                    'negative': sum(1 for e in ranked_emails if e['sentiment']['primary_emotion'] in ['Anger', 'Frustration', 'Disappointment']),
                    'neutral': sum(1 for e in ranked_emails if e['sentiment']['primary_emotion'] in ['Neutral', 'Professional', 'Formal'])
                }
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@main.route('/suggest-reply', methods=['POST'])
def suggest_reply():
    """Generate personalized reply suggestions with placeholders"""
    if not llm_responder:
        init_services()
    
    try:
        data = request.get_json()
        email_body = data.get('body', '')
        sender_name = data.get('sender_name')
        num_options = data.get('num_options', 3)
        
        options = llm_responder.generate_reply_options(
            email_body,
            sender_name=sender_name,
            num_options=num_options
        )
        
        return jsonify({
            'status': 'success',
            'options': options,
            'placeholders': {
                'description': 'The following placeholders need to be filled:',
                'types': {
                    'NAME': 'Recipient\'s name',
                    'DATE': 'Specific date',
                    'TIME': 'Specific time',
                    'COMPANY': 'Company name',
                    'DETAILS': 'Additional details'
                }
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@main.route('/send-reply', methods=['POST'])
def send_reply():
    """Send an email reply"""
    if not gmail_client:
        init_services()
    
    try:
        data = request.get_json()
        to = data.get('to')
        subject = data.get('subject')
        body = data.get('body')
        email_id = data.get('email_id')
        
        # Send the email
        gmail_client.send_email(to, subject, body)
        
        # Mark original as read
        if email_id:
            gmail_client.mark_as_read(email_id)
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@main.route('/set-api-key', methods=['POST'])
def set_api_key():
    try:
        data = request.get_json()
        api_key = data.get('api_key')
        
        if not api_key:
            return jsonify({'status': 'error', 'message': 'API key is required'}), 400
            
        # Configure Gemini with the new API key
        genai.configure(api_key=api_key)
        
        # Store in session for persistence
        session['gemini_api_key'] = api_key
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@main.route('/next-email')
def next_email():
    try:
        if 'gmail_service' not in session:
            return jsonify({'status': 'error', 'message': 'Not authenticated with Gmail'}), 401
            
        service = session['gmail_service']
        
        # Get unread emails from Primary category, sorted by date (newest first)
        response = service.users().messages().list(
            userId='me',
            labelIds=['INBOX', 'CATEGORY_PERSONAL'],  # CATEGORY_PERSONAL is the Primary category
            q='is:unread',
            orderBy='date',  # Sort by date
            maxResults=1     # Get only the latest email
        ).execute()
        
        messages = response.get('messages', [])
        
        if not messages:
            return jsonify({'status': 'no_more', 'message': 'No more unread emails in Primary'})
            
        # Get the latest unread email
        msg = service.users().messages().get(userId='me', id=messages[0]['id'], format='full').execute()
        payload = msg.get('payload', {})
        headers = payload.get('headers', [])
        
        # Extract email details
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
        sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown Sender')
        date = next((h['value'] for h in headers if h['name'] == 'Date'), 'Unknown Date')
        
        # Parse and format the date
        try:
            from email.utils import parsedate_to_datetime
            from datetime import datetime
            import pytz
            
            # Parse the email date
            email_date = parsedate_to_datetime(date)
            
            # Convert to local timezone
            local_tz = pytz.timezone('America/New_York')  # You can change this to your timezone
            local_date = email_date.astimezone(local_tz)
            
            # Format the date nicely
            formatted_date = local_date.strftime('%B %d, %Y at %I:%M %p')
        except Exception:
            formatted_date = date  # Use original date string if parsing fails
        
        # Get email body
        parts = payload.get('parts', [])
        data = payload.get('body', {}).get('data', '')
        if parts and 'data' in parts[0]['body']:
            data = parts[0]['body']['data']
            
        try:
            body = base64.urlsafe_b64decode(data.encode('UTF-8')).decode('utf-8', errors='ignore')
        except Exception:
            body = "[Error decoding body]"
            
        # Store the message ID in session for reply handling
        session['current_message_id'] = msg['id']
        
        return jsonify({
            'status': 'success',
            'email': {
                'id': msg['id'],
                'from': sender,
                'subject': subject,
                'date': formatted_date,
                'body': body.strip()
            }
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500 