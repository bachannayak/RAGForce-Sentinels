public with sharing class MCPChatController {

    @AuraEnabled(cacheable=false)

    public static Map<String, Object> getMCPChatResponse(String userQuery) {


        Http http = new Http();

        HttpRequest request = new HttpRequest();

        request.setEndpoint('https://tdx-ragforce.loca.lt/mcpchat'); // Change if hosted elsewhere

        request.setMethod('POST');

        request.setTimeout(60000); // 60 seconds

        // Set headers

        request.setHeader('Content-Type', 'application/json');

        // Prepare JSON body

        Map<String, Object> requestBody = new Map<String, Object>();

        requestBody.put('user_query', userQuery);

        String body = JSON.serialize(requestBody);

        request.setBody(body);
			Map<String, Object> messageMap = new Map<String, Object>();
            HttpResponse response = http.send(request);
		
            if (response.getStatusCode() == 200) {

                Map<String, Object> responseBody = (Map<String, Object>) JSON.deserializeUntyped(response.getBody());
                system.debug('responseBody'+responseBody);
                messageMap = (Map<String, Object>) responseBody.get('message');
				system.debug('messageMap'+messageMap);
                

                

            } 
			return messageMap;
        } 

    }