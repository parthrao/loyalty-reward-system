var async = require('async');
var push = require('../../server/web').push;
var dateHelper = require('../../server/helper/date-helper');
var app = require('../../server/server');

module.exports = function(campaign, customers, cb) {
  console.log('do nothing');
  var Customer_Other_Rewards = app.models.Customer_Other_Rewards;
  async.forEach(customers, function(customer, callback) {
    var other_reward = {
      customerId: customer.id,
      activated: true,
      rewardId: campaign.id,
      used: false,
      reward_type: "campaign",
      businessId: campaign.businessId
    };

    Customer_Other_Rewards.create(other_reward, function(err, res) {
      if(err)
        return callback(err);

      callback();
    })
  }, function(err) {
    if(err) {
      console.log('err=', err);
      return;
    }
    console.log('sucess');
    return;
  })
}
