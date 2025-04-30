/**
* @File Name : InvokeAgent.cls
* @Description : This class handles all the functionalities of Onboarding agent
* @Author : Roshni Sharma
* @Last Modified By : RAGForce Sentinels
* @Last Modified On : April 29, 2025
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | April 29, 2025 |   | Initial Version
**/

public with sharing class InvokeAgent {
    @AuraEnabled
    public static String invokeAgentResponse(String userMessage, String feedback) {
        try {
            String fullMessage = userMessage;
            if (String.isNotBlank(feedback)) {
                fullMessage = 'Interview Feedback: ' + feedback + '\n\nUser Message: ' + userMessage;
            }
            
            Invocable.Action action = Invocable.Action.createCustomAction('generateAiAgentResponse', 'Agent_for_Setup');
            action.setInvocationParameter('userMessage', fullMessage);
            List<Invocable.Action.Result> results = action.invoke();
            Invocable.Action.Result result = results[0];
            // Get the response from the result
            Map<String, Object> outputParameters = result.getOutputParameters();
            return (String)outputParameters.get('response');
        } catch (Exception e) {
            throw new AuraHandledException('Error invoking agent: ' + e.getMessage());
        }
    }
}