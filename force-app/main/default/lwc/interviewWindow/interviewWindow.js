import { LightningElement, track,api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import verifyUserImages from '@salesforce/apex/ImageMatchService.verifyUserImages';
import getContentVersion from '@salesforce/apex/ImageMatchService.getContentVersion';
import saveBase64ToContentVersion from '@salesforce/apex/FileUploadHelper.saveBase64ToContentVersion';
import USER_ID from '@salesforce/user/Id';

export default class InterviewWindow extends LightningElement {
    @track photoCaptured = false;
    @track verificationComplete = false;
    capturedImage;
    videoElement;
    canvasElement;
    @track idImageContentVersionId;
    @track _recordId; 
    @track currentUserId = USER_ID; // Get current user's ID

    selfieContentVersionId;

        @api 
        get recordId() {
            return this._recordId || this.currentUserId;
        }
        set recordId(value) {
            this._recordId = value;
        }
    
    // TODO: Replace with actual ID of the uploaded ID proof ContentVersion in your org
    // idImageContentVersionId = '069dL00000C2jOjQAJ';

    connectedCallback() {
        // Camera initialization is delayed until DOM is rendered
        window.setTimeout(() => {
            this.videoElement = this.template.querySelector('video');
            this.canvasElement = document.createElement('canvas');

            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    this.videoElement.srcObject = stream;
                })
                .catch(error => {
                    this.showToast('Error', 'Failed to access camera', 'error');
                });
        }, 500);

        getContentVersion({resumeId:this._recordId}).then(result => {
            this.idImageContentVersionId = result;
        });
    }

    // Capture the photo from video stream
   handleCapture() {
    const context = this.canvasElement.getContext('2d');
    this.canvasElement.width = this.videoElement.videoWidth;
    this.canvasElement.height = this.videoElement.videoHeight;
    context.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);

    // Get Base64 (without the prefix)
    this.capturedImage = this.canvasElement.toDataURL('image/jpeg').split(',')[1];

    // 🔴 Stop the video stream (camera)
    const stream = this.videoElement?.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    // Upload to Salesforce
    saveBase64ToContentVersion({ base64Data: this.capturedImage, fileName: 'LiveSelfie.jpg' })
        .then(contentId => {
            this.selfieContentVersionId = contentId;
            this.photoCaptured = true;
            this.verifyIdentity();
        })
        .catch(error => {
            this.showToast('Error', 'Failed to upload image', 'error');
            console.error(error);
        });
}


    // Call Apex to verify the uploaded image
    verifyIdentity() {
        verifyUserImages({
            idImageContentId: this.idImageContentVersionId,
            liveImageContentId: this.selfieContentVersionId
        })
        .then(response => {
            this.showToast('Success', 'Face verification completed', 'success');
            this.verificationComplete = true;
            const flag = response;
            const event = new CustomEvent('faceflag', {
            detail: flag
        });
        this.dispatchEvent(event);
        })
        .catch(error => {
            this.showToast('Error', 'Face verification failed', 'error');
        });
    }

    // Start interview
    startInterview() {
        this.showToast('Success', 'Starting your interview...', 'success');
        // Redirect or start questions, etc.
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            })
        );
    }

    disconnectedCallback() {
        const stream = this.videoElement?.srcObject;
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
        }
    }
}