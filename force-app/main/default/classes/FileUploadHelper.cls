public class FileUploadHelper {
    @AuraEnabled
    public static Id saveBase64ToContentVersion(String base64Data, String fileName) {
        ContentVersion cv = new ContentVersion();
        cv.VersionData = EncodingUtil.base64Decode(base64Data);
        cv.Title = fileName;
        cv.PathOnClient = fileName;
        insert cv;
        return cv.Id;
    }
}