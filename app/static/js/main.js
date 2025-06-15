// State management
let currentEmails = [];
let selectedEmail = null;

// Auth handling
document.getElementById('authBtn').addEventListener('click', async () => {
    const authStatus = document.getElementById('authStatus');
    const authBtn = document.getElementById('authBtn');

    authStatus.classList.remove('hidden');
    authBtn.disabled = true;

    try {
        const response = await fetch('/auth');
        const data = await response.json();

        if (data.status === 'success') {
            authStatus.innerHTML = `
                <div class="flex items-center text-green-600">
                    <i class="fas fa-check-circle mr-2"></i>
                    <span>Connected to Gmail</span>
                </div>
            `;
            authBtn.classList.add('hidden');
            loadEmails();
        } else if (data.status === 'error' && data.message.includes('Please authenticate at:')) {
            // Extract and show the auth URL
            const authUrl = data.message.split('Please authenticate at:')[1].split('\n')[0].trim();
            document.getElementById('authUrl').href = authUrl;
            document.getElementById('authUrlModal').classList.remove('hidden');
            authStatus.innerHTML = `
                <div class="flex items-center text-yellow-600">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    <span>Please complete the authorization process</span>
                </div>
            `;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        authStatus.innerHTML = `
            <div class="flex items-center text-red-600">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <span>${error.message}</span>
            </div>
        `;
        authBtn.disabled = false;
    }
});

// Load emails
async function loadEmails() {
    const emailList = document.getElementById('emailList');
    const loadingState = document.getElementById('loadingState');
    const noEmailsState = document.getElementById('noEmailsState');

    emailList.innerHTML = '';
    loadingState.classList.remove('hidden');
    noEmailsState.classList.add('hidden');

    try {
        const response = await fetch('/emails');
        const data = await response.json();

        if (data.status === 'success') {
            currentEmails = data.emails;

            if (currentEmails.length === 0) {
                noEmailsState.classList.remove('hidden');
            } else {
                currentEmails.forEach(email => {
                    const card = createEmailCard(email);
                    emailList.appendChild(card);
                });
            }
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        emailList.innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded-md">
                <i class="fas fa-exclamation-circle mr-2"></i>
                ${error.message}
            </div>
        `;
    } finally {
        loadingState.classList.add('hidden');
    }
}

// Create email card
function createEmailCard(email) {
    const div = document.createElement('div');
    div.className = 'email-card bg-white rounded-lg shadow p-6 cursor-pointer';
    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h3 class="text-lg font-semibold text-gray-900">${email.subject}</h3>
                <p class="text-sm text-gray-600 mt-1">From: ${email.from}</p>
            </div>
            <button onclick="showReplyModal('${email.id}')" class="text-blue-600 hover:text-blue-800">
                <i class="fas fa-reply"></i>
            </button>
        </div>
        <div class="mt-4 text-gray-700">
            <p class="whitespace-pre-wrap">${email.summary}</p>
        </div>
        ${email.attachments.length > 0 ? `
            <div class="mt-4 flex items-center text-sm text-gray-500">
                <i class="fas fa-paperclip mr-2"></i>
                ${email.attachments.length} attachment(s)
            </div>
        ` : ''}
    `;
    return div;
}

// Reply modal handling
async function showReplyModal(emailId) {
    selectedEmail = currentEmails.find(e => e.id === emailId);
    if (!selectedEmail) return;

    const modal = document.getElementById('replyModal');
    const options = document.getElementById('replyOptions');

    // Show loading state
    options.innerHTML = `
        <div class="text-center py-4">
            <i class="fas fa-circle-notch loading text-blue-600"></i>
            <p class="mt-2 text-gray-600">Generating reply suggestions...</p>
        </div>
    `;
    modal.classList.remove('hidden');

    try {
        const response = await fetch('/suggest-reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: selectedEmail.body })
        });
        const data = await response.json();

        if (data.status === 'success') {
            options.innerHTML = data.options.map((opt, i) => `
                <div class="p-4 border rounded-md hover:bg-gray-50 cursor-pointer" onclick="selectReplyOption(${i})">
                    <h4 class="font-medium text-gray-900">${opt.subject}</h4>
                    <p class="mt-2 text-gray-700 whitespace-pre-wrap">${opt.body}</p>
                </div>
            `).join('');
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        options.innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded-md">
                <i class="fas fa-exclamation-circle mr-2"></i>
                ${error.message}
            </div>
        `;
    }
}

function closeReplyModal() {
    document.getElementById('replyModal').classList.add('hidden');
    selectedEmail = null;
}

function selectReplyOption(index) {
    const options = document.getElementById('replyOptions').children;
    const selected = options[index];
    const subject = selected.querySelector('h4').textContent;
    const body = selected.querySelector('p').textContent;

    document.getElementById('replySubject').value = subject;
    document.getElementById('replyBody').value = body;
}

async function sendReply() {
    if (!selectedEmail) return;

    const subject = document.getElementById('replySubject').value;
    const body = document.getElementById('replyBody').value;

    try {
        const response = await fetch('/send-reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: selectedEmail.from,
                subject: subject,
                body: body,
                email_id: selectedEmail.id
            })
        });
        const data = await response.json();

        if (data.status === 'success') {
            closeReplyModal();
            loadEmails();  // Refresh the email list
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        alert(`Failed to send reply: ${error.message}`);
    }
}

function closeAuthCodeModal() {
    document.getElementById('authCodeModal').classList.add('hidden');
}

async function submitAuthCode() {
    const code = document.getElementById('authCode').value.trim();
    if (!code) return;

    const authStatus = document.getElementById('authStatus');
    authStatus.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-circle-notch loading text-blue-600 mr-2"></i>
            <span class="text-gray-700">Completing authentication...</span>
        </div>
    `;

    try {
        const response = await fetch('/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code })
        });
        const data = await response.json();

        if (data.status === 'success') {
            closeAuthCodeModal();
            authStatus.innerHTML = `
                <div class="flex items-center text-green-600">
                    <i class="fas fa-check-circle mr-2"></i>
                    <span>Connected to Gmail</span>
                </div>
            `;
            document.getElementById('authBtn').classList.add('hidden');
            loadEmails();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        authStatus.innerHTML = `
            <div class="flex items-center text-red-600">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <span>${error.message}</span>
            </div>
        `;
    }
}

function closeAuthUrlModal() {
    document.getElementById('authUrlModal').classList.add('hidden');
    // Show the auth code input modal after closing the URL modal
    document.getElementById('authCodeModal').classList.remove('hidden');
}

// Show API key modal when page loads
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('apiKeyModal').classList.remove('hidden');
});

function closeApiKeyModal() {
    document.getElementById('apiKeyModal').classList.add('hidden');
}

async function submitApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) return;

    try {
        const response = await fetch('/set-api-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey })
        });
        const data = await response.json();

        if (data.status === 'success') {
            closeApiKeyModal();
            // Enable the Gmail connect button
            document.getElementById('authBtn').disabled = false;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        alert('Failed to set API key: ' + error.message);
    }
}

