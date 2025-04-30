import { LightningElement,track,api } from 'lwc';
import uploadImage from '@salesforce/apex/ContentVersionUploader.uploadImage'; // Apex method to upload image
import saveTranscript from '@salesforce/apex/InterviewAgentHandler.saveTranscript';
import invokeInterviewAgent from '@salesforce/apex/InterviewAgentHandler.invokeInterviewAgent';
import checkEligibility from '@salesforce/apex/InterviewAgentHandler.checkEligibility';
import USER_ID from '@salesforce/user/Id';


export default class VideoModal extends LightningElement {
    @api 
    get recordId() {
        return this._recordId || this.currentUserId;
    }
    set recordId(value) {
        this._recordId = value;
        console.log('Record ID updated:', this._recordId);
        this.checkInterviewEligibility();
    }

    @track _recordId;  // Private property to store record ID
    @track currentUserId = USER_ID; // Get current user's ID
    @track isModalOpen = false;
    @track isVideoOn = false;
    @track stream;
    @track captureInterval;
    @track videoElement;
    @track transcript = '';
    @track agentResponse = '';
    @track agentTranslatedResponse = '';
    @track isRecording = false;
    @track fullConversation = ''; // Track the entire conversation
    @track recognition;
    @track visibilityChangeHandler;
    @track keydownHandler;
    @track contextMenuHandler;
    @track blurHandler;
    @track isFullscreen = false;
    @track lastActiveTime = Date.now();
    @track inactivityTimeout;
    @track isEligibleForInterview = false;
    @track selectedLanguage = '';
    @track availableLanguages = [
        { label: 'English', value: 'en' },
        { label: 'Spanish', value: 'es' },
        { label: 'French', value: 'fr' },
        { label: 'German', value: 'de' },
        { label: 'Italian', value: 'it' },
        { label: 'Portuguese', value: 'pt' },
        { label: 'Russian', value: 'ru' },
        { label: 'Japanese', value: 'ja' },
        { label: 'Chinese', value: 'zh' },
        { label: 'Arabic', value: 'ar' },
        { label: 'Hindi', value: 'hi' }
    ];
    @track detectedLanguage = 'en';

    connectedCallback() {
        if (this.recordId) {
            this._recordId = this.recordId;
            console.log('Record ID stored:', this._recordId);
            this.checkInterviewEligibility();
        }
        this.initializeSpeechRecognition();
        this.setupSecurityHandlers();
        this.setupInactivityDetection();
        this.setupTabSwitchWarning();
    }

    disconnectedCallback() {
        this.cleanupSecurityHandlers();
        this.cleanupInactivityDetection();
        this.stopVideo();
        this.stopRecording();
        this.cleanupTabSwitchWarning();
    }

