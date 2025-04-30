/**
* @File Name : TranslationUtil.cls
* @Description : GPT-powered translation utility
* @Author :
* @Last Modified By :
* @Last Modified On : April 29, 2025
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | April 29, 2025 |   | Initial Version
**/

public class TranslationUtil {
    public static String translateText(String text, String targetLang) {
        try {
            HttpRequest req = new HttpRequest();
            req.setEndpoint('https://api.openai.com/v1/chat/completions');
            req.setMethod('POST');
            req.setHeader('Content-Type', 'application/json');
            req.setHeader('Authorization', 'Bearer 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'); // Masked for security
            req.setTimeout(10000);

            Map<String, Object> payload = new Map<String, Object>{
                'model' => 'gpt-3.5-turbo',
                'messages' => new List<Object>{
                    new Map<String, String>{
                        'role' => 'system',
                        'content' => 'You are a translator. Translate the following English text to ' + targetLang + '.'
                    },
                    new Map<String, String>{
                        'role' => 'user',
                        'content' => text
                    }
                },
                'temperature' => 0.3
            };

            req.setBody(JSON.serialize(payload));

            Http http = new Http();
            HttpResponse res = http.send(req);

            System.debug('GPT request: ' + req.getBody());
            System.debug('GPT response: ' + res.getBody());
            System.debug('GPT status: ' + res.getStatusCode());

            if (res.getStatusCode() == 200) {
                Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                List<Object> choices = (List<Object>) result.get('choices');
                if (!choices.isEmpty()) {
                    Map<String, Object> choice = (Map<String, Object>) choices[0];
                    Map<String, Object> message = (Map<String, Object>) choice.get('message');
                    return (String) message.get('content');
                }
            } else {
                System.debug('Translation failed: ' + res.getBody());
            }
        } catch (Exception e) {
            System.debug('Translation error: ' + e.getMessage());
        }
        return text; // fallback to original
    }

    public static void debugTranslation(String targetLang, String originalResponse, String translatedResponse) {
        System.debug('targetLang received: ' + targetLang);
        System.debug('Original response: ' + originalResponse);
        System.debug('Translated response: ' + translatedResponse);
    }
}