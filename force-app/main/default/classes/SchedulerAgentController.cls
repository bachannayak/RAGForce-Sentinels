public with sharing class SchedulerAgentController {
    @AuraEnabled
    public static String invokeAgent(String userMessage) {
        try {
         
           // Create an instance of the invocable action with type ‘generateAiAgentResponse’ and name ‘Agentforce_Service_Agent_new’
           Invocable.Action action = Invocable.Action.createCustomAction('generateAiAgentResponse', 'Scheduler_Agent');
          
           action.setInvocationParameter('userMessage', userMessage);
          
           // Execute the action
           List<Invocable.Action.Result> results = action.invoke();
           Invocable.Action.Result result = results[0];

           // Handle the response
           if (result.isSuccess()) {
               // Retrieve the Session id and Agent Response
               System.debug('Output Session Id: ' + result.getOutputParameters().get('sessionId'));
               System.debug('Output Agent Response: ' + result.getOutputParameters().get('agentResponse'));

           } else {
               System.debug('Java action execution failed: ' + result.getErrors());
           }
            return JSON.serialize(result.getOutputParameters().get('agentResponse'));
       } catch (Exception e) {
           System.debug('Error invoking Java action: ' + e.getMessage());
           return 'Error in fetching response from agent';
       }
        
    }
    
    /*private static String callExistingSchedulerAgent(String userMessage, List<Map<String, String>> context) {
        // TODO: Replace with your actual agent invocation logic
        // This should call your existing Scheduler Agent in your org
        // For example:
        // return YourExistingAgentClass.invoke(userMessage, context);
        
        // For now, return a placeholder response
        return 'Scheduler Agent: I received your message: "' + userMessage + '". How can I help you with scheduling?';
    }*/
}