    setupSecurityHandlers() {
        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isModalOpen) {
                this.handleSecurityViolation();
            }
        });

        // Handle keyboard events
        document.addEventListener('keydown', (event) => {
            if (this.isModalOpen) {
                if (event.ctrlKey || event.metaKey || event.altKey) {
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                }

                const blockedKeys = ['Tab', 'F11', 'F12', 'PrintScreen', 'Escape', 'alt'];
                if (blockedKeys.includes(event.key)) {
                    event.preventDefault();
                    event.stopPropagation();
                    return false;
                }
            }
        }, true);

        // Prevent context menu and selection
        const preventDefaultHandler = (event) => {
            if (this.isModalOpen) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
        };

        ['contextmenu', 'copy', 'paste', 'cut', 'selectstart', 'dragstart'].forEach(eventType => {
            document.addEventListener(eventType, preventDefaultHandler, true);
        });
    }

    handleSecurityViolation() {
        this.closeModal();
        // Use a more friendly message
        this.dispatchEvent(new CustomEvent('securityviolation', {
            detail: {
                message: 'Interview session ended for security reasons. Please restart the interview.'
            }
        }));
    }

    setupInactivityDetection() {
        const resetTimer = () => {
            this.lastActiveTime = Date.now();
        };

        // Monitor user activity
        ['mousemove', 'mousedown', 'keypress', 'touchstart'].forEach(eventType => {
            document.addEventListener(eventType, resetTimer, true);
        });

        // Check inactivity every 5 seconds
        this.inactivityTimeout = setInterval(() => {
            if (this.isModalOpen && Date.now() - this.lastActiveTime > 300000) { // 5 minutes
                this.handleSecurityViolation();
            }
        }, 5000);
    }

    cleanupInactivityDetection() {
        if (this.inactivityTimeout) {
            clearInterval(this.inactivityTimeout);
        }
    }

    cleanupSecurityHandlers() {
        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
        }
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        if (this.contextMenuHandler) {
            document.removeEventListener('contextmenu', this.contextMenuHandler);
        }
        if (this.blurHandler) {
            window.removeEventListener('blur', this.blurHandler);
        }
        document.removeEventListener('copy', this.copyHandler, true);
        document.removeEventListener('paste', this.copyHandler, true);
        document.removeEventListener('cut', this.copyHandler, true);
        document.removeEventListener('selectstart', this.mouseHandler, true);
        document.removeEventListener('dragstart', this.mouseHandler, true);
    }

    get toggleButtonLabel() {
        return this.isVideoOn ? 'Stop Video' : 'Start Video';
    }

    openModal() {
        console.log('Opening modal...');
        this.isModalOpen = true;
        this.resetModalState();
        this.applySecurityMeasures();
    }

    resetModalState() {
        this.transcript = '';
        this.agentResponse = '';
        this.agentTranslatedResponse = '';
        this.fullConversation = '';
        this.isRecording = false;
        this.isVideoOn = false;
        this.lastActiveTime = Date.now();
    }

    applySecurityMeasures() {
        document.body.style.overflow = 'hidden';
        this.template.querySelector('.modal-container').style.userSelect = 'none';
        this.template.querySelector('.security-overlay').style.pointerEvents = 'all';
    }

    async closeModal() {
        try {
            // Save the full transcript before closing
            await this.saveFullTranscript();
            
            // Stop any ongoing processes
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            if (this.captureInterval) {
                clearInterval(this.captureInterval);
            }
            if (this.recognition) {
                this.recognition.stop();
            }
            
            // Remove event listeners
            this.removeEventListeners();
            
            // Reset the modal state
            this.resetModalState();
            
            // Close the modal
            this.isModalOpen = false;
            
            // Dispatch event with the final feedback
            this.dispatchEvent(new CustomEvent('interviewcomplete', {
                detail: {
                    feedback: this.agentResponse
                }
            }));
        } catch (error) {
            console.error('Error closing modal:', error);
        }
    }

    disableContextMenu() {
        document.oncontextmenu = this.preventContextMenu;
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.body.style.msUserSelect = 'none';
        document.body.style.mozUserSelect = 'none';
    }

    enableContextMenu() {
        document.oncontextmenu = null;
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.body.style.msUserSelect = '';
        document.body.style.mozUserSelect = '';
    }

    toggleVideo(event) {
        event.stopPropagation();
        console.log('Toggling video...', this.isVideoOn);
        if (this.isVideoOn) {
            this.stopVideo();
        } else {
            this.startVideo();
        }
    }

    async startVideo() {
        console.log('Starting video...');
        try {
            this.videoElement = this.template.querySelector('video');
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                this.stream = stream;
                this.videoElement.srcObject = stream;
                this.isVideoOn = true;
                console.log('Video started successfully');

                // Start capturing images every 5 seconds
                this.captureInterval = setInterval(() => this.captureImage(), 5000);
            } else {
                throw new Error('getUserMedia not supported');
            }
        } catch (error) {
            console.error('Error starting video:', error);
            alert('Could not access camera. Please ensure camera permissions are granted.');
        }
    }

    stopVideo() {
        console.log('Stopping video...');
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.captureInterval) {
            clearInterval(this.captureInterval);
            this.captureInterval = null;
        }
        this.isVideoOn = false;
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        console.log('Video stopped successfully');
    }

    stopRecording() {
        console.log('Stopping recording...');
        if (this.recognition) {
            this.recognition.stop();
            this.isRecording = false;
        }
    }

    async captureImage() {
        if (!this.videoElement || !this.stream) {
            console.warn('Video stream not available');
            return;
        }

        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.width = this.videoElement.videoWidth;
            canvas.height = this.videoElement.videoHeight;
            
            context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL('image/jpeg');
            
            await this.uploadToSalesforce(imageData);
        } catch (error) {
            console.error('Error capturing/uploading image:', error);
            // Handle error appropriately without exposing details
        }
    }

    async uploadToSalesforce(imageData) {
        try {
            const result = await uploadImage({ 
                base64Image: imageData, 
                userId: this.currentUserId,
                recordId: this.recordId  // Use getter
            });
            console.log('Image uploaded successfully');
        } catch (error) {
            console.error('Upload error:', error);
            // Handle error appropriately
        }
    }

    // 🤖🤖👽👽speech to text start here 👽👽🤖🤖--->>

    initializeSpeechRecognition() {
        console.log('Initializing speech recognition...');
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (window.SpeechRecognition) {
            this.recognition = new window.SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            
            // Set initial language based on selected language or default to English
            this.recognition.lang = this.selectedLanguage || 'en-US';
            console.log('Speech recognition language set to:', this.recognition.lang);

            this.recognition.onresult = (event) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    currentTranscript += event.results[i][0].transcript;
                }
                this.transcript = currentTranscript;
                console.log('Transcript updated:', this.transcript);
            };

            this.recognition.onend = () => {
                console.log('Speech recognition ended with transcript:', this.transcript);
                if (this.isRecording) {
                    if (this.transcript && this.transcript.trim()) {
                        this.speakText();
                    } else {
                        console.warn('⚠️ Transcript is empty. Not speaking.');
                        // Restart recognition with the same language
                        this.recognition.lang = this.selectedLanguage || 'en-US';
                        this.recognition.start();
                    }
                }
                this.isRecording = false;
            };

            this.recognition.onerror = (event) => {
                console.error('Speech Recognition Error:', event.error);
                this.isRecording = false;
            };
        } else {
            console.error('Speech Recognition not supported');
            alert('Your browser does not support Speech Recognition. Please use Chrome.');
        }
    }

    // Add method to change recognition language
    changeRecognitionLanguage(languageCode) {
        if (this.recognition) {
            this.selectedLanguage = languageCode;
            this.recognition.lang = languageCode;
            console.log('Speech recognition language changed to:', languageCode);
        }
    }

    // Update the language selection handler
    handleLanguageChange(event) {
        const selectedLanguage = event.detail.value;
        this.changeRecognitionLanguage(selectedLanguage);
        console.log('Language changed to:', selectedLanguage);
    }

    // Update toggleRecording to respect language settings
    toggleRecording(event) {
        event.stopPropagation();
        console.log('Toggling recording...', this.isRecording);
        try {
            if (this.isRecording) {
                console.log('Stopping recording...');
                this.stopRecording();
            } else {
                console.log('Starting recording...');
                this.transcript = '';
                this.isRecording = true;
                // Ensure correct language is set before starting
                this.recognition.lang = this.selectedLanguage || 'en-US';
                this.recognition.start();
            }
        } catch (error) {
            console.error('Error in toggleRecording:', error);
            this.isRecording = false;
        }
    }

    handleTextChange(event) {
        this.transcript = event.target.value;
    }

    async speakText() {
        console.log('✅ speakText called with transcript: ', this.transcript);
        if (!window.speechSynthesis) {
            alert('Text-to-speech is not supported in your browser.');
            return;
        }

        try {
            // Get agent response with conversation history and record ID
            const response = await invokeInterviewAgent({ 
                transcript: this.transcript,
                conversationHistory: this.fullConversation,
                recordId: this.recordId
            });

            // Parse JSON string if needed
            let parsedResponse = response;
            if (typeof response === 'string' && response.trim().startsWith('{')) {
                try {
                    parsedResponse = JSON.parse(response);
                } catch (e) {
                    // fallback: keep as string
                    console.warn('Failed to parse agent response as JSON:', e);
                }
            }

            // Now process as before
            if (parsedResponse && typeof parsedResponse === 'object') {
                this.agentResponse = parsedResponse.original || parsedResponse.value || '';
                this.agentTranslatedResponse = parsedResponse.translated || '';
            } else if (typeof parsedResponse === 'string') {
                this.agentResponse = parsedResponse;
                this.agentTranslatedResponse = '';
            } else {
                this.agentResponse = 'No response received from agent';
                this.agentTranslatedResponse = '';
            }

            console.log('Processed agent response:', this.agentResponse);
            console.log('Processed translated response:', this.agentTranslatedResponse);

            // Only add translated response to conversation if it exists
            if (this.fullConversation) {
                this.fullConversation += '\n\n';
            }
            this.fullConversation += 'User: ' + this.transcript + '\nAgent: ' + this.agentResponse;
            if (this.agentTranslatedResponse && this.agentTranslatedResponse !== 'null') {
                this.fullConversation += '\nAgent (translated): ' + this.agentTranslatedResponse;
            }

            const synth = window.speechSynthesis;
            const utterance = new SpeechSynthesisUtterance(this.agentResponse);
            utterance.lang = 'en-US';

            utterance.onend = () => {
                // After agent finishes speaking, restart recording
                if (this.isModalOpen) {
                    console.log('Agent finished speaking, restarting recording...');
                    this.transcript = '';
                    this.isRecording = true;
                    this.recognition.start();
                }
            };

            const assignVoiceAndSpeak = () => {
                const voices = synth.getVoices();
                console.log('✅ Available voices:', voices);

                const preferredVoice = voices.find(
                    (v) => v.name === 'Microsoft David - English (United States)'
                );

                if (preferredVoice) {
                    utterance.voice = preferredVoice;
                    console.log('✅ Assigned preferred voice:', preferredVoice.name);
                } else {
                    console.warn('⚠️ Preferred voice not found. Using default.');
                }

                synth.cancel(); // Clear any existing speech
                synth.speak(utterance);
            };

            if (synth.getVoices().length === 0) {
                synth.onvoiceschanged = assignVoiceAndSpeak;
            } else {
                assignVoiceAndSpeak();
            }
        } catch (error) {
            console.error('Error in speakText:', error);
            this.agentResponse = 'Error getting response from agent: ' + error.message;
            this.agentTranslatedResponse = null;
            
            // Even in case of error, restart recording if modal is open
            if (this.isModalOpen) {
                console.log('Error occurred, restarting recording...');
                this.transcript = '';
                this.isRecording = true;
                this.recognition.start();
            }
        }
    }

    async saveFullTranscript() {
        if (!this.fullConversation.trim()) return;

        try {
            await saveTranscript({
                userInput: this.fullConversation,
                agentResponse: this.agentResponse,
                recordId: this.recordId
            });
            console.log('Conversation saved successfully');
        } catch (error) {
            console.error('Error saving conversation:', error);
        }
    }

    setupTabSwitchWarning() {
        // Add beforeunload handler for tab/window switching
        window.addEventListener('beforeunload', (event) => {
            if (this.isModalOpen) {
                event.preventDefault();
                event.returnValue = 'Are you sure you want to leave? The interview session is still active.';
                return event.returnValue;
            }
        });

        // Add visibility change handler for tab switching
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isModalOpen) {
                // Show warning before switching
                const warningMessage = 'Are you sure you want to switch tabs? The interview session is still active.';
                if (!confirm(warningMessage)) {
                    // If user cancels, prevent the tab switch
                    event.preventDefault();
                }
            }
        });
    }

    cleanupTabSwitchWarning() {
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }

    showTabSwitchWarning() {
        // This method is kept for backward compatibility
        const warningMessage = 'Are you sure you want to leave? The interview session is still active.';
        return warningMessage;
    }

    async checkInterviewEligibility() {
        try {
            if (this._recordId) {
                const result = await checkEligibility({ recordId: this._recordId });
                this.isEligibleForInterview = result;
                console.log('Interview eligibility check result:', this.isEligibleForInterview);
            }
        } catch (error) {
            console.error('Error checking interview eligibility:', error);
            this.isEligibleForInterview = false;
        }
    }

    get isInterviewButtonDisabled() {
        return !this.isEligibleForInterview;
    }

    get interviewButtonTitle() {
        return this.isEligibleForInterview 
            ? 'Start Interview' 
            : 'You are not eligible for L1 interview';
    }
}