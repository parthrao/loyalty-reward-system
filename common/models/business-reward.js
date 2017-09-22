var async = require('async');
var _ = require('lodash');

module.exports = function(BusinessReward) {
  BusinessReward.observe('before save', function filterProperties(ctx, next) {
    if(ctx.isNewInstance) {
      ctx.instance.created = Date.now();
      next();
    }
    else {
      next();
    }
  });

  BusinessReward.redeemReward = function(id, data, cb) {
    var customer_points;
    var rewardItem;
    var storeId = data.storeId;
    var rewardId = id;
    var customerId = data.customerId;
    var businessId = data.businessId;
    // var Business_Redemption_Menu = Business.app.models.Business_Redemption_Menu;
    var Customer = BusinessReward.app.models.Customer;
    var Business = BusinessReward.app.models.Business;
    var Customer_Points = BusinessReward.app.models.Customer_Points;
    var Customer_Other_Rewards = BusinessReward.app.models.Customer_Other_Rewards;
    var Customer_Reward_History = BusinessReward.app.models.Customer_Reward_History;
    var customer;
    var customer_other_rewards;
    var customer_reward_history;

    // console.log('inside reddempoints ==', data);
    Customer_Points.findOne({where:{
        customerId: customerId,
        businessId: businessId
      }}, function(err, doc) {
      if(err)
        return cb(err);
      else if(!doc)
        return cb(new Error('This customer is not a member of this business.'));

      customer_points = doc;
      console.log('inside reddempoints 2==', doc);
      if(customer_points.balance == 0) {
          return cb(new Error('Customer has no points to avail this offer.' + businessId))
      }

      async.series([
        function(callback) {
          BusinessReward.findById(rewardId, function(err, rewardInstance) {
            if(err || ! rewardInstance)
              return callback(err);

            if(rewardInstance.points > customer_points.balance)
              return callback(new Error('Customer does not have sufficient points to avail this offer.'));

            rewardItem = rewardInstance;
            // console.log('inside reddempoints 3==', menuItem);
            callback();
          });
        },

        function(callback) {
          async.parallel([
            function(callback2) {
              customer_points.redeem(rewardItem.points, function(err, customerPoints) {
                if(err || !customerPoints)
                  return callback2(err);

                // console.log('inside reddempoints 4==', customerPoints);
                customer_points = customerPoints;
                callback2();
              })
            },
            function(callback2) {
              var data = {
                customerId: customerId,
                businessId: businessId,
                action: 'redeem',
                points: rewardItem.points,
                storeId: storeId,
                rewardId: rewardId
              };
              Customer_Reward_History.create(data, function(err, instance) {
                if(err)
                  return callback2(err);
                else if(!instance)
                  return callback2(new Error('Not able to create customer_reward_history due to some issue.'));

                customer_reward_history = instance;
                callback2();
              });
            },

            function(callback2) {
              var data = {
                customerId: customerId,
                businessId: businessId,
                used: true,
                used_ts: Date.now(),
                rewardId: rewardId
              };
              Customer_Other_Rewards.create(data, function(err, instance) {
                if(err)
                  return callback2(err);
                else if(!instance)
                  return callback2(new Error('Not able to create customer_other_reward due to some issue.'));

                customer_other_rewards = instance;
                callback2();
              });
            }
          ], function(err) {
            if(err)
              return callback(err);

            callback();
          });
        }
      ], function(err) {
        if(err)
          return cb(err);

        var response = {
          status: 'success',
          rewardId: rewardId
        }
        cb(null, response);
      });

    });
  }

  BusinessReward.remoteMethod(
    'redeemReward',
    {
      http: {path: '/:id/redeem', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'data', type: 'object', required: true, http: {source: 'body'}},
      ],
      returns: {arg: 'response', type: 'object', root: true},
      description: "customerId,storeId, businessId required."
    }
  );

};
