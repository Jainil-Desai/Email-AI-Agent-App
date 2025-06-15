import time
import random
from google.api_core.exceptions import TooManyRequests

class LLMResponder:
    def __init__(self, model, signature="Best,\nJainil Desai"):
        self.model = model
        self.signature = signature

    def _retry_generate(self, prompt, max_attempts=3):
        """Retry mechanism for rate-limited LLM requests"""
        for attempt in range(max_attempts):
            try:
                return self.model.generate_content(prompt).text.strip()
            except TooManyRequests:
                wait = 2 ** attempt + random.uniform(0, 1)
                time.sleep(wait)
        raise Exception("Rate limit exceeded")

    def detect_sentiment(self, text):
        """Predict emotional tone of the input text"""
        prompt = (
            "Analyze the emotional tone of the message below. Choose the most fitting emotion from "
            "the following list: Joy, Anger, Disappointment, Anxiety, Frustration, Sadness, Neutral, Funny. "
            "Return only the matching emotion word.\n\n"
            f"{text.strip()}"
        )
        response = self._retry_generate(prompt).lower()
        emoji_map = {
            "joy": "🙂 Joy", "anger": "😠 Anger", "disappointment": "😞 Disappointment",
            "anxiety": "😰 Anxiety", "frustration": "😡 Frustration", "sadness": "😢 Sadness",
            "neutral": "😐 Neutral", "funny": "😂 Funny"
        }
        for keyword, emoji in emoji_map.items():
            if keyword in response:
                return emoji
        return "😐 Neutral"

    def summarize_text(self, text, prefix="Summarize this text:"):
        """Generate a summary from the input text"""
        prompt = f"{prefix}\n\n{text.strip()[:3000]}"
        return self._retry_generate(prompt) or "No summary available."

    def summarize_email_with_attachments(self, email_body, attachments_text):
        """Combine email and attachments for a unified summary"""
        combined_text = (email_body.strip() + "\n" + attachments_text.strip()).strip()
        sentiment = self.detect_sentiment(combined_text)
        body_summary = self.summarize_text(email_body, prefix="Summarize this email:")

        attachment_summary = ""
        if attachments_text:
            attachment_summary = self.summarize_text(
                attachments_text,
                prefix="Summarize the attached content and give important bullets:"
            )

        return f"{body_summary}\n\n{attachment_summary}\n\n{sentiment}".strip()

    def generate_reply_options(self, email_body, num_options=3):
        """Generate multiple reply options"""
        prompt = (
            f"The following is an email that needs a reply:\n\n{email_body.strip()}\n\n"
            f"Generate {num_options} professional, friendly email replies. "
            f"If the sender's name is identifiable, use it in a friendly greeting. "
            f"Otherwise, omit the greeting without using a placeholder. "
            f"End each reply with this signature:\n\n{self.signature}\n"
            f"Format each option like:\n\nSubject: [Your subject here]\nBody: [Your reply here]"
        )

        raw_output = self._retry_generate(prompt)
        blocks = raw_output.split("Subject:")[1:]

        options = []
        for block in blocks:
            lines = block.strip().splitlines()
            subject = lines[0].strip()
            remaining = "\n".join(lines[1:]).strip()
            if remaining.lower().startswith("body:"):
                remaining = remaining[5:].strip()

            if self.signature in remaining:
                body = remaining.split(self.signature)[0].strip() + f"\n{self.signature}"
            else:
                body = remaining.strip()

            options.append({"subject": subject, "body": body})
        return options

    def rank_emails_by_importance(self, email_summaries):
        """Rank emails based on perceived urgency and relevance"""
        prompt = "You are an email assistant. Rank the emails by urgency and importance.\n\n"
        for i, email in enumerate(email_summaries, 1):
            prompt += f"{i}. From: {email['from']}, Subject: {email['subject']}\nSummary: {email['summary']}\n\n"
        prompt += "Return a comma-separated list like: 2,1,3"

        response = self._retry_generate(prompt)
        order = [int(x.strip()) - 1 for x in response.strip().split(',') if x.strip().isdigit()]
        return [i for i in order if 0 <= i < len(email_summaries)] 