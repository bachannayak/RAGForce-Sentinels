/**
* @File Name : SchedulerAgentInvoker.cls
* @Description :
* @Author :
* @Last Modified By :
* @Last Modified On : April 30, 2025
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | April 30, 2025 |   | Initial Version
**/

public class SchedulerAgentInvoker {
	@AuraEnabled
	public static void LightningStudio(){
		System.debug('Lightning Studio');
	}
}