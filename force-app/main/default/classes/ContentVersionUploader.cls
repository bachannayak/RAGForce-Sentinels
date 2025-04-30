/**
* @File Name : ContentVersionUploader.cls
* @Description : This class uploades all the files to content version
* @Author : Roshni Sharma
* @Last Modified By : RAGForce Sentinels
* @Last Modified On : April 29, 2025
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | April 29, 2025 |   | Initial Version
**/

public with sharing class ContentVersionUploader {

    @AuraEnabled
    public static String uploadImage(String base64Image, Id recordId) {
        try {
            if (base64Image.startsWith('data:image/jpeg;base64,')) {
                base64Image = base64Image.replace('data:image/jpeg;base64,', '');
            }

            ContentVersion contentVersion = new ContentVersion();
            contentVersion.Title = 'CapturedImage_' + System.currentTimeMillis();
            contentVersion.PathOnClient = 'captured_image.jpg';
            contentVersion.VersionData = EncodingUtil.base64Decode(base64Image);
            insert contentVersion;

            ContentVersion insertedVersion = [
                SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :contentVersion.Id LIMIT 1
            ];

            ContentDocumentLink cdl = new ContentDocumentLink();
            cdl.ContentDocumentId = insertedVersion.ContentDocumentId;
            cdl.LinkedEntityId = recordId;
            cdl.ShareType = 'V';
            cdl.Visibility = 'AllUsers';
            insert cdl;

            return insertedVersion.ContentDocumentId;
        } catch (Exception e) {
            throw new AuraHandledException('Error uploading image: ' + e.getMessage());
        }
    }
}