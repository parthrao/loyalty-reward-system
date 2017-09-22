var async = require('async');

module.exports = function(CustomerOtherRewards) {
  CustomerOtherRewards.observe('before save', function filterProperties(ctx, next) {
    if(ctx.isNewInstance) {
      ctx.instance.created = Date.now();
      next();
    }
    else {
      next();
    }
  });

  CustomerOtherRewards.prototype.redeem = function(cb) {
    this.used = true;
    this.used_ts = Date.now();
    this.save(cb);
  }

  CustomerOtherRewards.redeemOffer = function(id, data, cb) {
    var reward;
    var Customer = CustomerOtherRewards.app.models.Customer;
    var storeId = data.storeId;

    CustomerOtherRewards.findById(id, function(err, doc) {
      if(err || !doc)
        return cb(err, doc);

      reward = doc;

      if(reward.used) {
          return cb(new Error('this reward has already been redeemed.'))
      }

      async.parallel([
        function(callback) {
          doc.redeem(function(err, otherReward) {
            if(err || !otherReward)
              return callback(err);

            reward = otherReward;
            callback();
          })
        },
        function(callback) {
          Customer.findById(reward.customerId, function(err, customer) {
            if(err || !customer)
              return callback(err);

            var data = {
              customerId: customer.id,
              businessId: reward.businessId,
              action: 'redeem',
              points: 'none',
              rewardId: reward.rewardId,
              storeId: storeId,
            };

            customer.customer_reward_history.create(data, function(err, history) {
              if(err || !history)
               return callback(err);

              callback();
            });
          });
        }
      ], function(err) {
        if(err)
          return cb(err);

        cb(null, 'success');
      })

    });
  }

  CustomerOtherRewards.remoteMethod(
    'redeemOffer',
    {
      http: {path: '/:id/redeem', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'data', type: 'object', http: { source: 'body' }, required: true},
      ],
      returns: {arg: 'result', type: 'string'},
      description: ["Call this to redeem customer's coupon, ",
        "provide storeId in body."]
    }
  );

};
