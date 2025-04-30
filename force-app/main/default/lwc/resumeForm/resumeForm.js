import { LightningElement, track } from 'lwc';

import createResumeRecord from '@salesforce/apex/ResumeFormController.createResumeRecord';

import getMCPChatResponse from '@salesforce/apex/MCPChatController.getMCPChatResponse';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class ResumeForm extends LightningElement {

    @track fullName = '';

    @track email = '';

    @track phone = '';

    @track experience = '';

    @track location = '';

    @track linkedin = '';

    @track role = '';

    @track summary = '';

    @track resumeId = null;

    @track primarySkills = '';
    @track secondarySkills = '';
    @track willingToRelocate = false;
    @track expectedSalary = '';
    @track education = '';
    @track workExperience = '';

    get roleOptions() {

        return [

            { label: 'Developer', value: 'Developer' },

            { label: 'QA', value: 'QA' },

            { label: 'Lead', value: 'Lead' },

            { label: 'Manager', value: 'Manager' }

        ];

    }

    handleChange(event) {
        const { name, value } = event.target;
        this[name] = value;
        }
        handleCheckboxChange(event) {
        const { name, checked } = event.target;
        this[name] = checked;
        }

    async handleSubmit() {

        try {

            const result = await createResumeRecord({

            fullName: this.fullName,

            email: this.email,

            phone: this.phone,

            experience: parseInt(this.experience),

            location: this.location,

            linkedin: this.linkedin,

            role: this.role,

            jobId: this.jobId,

            summary: this.summary,

            primarySkills: this.primarySkills,

            secondarySkills: this.secondarySkills,

            willingToRelocate: this.willingToRelocate,

            expectedSalary: parseFloat(this.expectedSalary),

            education: this.education,

            workExperience: this.workExperience

        });

            this.resumeId = result;

            this.dispatchEvent(

                new ShowToastEvent({

                    title: 'Success',

                    message: 'Resume record created. You can now upload the candidate image.',

                    variant: 'success'

                })

            );

        } catch (error) {

            this.dispatchEvent(

                new ShowToastEvent({

                    title: 'Error',

                    message: error.body?.message || 'Error creating resume record.',

                    variant: 'error'

                })

            );

        }

    }

    

    handleUploadFinished(event) {

        this.dispatchEvent(

            new ShowToastEvent({

                title: 'Image Uploaded',

                message: 'Candidate image uploaded successfully!',

                variant: 'success'

            })

        );

    }

        async fetchLinkedInDetails() {

        try {

            const result = await getMCPChatResponse({ userQuery: this.linkedin });
            console.log('result', result);

            // If response is JSON string, uncomment below

            const data = JSON.parse(result);
            console.log('data', data);

            this.fullName = data.full_name || '';

            this.phone = data.phone_number !== 'Not available' ? data.phone_number : '';

            this.email = data.email_id !== 'Not available' ? data.email_id : '';

            this.experience = data.year_of_experience || '';

            this.location = data.prefered_location || '';

            this.role = data.role || '';

            this.summary = data.professional_summary || '';

            this.primarySkills = Array.isArray(data.primary_skills) ? data.primary_skills.join(', ') : '';

            this.secondarySkills = Array.isArray(data.secondary_skills) ? data.secondary_skills.join(', ') : '';

            this.education = data.highest_education || '';

            this.dispatchEvent(

                new ShowToastEvent({

                    title: 'Success',

                    message: 'Fetched and filled details successfully!',

                    variant: 'success'

                })

            );

        } catch (error) {

            console.error('Error parsing response:', error);

            this.dispatchEvent(

                new ShowToastEvent({

                    title: 'Error',

                    message: error.body?.message || 'Failed to fetch details.',

                    variant: 'error'

                })

            );

        }

    }  

}