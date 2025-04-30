public class ImageMatchService {
    
    public static String convertFileToBase64(ContentVersion contentVersion) {    
        return EncodingUtil.base64Encode(contentVersion.VersionData);  
    }

    public static void sendImageMatchRequest(ContentVersion idImage, ContentVersion liveImage) {
        String idImageBase64 = convertFileToBase64(idImage);
        String selfieImageBase64 = convertFileToBase64(liveImage);

        // Prepare the payload as JSON

        Map<String, String> payloadMap = new Map<String, String>{

            'id_image_base64' => idImageBase64,

            'selfie_base64' => selfieImageBase64

        };

        String payloadJSON = JSON.serialize(payloadMap);

        Http http = new Http();

        HttpRequest request = new HttpRequest();

        // Replace with your actual endpoint

        String API_URL = 'https://tdx-ragforce.loca.lt/verify-64face'; 

        request.setEndpoint(API_URL);

        request.setMethod('POST');

        request.setHeader('Content-Type', 'application/json');

        request.setBody(payloadJSON);

        try {

            HttpResponse response = http.send(request);

            if (response.getStatusCode() == 200) {
                system.debug('response: '+response);

                Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(response.getBody());
				system.debug(result);
                if (result.containsKey('error')) {

                    System.debug('Error: ' + result.get('error'));

                } else {

                    System.debug('Match: ' + result.get('match'));

                    System.debug('Similarity: ' + result.get('similarity') + '%');

                    System.debug('Message: ' + result.get('message'));

                }
            

            } else {

                System.debug('Server returned status code: ' + response.getStatusCode());

            }

        } catch (Exception e) {

            System.debug('Request failed: ' + e.getMessage());

        }

    }


    @AuraEnabled
    public static Id getContentVersion(String resumeId) {

    ContentDocumentLink cdl = [Select Id,LinkedEntityId,ContentDocumentId from ContentDocumentLink where LinkedEntityId =:resumeId limit 1];
    ContentVersion doc = [SELECT Id, Title, VersionData, ContentDocumentId FROM ContentVersion WHERE ContentDocumentId=:cdl.ContentDocumentId and IsLatest = True];
    return doc.id; 

  }


    @AuraEnabled
    public static String verifyUserImages(Id idImageContentId, Id liveImageContentId) {
    try {
        ContentVersion idImage = [
            SELECT VersionData, Title FROM ContentVersion WHERE Id = :idImageContentId LIMIT 1
        ];
        ContentVersion liveImage = [
            SELECT VersionData, Title FROM ContentVersion WHERE Id = :liveImageContentId LIMIT 1
        ];

        sendImageMatchRequest(idImage, liveImage);
        return 'Verification sent';
    } catch (Exception ex) {
        return 'Error: ' + ex.getMessage();
    }
    }

    
    public static void test_method(){
        ContentVersion idImageBase64 = [  
            SELECT VersionData, Title  
            FROM ContentVersion  
            LIMIT 1 
        ];
        system.debug('idImageBase64 '+idImageBase64.Title);
        //String idImage = convertFileToBase64(idImageBase64);
        //System.debug('idImage: '+idImage);
        
        ContentVersion selfieImageBase64 = [  
            SELECT VersionData, Title  
            FROM ContentVersion  
            LIMIT 1
        ];
        system.debug('selfieImageBase64 '+selfieImageBase64.Title);
        //String liveImage = convertFileToBase64(selfieImageBase64);
        //System.debug('liveImage: '+liveImage);
        sendImageMatchRequest(idImageBase64, selfieImageBase64);
        
        
    }

}