// State management
let currentEmails = [];
let selectedEmail = null;

// Upload area state management
function updateUploadAreaState(isGmailConnected) {
    const uploadSection = document.getElementById('uploadSection');
    const uploadArea = document.getElementById('uploadArea');
    const uploadResult = document.getElementById('uploadResult');

    if (isGmailConnected) {
        uploadSection.classList.add('gmail-connected');
        uploadArea.classList.remove('upload-area-normal');
        uploadArea.classList.add('upload-area-compact');
        uploadResult.classList.add('hidden');
    } else {
        uploadSection.classList.remove('gmail-connected');
        uploadArea.classList.remove('upload-area-compact');
        uploadArea.classList.add('upload-area-normal');
    }
}

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
            updateUploadAreaState(true);
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

    // Get priority and sentiment indicators
    const priority = email.priority_analysis;
    const sentiment = email.sentiment;
    const urgencyClass = priority.urgency_score >= 4 ? 'text-red-600' :
        priority.urgency_score >= 3 ? 'text-orange-600' : 'text-green-600';
    const importanceClass = priority.importance_score >= 4 ? 'font-bold' : '';

    div.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="flex-1">
                <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold text-gray-900 ${importanceClass}">${email.subject}</h3>
                    <span class="text-sm ${urgencyClass}">
                        ${priority.suggested_response_time === 'immediate' ? '⚡' :
            priority.suggested_response_time === 'within_hour' ? '⏰' :
                priority.suggested_response_time === 'within_day' ? '📅' : '📌'}
                    </span>
                </div>
                <p class="text-sm text-gray-600 mt-1">From: ${email.from}</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-sm">${sentiment.emoji} ${sentiment.primary_emotion}</span>
                    ${sentiment.secondary_emotions.length > 0 ?
            `<span class="text-xs text-gray-500">(+${sentiment.secondary_emotions.join(', ')})</span>` :
            ''}
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="showPriorityDetails('${email.id}')" 
                    class="text-gray-600 hover:text-gray-800" title="Priority Details">
                    <i class="fas fa-chart-bar"></i>
                </button>
                <button onclick="showReplyModal('${email.id}')" 
                    class="text-blue-600 hover:text-blue-800" title="Reply">
                    <i class="fas fa-reply"></i>
                </button>
            </div>
        </div>
        <div class="mt-4 text-gray-700">
            <div class="prose max-w-none">
                <h4 class="text-sm font-semibold text-gray-900 mb-2">Summary:</h4>
                <div class="whitespace-pre-wrap text-sm">${email.summary}</div>
            </div>
        </div>
        ${email.attachments.length > 0 ? `
            <div class="mt-4 space-y-2">
                <h4 class="text-sm font-semibold text-gray-900">Attachments:</h4>
                ${email.attachments.map(att => `
                    <div class="flex items-start gap-2 p-2 bg-gray-50 rounded">
                        <i class="fas fa-paperclip text-gray-500 mt-1"></i>
                        <div class="flex-1">
                            <div class="text-sm font-medium">${att.filename}</div>
                            <div class="text-xs text-gray-600 mt-1">${att.summary}</div>
                            <div class="text-xs text-gray-500 mt-1">
                                ${att.sentiment.emoji} ${att.sentiment.primary_emotion}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        <div class="mt-4 text-xs text-gray-500">
            Priority: ${priority.reason}
        </div>
    `;
    return div;
}

// Show priority details modal
function showPriorityDetails(emailId) {
    const email = currentEmails.find(e => e.id === emailId);
    if (!email) return;

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full';
    modal.innerHTML = `
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium">Priority Analysis</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-500">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="space-y-4">
                <div>
                    <h4 class="text-sm font-semibold text-gray-900">Urgency Score</h4>
                    <div class="mt-1 flex items-center">
                        <div class="flex-1 bg-gray-200 rounded-full h-2">
                            <div class="bg-red-600 h-2 rounded-full" style="width: ${email.priority_analysis.urgency_score * 20}%"></div>
                        </div>
                        <span class="ml-2 text-sm text-gray-600">${email.priority_analysis.urgency_score}/5</span>
                    </div>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-gray-900">Importance Score</h4>
                    <div class="mt-1 flex items-center">
                        <div class="flex-1 bg-gray-200 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full" style="width: ${email.priority_analysis.importance_score * 20}%"></div>
                        </div>
                        <span class="ml-2 text-sm text-gray-600">${email.priority_analysis.importance_score}/5</span>
                    </div>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-gray-900">Suggested Response Time</h4>
                    <p class="mt-1 text-sm text-gray-600">${email.priority_analysis.suggested_response_time.replace('_', ' ')}</p>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-gray-900">Reason</h4>
                    <p class="mt-1 text-sm text-gray-600">${email.priority_analysis.reason}</p>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-gray-900">Emotional Analysis</h4>
                    <div class="mt-1">
                        <p class="text-sm text-gray-600">
                            ${email.sentiment.emoji} Primary: ${email.sentiment.primary_emotion}
                            (Intensity: ${email.sentiment.intensity}/5)
                        </p>
                        ${email.sentiment.secondary_emotions.length > 0 ? `
                            <p class="text-sm text-gray-500 mt-1">
                                Secondary: ${email.sentiment.secondary_emotions.join(', ')}
                            </p>
                        ` : ''}
                        ${email.sentiment.triggers.length > 0 ? `
                            <p class="text-sm text-gray-500 mt-1">
                                Key triggers: ${email.sentiment.triggers.join(', ')}
                            </p>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
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
            body: JSON.stringify({
                body: selectedEmail.body,
                sender_name: selectedEmail.from.split('@')[0] // Basic name extraction
            })
        });
        const data = await response.json();

        if (data.status === 'success') {
            // Add placeholder information
            const placeholderInfo = data.placeholders;
            options.innerHTML = `
                <div class="mb-4 p-4 bg-blue-50 rounded-md">
                    <h4 class="text-sm font-semibold text-blue-900">${placeholderInfo.description}</h4>
                    <div class="mt-2 space-y-1">
                        ${Object.entries(placeholderInfo.types).map(([key, desc]) => `
                            <div class="text-sm">
                                <span class="font-medium text-blue-700">[${key}]</span>
                                <span class="text-blue-600">${desc}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${data.options.map((opt, i) => `
                    <div class="p-4 border rounded-md hover:bg-gray-50 cursor-pointer" onclick="selectReplyOption(${i})">
                        <h4 class="font-medium text-gray-900">${opt.subject}</h4>
                        <p class="mt-2 text-gray-700 whitespace-pre-wrap">${opt.body}</p>
                        ${opt.placeholders.length > 0 ? `
                            <div class="mt-2 text-sm text-gray-500">
                                Placeholders: ${opt.placeholders.join(', ')}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            `;
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

// File Upload Handling
document.addEventListener('DOMContentLoaded', function () {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadFileName = document.getElementById('uploadFileName');
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadResult = document.getElementById('uploadResult');

    // Handle drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('border-blue-500');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('border-blue-500');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-blue-500');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
            updateUploadAreaState(false);
        }
    });

    // Handle click to upload
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
            updateUploadAreaState(false);
        }
    });

    async function handleFileUpload(file) {
        // Show upload status
        uploadStatus.classList.remove('hidden');
        uploadFileName.textContent = file.name;
        uploadResult.classList.add('hidden');

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload-file', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Show success result
                uploadResult.classList.remove('hidden');
                uploadResult.innerHTML = `
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div class="flex items-start space-x-3">
                            <i class="fas fa-check-circle text-green-500 mt-1"></i>
                            <div class="flex-1">
                                <h4 class="text-sm font-medium text-green-800">File Processed Successfully</h4>
                                <div class="mt-2 space-y-4">
                                    <div>
                                        <h5 class="text-sm font-medium text-gray-700">Summary:</h5>
                                        <p class="mt-1 text-sm text-gray-600 whitespace-pre-wrap">${data.file_info.summary}</p>
                                    </div>
                                    <div>
                                        <h5 class="text-sm font-medium text-gray-700">Sentiment Analysis:</h5>
                                        <div class="mt-1 flex items-center space-x-2">
                                            <span class="text-2xl">${data.file_info.sentiment.emoji}</span>
                                            <div>
                                                <p class="text-sm text-gray-600">${data.file_info.sentiment.primary_emotion}</p>
                                                ${data.file_info.sentiment.secondary_emotions.length > 0 ?
                        `<p class="text-xs text-gray-500">Secondary: ${data.file_info.sentiment.secondary_emotions.join(', ')}</p>`
                        : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            uploadResult.classList.remove('hidden');
            uploadResult.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex items-start space-x-3">
                        <i class="fas fa-exclamation-circle text-red-500 mt-1"></i>
                        <div>
                            <h4 class="text-sm font-medium text-red-800">Upload Failed</h4>
                            <p class="mt-1 text-sm text-red-600">${error.message}</p>
                        </div>
                    </div>
                </div>
            `;
        } finally {
            // Reset file input
            fileInput.value = '';
            // Hide upload status after a delay
            setTimeout(() => {
                uploadStatus.classList.add('hidden');
            }, 2000);
        }
    }
});

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