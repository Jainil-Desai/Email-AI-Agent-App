import os
import pickle
import base64
from email.mime.text import MIMEText
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.api_core.exceptions import TooManyRequests

class GmailClient:
    def __init__(self, creds_path, token_path, save_dir="uploads"):
        self.creds_path = creds_path
        self.token_path = token_path
        self.save_dir = save_dir
        self.service = None
        os.makedirs(save_dir, exist_ok=True)

    def authenticate(self):
        """Authenticate with Gmail API using OAuth 2.0"""
        if os.path.exists(self.token_path):
            with open(self.token_path, 'rb') as token:
                creds = pickle.load(token)
        else:
            flow = Flow.from_client_secrets_file(
                self.creds_path,
                scopes=["https://www.googleapis.com/auth/gmail.modify"],
                redirect_uri='urn:ietf:wg:oauth:2.0:oob'
            )
            auth_url, _ = flow.authorization_url(prompt='consent')
            raise Exception(
                f"Please authenticate at: {auth_url}\n"
                "After authorizing, call authenticate() again with the code."
            )

        self.service = build('gmail', 'v1', credentials=creds)
        return self.service

    def get_unread_emails(self, max_results=10):
        """Get unread emails from inbox"""
        if not self.service:
            self.authenticate()

        response = self.service.users().messages().list(
            userId='me', labelIds=['INBOX'], q='is:unread').execute()
        messages = response.get('messages', [])[:max_results]

        emails = []
        for msg in messages:
            msg_data = self.service.users().messages().get(
                userId='me', id=msg['id'], format='full').execute()
            payload = msg_data.get('payload', {})
            headers = payload.get('headers', [])

            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
            sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown Sender')

            parts = payload.get('parts', [])
            data = payload.get('body', {}).get('data', '')
            if parts and 'data' in parts[0]['body']:
                data = parts[0]['body']['data']
            try:
                decoded_body = base64.urlsafe_b64decode(data.encode('UTF-8')).decode('utf-8', errors='ignore')
            except Exception:
                decoded_body = "[Error decoding body]"

            emails.append({
                'id': msg['id'],
                'subject': subject,
                'from': sender,
                'body': decoded_body.strip()
            })
        return emails

    def get_attachments(self, msg_id):
        """Download attachments from a message"""
        if not self.service:
            self.authenticate()

        attachments_info = []
        msg = self.service.users().messages().get(userId='me', id=msg_id).execute()
        parts = msg.get('payload', {}).get('parts', [])

        for part in parts:
            if part.get('filename') and 'attachmentId' in part.get('body', {}):
                attachment_id = part['body']['attachmentId']
                attachment = self.service.users().messages().attachments().get(
                    userId='me', messageId=msg_id, id=attachment_id).execute()
                file_data = base64.urlsafe_b64decode(attachment['data'].encode('UTF-8'))
                file_path = os.path.join(self.save_dir, part['filename'])

                with open(file_path, 'wb') as f:
                    f.write(file_data)
                attachments_info.append(file_path)

        return attachments_info

    def create_message(self, to, subject, message_text):
        """Create base64-encoded MIME message"""
        message = MIMEText(message_text)
        message['to'] = to
        message['subject'] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        return {'raw': raw}

    def send_email(self, to, subject, body):
        """Send email using Gmail API"""
        if not self.service:
            self.authenticate()

        message = self.create_message(to, subject, body)
        return self.service.users().messages().send(userId='me', body=message).execute()

    def mark_as_read(self, msg_id):
        """Mark an email as read"""
        if not self.service:
            self.authenticate()

        self.service.users().messages().modify(
            userId='me', id=msg_id, body={'removeLabelIds': ['UNREAD']}
        ).execute() 