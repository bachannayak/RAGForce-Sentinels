public with sharing class FrameAnalyzerController {
    
    public static String convertFileToBase64(ContentVersion contentVersion) {    
        return EncodingUtil.base64Encode(contentVersion.VersionData);  
    }
    
    @AuraEnabled
    public static String analyzeFrame(String frameBase64) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('https://tdx-ragforce.loca.lt/analyze-64frame'); // your API URL
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setTimeout(60000);

        // Create JSON body
        Map<String, String> payload = new Map<String, String>();
        payload.put('frame_base64', frameBase64);
        req.setBody(JSON.serialize(payload));

        Http http = new Http();
        try {
            HttpResponse res = http.send(req);
            if (res.getStatusCode() == 200) {
                Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                system.debug('+++'+(String) result.get('message'));
                return (String) result.get('message');
                
            } else {
                throw new AuraHandledException('Error: ' + res.getStatusCode() + ' - ' + res.getBody());
            }
        } catch (Exception e) {
            throw new AuraHandledException('Exception while calling API: ' + e.getMessage());
        }
    }
    @AuraEnabled
    public static String verifyImage(){
        ContentVersion selfieImageBase64 = [  
            SELECT Id, VersionData, Title  
            FROM ContentVersion
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
        System.debug(selfieImageBase64.Title);
        String base64Image = convertFileToBase64(selfieImageBase64);
        String msg = analyzeFrame(base64Image);
        system.debug('masg '+ msg);
        return msg;
        
    }
}