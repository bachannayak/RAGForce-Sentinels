import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class IaFileUpload extends LightningElement {
    @track selectedFileName = '';
    @track selectedFile = null;

    // This method is called when the checkbox is checked or unchecked
    handleCheckboxChange(event) {
        if (event.target.checked) {
            this.triggerFileUpload();
        }
    }

    // This method triggers the file input field when the checkbox is checked
    triggerFileUpload() {
        const fileInput = this.template.querySelector('input[type="file"]');
        if (fileInput) {
            fileInput.click();
        } else {
            this.showToast('Error', 'File input element not found', 'error');
        }
    }

    // This method handles file change when a file is selected
    handleFileChange(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            this.selectedFile = file;
            this.selectedFileName = file.name;
            
            this.showToast('Success', `File "${file.name}" has been selected`, 'success');
        } else {
            this.showToast('Warning', 'No file was selected', 'warning');
        }
    }

    // Method to handle the upload button click
    handleUpload() {
        if (this.selectedFile) {
            // Here you would implement the actual file upload logic
            // For example, using Apex to upload to Salesforce
            
            this.showToast('Success', `File "${this.selectedFile.name}" has been uploaded successfully`, 'success');
            this.resetComponent();
        } else {
            this.showToast('Error', 'Please select a file to upload', 'error');
        }
    }

    // Reset component state
    resetComponent() {
        this.selectedFile = null;
        this.selectedFileName = '';
    }

    // Helper method to show toast messages
    showToast(title, message, variant) {
        try {
            const evt = new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            });
            this.dispatchEvent(evt);
        } catch (error) {
            console.error('Error in showToast method:', error);
        }
    }
}