async function fetchNextEmail() {
    try {
        const response = await fetch('/next-email');
        const data = await response.json();

        if (data.status === 'success') {
            // Update the email display
            document.getElementById('emailContent').innerHTML = `
                <div class="mb-4">
                    <p class="text-sm text-gray-600">From: ${data.email.from}</p>
                    <p class="text-sm text-gray-600">Subject: ${data.email.subject}</p>
                    <p class="text-sm text-gray-500">Sent: ${data.email.date}</p>
                </div>
                <div class="prose max-w-none">
                    ${data.email.body.replace(/\n/g, '<br>')}
                </div>
            `;

            // Clear any existing reply suggestions
            document.getElementById('replySuggestions').innerHTML = '';

            // Show success message
            showMessage('Next email loaded successfully!', 'success');
        } else if (data.status === 'no_more') {
            showMessage('No more unread emails!', 'info');
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        showMessage('Failed to fetch next email: ' + error.message, 'error');
    }
}

// Make functions available globally
window.showReplyModal = showReplyModal;
window.closeReplyModal = closeReplyModal;
window.selectReplyOption = selectReplyOption;
window.sendReply = sendReply;
window.closeAuthCodeModal = closeAuthCodeModal;
window.submitAuthCode = submitAuthCode;
window.closeAuthUrlModal = closeAuthUrlModal;
window.closeApiKeyModal = closeApiKeyModal;
window.submitApiKey = submitApiKey;
window.fetchNextEmail = fetchNextEmail; 