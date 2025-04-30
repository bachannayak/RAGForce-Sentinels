/**
* @File Name : InterviewAgentHandler.cls
* @Description : This is an interview agent handler to handle all the functionalities of Employee_assessment_Agent
* @Author : Roshni Sharma
* @Last Modified By : RAGForce Sentinels
* @Last Modified On : April 29, 2025
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | April 29, 2025 |   | Initial Version
**/

public with sharing class InterviewAgentHandler {

    @AuraEnabled
    public static String invokeInterviewAgent(String transcript, String conversationHistory, String targetLang) {
        System.debug('invokeInterviewAgent called with targetLang: ' + targetLang);
        try {
            if (String.isBlank(transcript)) {
                throw new AuraHandledException('Transcript cannot be empty');
            }

            String fullContext = '';
            if (String.isNotBlank(conversationHistory)) {
                fullContext = conversationHistory + '\n\nUser: ' + transcript;
            } else {
                fullContext = 'User: ' + transcript;
            }

            Invocable.Action action = Invocable.Action.createCustomAction('generateAiAgentResponse', 'Employee_Assessment_Agent');
            if (action == null) {
                throw new AuraHandledException('Failed to create AI agent action');
            }
            
            action.setInvocationParameter('userMessage', fullContext);
            List<Invocable.Action.Result> results = action.invoke();
            
            if (results == null || results.isEmpty()) {
                throw new AuraHandledException('No response received from AI agent');
            }
            
            Invocable.Action.Result result = results[0];
            if (result == null) {
                throw new AuraHandledException('Invalid response from AI agent');
            }

            String originalResponse = '';
            String translatedResponse = '';

            if (result.isSuccess()) {
                Object agentReply = result.getOutputParameters().get('agentResponse');
                if (agentReply == null) {
                    throw new AuraHandledException('No response content received from AI agent');
                }

                if (agentReply instanceof String) {
                    try {
                        Map<String, Object> parsedMap = (Map<String, Object>) JSON.deserializeUntyped((String) agentReply);
                        if (parsedMap != null) {
                            if (parsedMap.containsKey('original') && parsedMap.containsKey('translated')) {
                                originalResponse = String.valueOf(parsedMap.get('original'));
                                translatedResponse = String.valueOf(parsedMap.get('translated'));
                            } else if (parsedMap.containsKey('value')) {
                                originalResponse = String.valueOf(parsedMap.get('value'));
                                translatedResponse = originalResponse;
                            } else {
                                originalResponse = String.valueOf(agentReply);
                                translatedResponse = originalResponse;
                            }
                        } else {
                            originalResponse = String.valueOf(agentReply);
                            translatedResponse = originalResponse;
                        }
                    } catch (JSONException e) {
                        System.debug('JSON parsing error: ' + e.getMessage());
                        originalResponse = String.valueOf(agentReply);
                        translatedResponse = originalResponse;
                    }
                } else {
                    originalResponse = String.valueOf(agentReply);
                    translatedResponse = originalResponse;
                }
            } else {
                List<Object> errors = result.getErrors();
                String errorMessage = errors != null && !errors.isEmpty() ? 
                    JSON.serialize(errors) : 'Unknown error occurred';
                originalResponse = 'Agent error: ' + errorMessage;
                translatedResponse = originalResponse;
            }

            System.debug('Original response: ' + originalResponse);
            System.debug('Pre-translation translatedResponse: ' + translatedResponse);

            // Translate if needed
            if (String.isNotBlank(targetLang) && !targetLang.equalsIgnoreCase('en')) {
                System.debug('Calling TranslationUtil for: ' + targetLang);
                try {
                    translatedResponse = TranslationUtil.translateText(originalResponse, targetLang);
                    System.debug('Translated response after TranslationUtil: ' + translatedResponse);
                } catch (Exception e) {
                    System.debug('Translation error: ' + e.getMessage());
                    translatedResponse = originalResponse;
                }
            } else {
                System.debug('Translation not needed or targetLang is en/null.');
            }

            Map<String, String> responseMap = new Map<String, String>{
                'original' => originalResponse,
                'translated' => translatedResponse
            };
            return JSON.serialize(responseMap);

        } catch (Exception e) {
            System.debug('Error in invokeInterviewAgent: ' + e.getMessage() + '\n' + e.getStackTraceString());
            Map<String, String> errorMap = new Map<String, String>{
                'original' => 'Error invoking agent: ' + e.getMessage(),
                'translated' => 'Error invoking agent: ' + e.getMessage()
            };
            return JSON.serialize(errorMap);
        }
    }

    @AuraEnabled
    public static void saveTranscript(String userInput, String agentResponse, Id recordID) {
        Transcript__c t = new Transcript__c();
        t.Resume__c = recordID;
        t.Transcript__c = userInput;
        insert t;
    }

    @AuraEnabled
    public static Boolean checkEligibility(Id recordId) {
        try {
            // Query the Resume__c record to check eligibility
            List<Resume__c> resumes = [
                SELECT Id, Eligible_for_L1__c 
                FROM Resume__c 
                WHERE Id = :recordId
                LIMIT 1
            ];
            
            // If no resume found or field is false, return false
            if (resumes.isEmpty() || !resumes[0].Eligible_for_L1__c) {
                return false;
            }
            
            return true;
            
        } catch (Exception e) {
            System.debug('Error checking eligibility: ' + e.getMessage());
            return false;
        }
    }
}