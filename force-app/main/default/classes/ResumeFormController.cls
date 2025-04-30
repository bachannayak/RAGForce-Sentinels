public with sharing class ResumeFormController {
   @AuraEnabled
public static Id createResumeRecord(String fullName, String email, Double phone, Integer experience,
                                   String location, String linkedin, String role, String summary,
                                   String primarySkills, String secondarySkills, Boolean willingToRelocate,
                                   Decimal expectedSalary, String education, String workExperience) {
   Resume__c resume = new Resume__c(
       Full_Name__c = fullName,
       Email__c = email,
       Phone__c = phone,
       Year_of_Experience__c = experience,
       Preferred_Location__c = location,
       LinkedIn_URL__c = linkedin,
       Job_Role__c = role,
       Summary__c = summary,
       Primary_Skills__c = primarySkills,
       Secondary_Skills__c = secondarySkills,
       Willing_to_Relocate__c = willingToRelocate,
       Expected_Salary__c = expectedSalary,
       Education__c = education,
       Work_Experience__c = workExperience
   );
   insert resume;
   return resume.Id;
}
}