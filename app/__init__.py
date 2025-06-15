from flask import Flask, jsonify
from flask_session import Session
from dotenv import load_dotenv
import os
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Configure Flask app
    app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-key-change-in-production')
    app.config['SESSION_TYPE'] = 'filesystem'
    app.config['SESSION_FILE_DIR'] = 'flask_session'
    app.config['SESSION_PERMANENT'] = False
    app.config['SESSION_USE_SIGNER'] = True
    
    # Configure Gemini API - try both methods of getting the API key
    gemini_api_key = os.environ.get('GEMINI_API_KEY') or os.getenv('GEMINI_API_KEY')
    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set. Please set it in your environment or .env file")
    genai.configure(api_key=gemini_api_key)
    
    # Initialize Flask extensions
    Session(app)
    
    # Register blueprints
    from .routes import main
    app.register_blueprint(main)
    
    # Add error handlers
    @app.errorhandler(403)
    def handle_403(e):
        app.logger.error(f"403 error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'403 Forbidden: {str(e)}',
            'details': 'Please check your authentication status and try again.'
        }), 403

    @app.errorhandler(500)
    def handle_500(e):
        app.logger.error(f"500 error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Internal Server Error: {str(e)}',
            'details': 'An unexpected error occurred. Please try again.'
        }), 500
    
    return app 