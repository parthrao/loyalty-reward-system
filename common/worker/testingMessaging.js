var pushNotifications = require('../../server/helper/push-notifications');

module.exports.sendMessages = function(customerId, businessId, message) {
  console.log('sending message', customerId, businessId, message);
  return {success:true};


}
