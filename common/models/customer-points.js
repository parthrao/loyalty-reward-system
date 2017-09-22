var async = require('async');

module.exports = function(CustomerPoints) {
  CustomerPoints.observe('before save', function filterProperties(ctx, next) {
    if(ctx.isNewInstance) {
      ctx.instance.created = Date.now();
      next();
    }
    else {
      next();
    }
  });

  CustomerPoints.prototype.addPoints = function(points, cb) {
    this.balance += points;
    this.save(cb);
  }

  CustomerPoints.prototype.redeem = function(points, cb) {
    this.balance -= points;
    this.save(cb);
  }

  CustomerPoints.redeemPoints = function(id, data, cb) {
    var customer_points;
    var Customer = CustomerPoints.app.models.Customer;
    var storeId = data.storeId;
    var redemption_menuId = data.business_redemption_menuId;
    var Business_Redemption_Menu = CustomerPoints.app.models.Business_Redemption_Menu;
    var redemption_menuItem;
    // console.log('inside reddempoints ==', data);
    CustomerPoints.findById(id, function(err, doc) {
      if(err || !doc)
        return cb(err, doc);

      customer_points = doc;
      // console.log('inside reddempoints 2==', doc);
      if(customer_points.balance == 0) {
          return cb(new Error('Customer has no points to avail this offer.'))
      }

      async.series([
        function(callback) {
          Business_Redemption_Menu.findById(redemption_menuId, function(err, menuItem) {
            if(err || ! menuItem)
              return callback(err);

            if(menuItem.points > customer_points.balance)
              return callback(new Error('Customer does not have sufficient points to avail this offer.'));

            redemption_menuItem = menuItem;
            // console.log('inside reddempoints 3==', menuItem);
            callback();
          });
        },

        function(callback) {
          async.parallel([
            function(callback2) {
              customer_points.redeem(redemption_menuItem.points, function(err, customerPoints) {
                if(err || !customerPoints)
                  return callback2(err);

                // console.log('inside reddempoints 4==', customerPoints);
                customer_points = customerPoints;
                callback2();
              })
            },
            function(callback2) {
              Customer.findById(customer_points.customerId, function(err, customer) {
                if(err || !customer)
                  return callback2(err);

                var data = {
                  customerId: customer.id,
                  businessId: customer_points.businessId,
                  action: 'redeem',
                  points: redemption_menuItem.points,
                  storeId: storeId,
                  business_redemption_menuID: redemption_menuItem.id
                };

                customer.customer_reward_history.create(data, function(err, history) {
                  if(err || !history)
                   return callback2(err);

                  callback2();
                });
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

        cb(null, 'success');
      });

    });
  }

  CustomerPoints.remoteMethod(
    'redeemPoints',
    {
      http: {path: '/:id/redeem', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'data', type: 'object', http: { source: 'body' }, required: true},
      ],
      returns: {arg: 'result', type: 'string'},
      description: ["Call this to redeem customer's points, ",
        "provide storeId and business_redemption_menuId in body."]
    }
  );
};
