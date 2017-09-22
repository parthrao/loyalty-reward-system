var modelUtils = require('../../server/utils/modelUtils');
var async = require('async');
var _ = require('lodash');
var speakeasy = require('speakeasy');
var sendSms = require('../../server/utils/sendSMS');
var dateHelper = require('../../server/helper/date-helper');

module.exports = function(Business) {
  // Clears base USER model's ACLs and allow Admin to set it's own ACLs
  modelUtils.clearBaseACLs(Business, require('./business.json'));

  // Validate uniqueness of email, phone and name
  Business.validatesUniquenessOf('email');
  Business.validatesUniquenessOf('name');
  Business.validatesUniquenessOf('phone');

  // Set created Date
  Business.observe('before save', function filterProperties(ctx, next) {
    if(ctx.isNewInstance) {
      ctx.instance.created = Date.now();
      next();
    }
    else {
      next();
    }
  });

  Business.SetLoyaltyPointsOnVisit = function (businessId, points_per_visit, cb) {
    var business;

    if (points_per_visit !== parseInt(points_per_visit, 10) || points_per_visit.toString().indexOf('-') !== -1)
      return cb(new Error('points_per_visit should be a valid integer.'));

    Business.findById(businessId, function (error, instance) {
      if(error || !instance)
        return cb(error);

      business = instance;
      business.points_per_visit = points_per_visit;
      business.save(function(err, instance) {
        if(err || !instance) {
          return cb(err);
        }

        cb(null, instance);
      })
    })
  }

  Business.remoteMethod(
    'SetLoyaltyPointsOnVisit',
    {
      http: {path: '/:id/loyalty_points_on_visit', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'points_per_visit', type: 'number', required: true},
      ],
      returns: {arg: 'data', type: 'object'}
    }
  );

  Business.SetRedeemRate = function (businessId, redeem_rate, cb) {
    var business;

    if(redeem_rate.toFixed(2).indexOf('-') !== -1) {
      return cb(new Error('redeem_rate should be a valid positive number.'));
    }

    if (Number(redeem_rate.toFixed(2)) !== parseFloat(redeem_rate, 10))
      return cb(new Error('redeem_rate should be a valid float number which can have upto 2 digits after decimal points.'));

    Business.findById(businessId, function (error, instance) {
      if(error || !instance)
        return cb(error);

      business = instance;
      business.redeem_rate = redeem_rate;
      business.save(function(err, instance) {
        if(err || !instance) {
          return cb(err);
        }

        cb(null, instance);
      })
    })
  }

  Business.remoteMethod(
    'SetRedeemRate',
    {
      http: {path: '/:id/loyalty_redeem_rate', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'redeem_rate', type: 'number', required: true},
      ],
      returns: {arg: 'data', type: 'object'}
    }
  );

  Business.SetMinimumSpendPerPoint = function (businessId, minimum_spend_per_point, cb) {
    var business;

    if (minimum_spend_per_point !== parseInt(minimum_spend_per_point, 10) || minimum_spend_per_point.toString().indexOf('-') !== -1)
      return cb(new Error('minimum_spend_per_point should be a valid integer.'));

    Business.findById(businessId, function (error, instance) {
      if(error || !instance)
        return cb(error);

      business = instance;
      business.minimum_spend_per_point = minimum_spend_per_point;
      business.save(function(err, instance) {
        if(err || !instance) {
          return cb(err);
        }

        cb(null, instance);
      })
    })
  }

  Business.remoteMethod(
    'SetMinimumSpendPerPoint',
    {
      http: {path: '/:id/loyalty_minimum_spend_per_point', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'minimum_spend_per_point', type: 'number', required: true},
      ],
      returns: {arg: 'data', type: 'object'}
    }
  );

  Business.KioskLogin = function (credentials, cb) {
    var admin;
    var Admin = Business.app.models.Admin;
    var filter;
    // check all keys are present in the credentials or not
    if(credentials.hardwareId == null)
      return cb(new Error('hardwareId not present in credentials. Please provide valid hardwareId'));

    if(credentials.email != null)
    {
      filter = {email: credentials.email};
    }
    else if(credentials.username != null)
    {
      filter = {username: credentials.username};
    }
    else {
      return cb(new Error('No username or email provided. Please provide one of them.'))
    }
    Admin.findOne({where: filter}, function(err, user) {
      if (err) {
        return cb(err);
      }
      if (!user) {
        err = new Error('Email not found');
        err.statusCode = 404;
        err.code = 'EMAIL_NOT_FOUND';
        return cb(err);
      }

      if(user.hardwareId !== credentials.hardwareId)
        return cb(new Error('Incorrect hardwareId. Provide the correct one.'))

      var admin = user;

      Admin.login({
         email: credentials.email,
         password: credentials.password,
         username: credentials.username
        }, 'user', function(err, token) {
          if (err)
            return cb(err);

          var response = {
            businessId: admin.businessId,
            userId: admin.id,
            id: token.id,
            storeId: admin.storeId,
            username: admin.username,
            hardwareId: admin.hardwareId,
            ttl: token.ttl
          };

          cb(null, response);
       });

    });
    // Login with necessary credentials

  }

  Business.remoteMethod(
    'KioskLogin',
    {
      http: {path: '/loyalty_kiosk_login', verb: 'post'},
      accepts: [
        {arg: 'credentials', type: 'object', required: true, http: {source: 'body'}},
      ],
      returns: {arg: 'data', type: 'string', root: true},
      description: "provide these fields: email,username,hardwareId,password "
    }
  );

  Business.MemberJoin = function (businessId, storeId, phone, countryCode, name, cb) {
    var customer;
    var Customer = Business.app.models.Customer;
    var Member = Business.app.models.Member;
    var Store = Business.app.models.Store;

    Business.findById(businessId, function(err, business) {
      if(err)
        return cb(err);
      else if(!business)
        return cb(new Error ('businessId is not valid. Please provide valid businessId.'));

      Store.findById(storeId, function(err, store) {
        if(err)
          return cb(err);
        else if(!store)
          return cb(new Error ('sotreId is not valid. Please provide valid storeId.'));
        else if(JSON.stringify(store.businessId) !== JSON.stringify(businessId))
          return cb(new Error ('sotre does not belong to this business.'));

        if(!name)
          name = phone;
        var tempCustomer = {
          phone: phone,
          password: phone,
          countryCode: countryCode,
          name: name
        };

        Customer.findOrCreate ({where: {phone: phone}}, tempCustomer, function(err, instance, created) {
          if(err)
            return cb(err);
          if(created)
            console.log('inside created');

            // business.customers.add(instance, function(err, member) {
            //   if(err || !member)
            //     return cb(err);
            //
            //   cb(null, member);
            // });

            var data = {
              customerId: instance.id,
              businessId: businessId,
              storeId: storeId
            };
            Member.join(data, function(err, member) {
              if(err || !member)
                return cb(err);

              cb(null, member);
            })
        });
      });
    });


  }

  Business.remoteMethod(
    'MemberJoin',
    {
      http: {path: '/:id/loyalty_member_join', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'storeId', type: 'string', required: true},
        {arg: 'phone', type: 'string', required: true},
        {arg: 'countryCode', type: 'string', required: true},
        {arg: 'name', type: 'string'}

      ],
      returns: {arg: 'data', type: 'object', root: true},
      description: "provide these fields: phone,storeId,businessId. Only store_admin with valid auth_token can do this request."
    }
  );

  Business.MemberLogin = function (businessId, storeId, phone, cb) {
    var customer;
    var business;
    var store;
    var Customer = Business.app.models.Customer;
    var Store = Business.app.models.Store;
    var Member = Business.app.models.Member;

    async.parallel([
      function(callback) {
        Business.findById(businessId, function(err, instance) {
          if(err)
            return callback(err);
          else if(!instance)
            return callback(new Error ('businessId is not valid. Please provide valid businessId.'));

          business = instance;
          callback();
        });
      },

      function(callback) {
        Store.findById(storeId, function(err, instance) {
          store = instance;
          if(err)
            return cb(err);
          else if(!instance)
            return callback(new Error ('sotreId is not valid. Please provide valid storeId.'));
          else if(JSON.stringify(store.businessId) !== JSON.stringify(businessId))
            return callback(new Error ('sotre does not belong to this business.'));

          callback();
        });
      },
    ], function(err) {
      if(err)
        return cb(err);

      business.customers({where: {phone: phone}}, function(err, customers) {
        if(err)
          return cb(err);
        else if(!customers || customers.length == 0)
          return cb(new Error('This customers is not a member of this club.'));
          console.log('goindg in returning function');
        // After checking all conditions now gather the required data asynchronously and send it back
        sendCustomerLoginData(business, store, customers[0], cb);
      });
    });
  }

  var sendCustomerLoginData = function(business, store, customer, cb) {
    var Member = Business.app.models.Member;
    var Customer_Points = Business.app.models.Customer_Points;
    var Customer_Reward_History = Business.app.models.Customer_Reward_History;
    var Customer_Other_Rewards = Business.app.models.Customer_Other_Rewards;
    var member;
    var customer_points;
    var customer_reward_history;
    var customer_coupons;

    async.parallel([
      function(callback) {
        Member.findOne({where: {
            businessId: business.id,
            customerId: customer.id
          }}, function(err, memberInstance) {
          if(err)
            return callback(err);
          else if(!memberInstance)
            return callback(new Error('This customers is not a member of this club.'));

          member = memberInstance;
          callback();
        });
      },

      function(callback) {
        Customer_Points.findOne({where: {
            businessId: business.id,
            customerId: customer.id
          }}, function(err, pointInstance) {
          if(err)
            return callback(err);
          else if(!pointInstance)
            pointInstance = {balance: 0}

          customer_points = pointInstance;
          callback();
        });
      },

      function(callback) {
        Customer_Reward_History.find({where: {
            businessId: business.id,
            customerId: customer.id
          }}, function(err, histories) {
          if(err)
            return callback(err);
          else if(!histories || histories.length == 0)
            histories = [];

          customer_reward_history = histories;
          callback();
        });
      },

      function(callback) {
        Customer_Other_Rewards.find({where: {
            businessId: business.id,
            customerId: customer.id
          }}, function(err, rewards) {
          if(err)
            return callback(err);
          else if(!rewards || rewards.length == 0)
            rewards = [];

          customer_coupons = rewards;
          callback();
        });
      }
    ], function(err) {
      if(err)
        return cb(err);

      var response = {
        membership: member,
        point_balance: customer_points.balance,
        customer_reward_history: customer_reward_history,
        customer_coupons: customer_coupons,
        storeId: store.id,
        businessId: business.id,
        points_per_visit: business.points_per_visit,
        customerId: customer.id,
        customer_points: customer_points,
      }
      console.log('passing repsonse to something ', response);
      response = _.omit(response, ['points_per_visit', 'customerId', 'customer_points']);
      cb(null, response);
    });
  }

  Business.remoteMethod(
    'MemberLogin',
    {
      http: {path: '/:id/loyalty_member_login', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'storeId', type: 'string', required: true},
        {arg: 'phone', type: 'string', required: true}
      ],
      returns: {arg: 'data', type: 'object', root: true},
      description: "provide these fields: phone,storeId,businessId. Only store_admin with valid auth_token can do this request."
    }
  );

  Business.EarnVisitPoints = function (businessId, storeId, customerId, billed_amount, cb) {
    var customer;
    var business;
    var store;
    var Customer = Business.app.models.Customer;
    var Store = Business.app.models.Store;
    var Member = Business.app.models.Member;

    async.parallel([
      function(callback) {
        Business.findById(businessId, function(err, instance) {
          if(err)
            return callback(err);
          else if(!instance)
            return callback(new Error ('businessId is not valid. Please provide valid businessId.'));

          business = instance;
          callback();
        });
      },

      function(callback) {
        Store.findById(storeId, function(err, instance) {
          store = instance;
          if(err)
            return cb(err);
          else if(!instance)
            return callback(new Error ('sotreId is not valid. Please provide valid storeId.'));
          else if(JSON.stringify(store.businessId) !== JSON.stringify(businessId))
            return callback(new Error ('sotre does not belong to this business.'));

          callback();
        });
      },
    ], function(err) {
      if(err)
        return cb(err);

      business.customers.findById(customerId, function(err, customer) {
        if(err)
          return cb(err);
        else if(!customer)
          return cb(new Error('This customers is not a member of this club.'));
          console.log('goindg in returning function');
        // After checking all conditions now gather the required data asynchronously and send it back
        sendCustomerEarnPointData(business, store, customer, billed_amount, cb);
      });
    });
  }

  var sendCustomerEarnPointData = function(business, store, customer, billed_amount, cb) {
    var Member = Business.app.models.Member;
    var Customer_Points = Business.app.models.Customer_Points;
    var Customer_Reward_History = Business.app.models.Customer_Reward_History;
    var Customer_Other_Rewards = Business.app.models.Customer_Other_Rewards;
    var member;
    var customer_points;
    var customer_reward_history;
    var customer_coupons;

    async.parallel([
      function(callback) {
        Member.findOne({where: {
            businessId: business.id,
            customerId: customer.id
          }}, function(err, memberInstance) {
          if(err)
            return callback(err);
          else if(!memberInstance)
            return callback(new Error('This customers is not a member of this club.'));

          member = memberInstance;
          callback();
        });
      },

      function(callback) {
        Customer_Points.findOne({where: {
            businessId: business.id,
            customerId: customer.id
          }}, function(err, pointInstance) {
          if(err)
            return callback(err);
          else if(!pointInstance)
            pointInstance = {balance: 0}

          customer_points = pointInstance;
          callback();
        });
      },

      function(callback) {
        Customer_Reward_History.find({where: {
            businessId: business.id,
            customerId: customer.id
          }}, function(err, histories) {
          if(err)
            return callback(err);
          else if(!histories || histories.length == 0)
            histories = [];

          customer_reward_history = histories;
          callback();
        });
      },

      function(callback) {
        Customer_Other_Rewards.find({where: {
            businessId: business.id,
            customerId: customer.id
          }}, function(err, rewards) {
          if(err)
            return callback(err);
          else if(!rewards || rewards.length == 0)
            rewards = [];

          customer_coupons = rewards;
          callback();
        });
      }
    ], function(err) {
      if(err)
        return cb(err);

      var response = {
        membership: member,
        point_balance: customer_points.balance,
        customer_reward_history: customer_reward_history,
        customer_coupons: customer_coupons,
        storeId: store.id,
        businessId: business.id,
        points_per_visit: business.points_per_visit,
        customerId: customer.id,
        customer_points: customer_points,
        billed_amount: billed_amount
      }
      console.log('passing repsonse to something ', response);
      cb(null, response);
    });
  }

  Business.afterRemote('EarnVisitPoints', function(ctx, data, next) {
    var Customer_Reward_History = Business.app.models.Customer_Reward_History;
    var Customer_Visit = Business.app.models.Customer_Visit;
    // Add points per visit to customer's point-balance and make an entry in customer_reward_history
    async.parallel([
      function(callback) {
        ctx.result.customer_points.addPoints(ctx.result.points_per_visit, function(err, pointInstance) {
          if(err)
            return callback(err);
          else if(!pointInstance)
            return callback(new Error('customer_point instance not found.'));

          ctx.result.customer_points = pointInstance;
          ctx.result.point_balance = pointInstance.balance;
          callback();
        });
      },

      function(callback) {
        var history = {
          points: ctx.result.points_per_visit,
          action: 'added',
          desc: 'points per visit',
          businessId: ctx.result.businessId,
          customerId: ctx.result.customerId,
          storeId: ctx.result.storeId
        }
        Customer_Reward_History.create(history, function(err, historyInstance){
          if(err)
            return next(err);
          else if(!historyInstance)
            return next('Error occured while creating reward_history.');

          ctx.result.customer_reward_history.push(historyInstance);
          callback();
        });
      },

      function(callback) {
        var visit = {
          billed_amount: ctx.result.billed_amount,
          businessId: ctx.result.businessId,
          customerId: ctx.result.customerId,
          storeId: ctx.result.storeId
        }
        Customer_Visit.create(visit, function(err, visitInstance){
          if(err)
            return next(err);
          else if(!visitInstance)
            return next('Error occured while creating customer_visit.');

          callback();
        });
      }
    ], function(err) {
      if(err)
        return next(err);

      ctx.result = _.omit(ctx.result, ['points_per_visit', 'customerId', 'customer_points']);
      next();
    })

  });

  Business.remoteMethod(
    'EarnVisitPoints',
    {
      http: {path: '/:id/loyalty_member_earn_point', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'storeId', type: 'string', required: true},
        {arg: 'customerId', type: 'string', required: true},
        {arg: 'billed_amount', type: 'string', required: true}
      ],
      returns: {arg: 'data', type: 'object', root: true},
      description: "provide these fields: customerId,storeId,businessId. Only store_admin with valid auth_token can do this request."
    }
  );

  Business.RedeemPoints = function(businessId, data, cb) {
    var customer_points;
    var rewardItem;
    var storeId = data.storeId;
    var rewardId = data.business_rewardId;
    var customerId = data.customerId;
    // var Business_Redemption_Menu = Business.app.models.Business_Redemption_Menu;
    var Customer = Business.app.models.Customer;
    var Business_Reward = Business.app.models.Business_Reward;
    var Customer_Points = Business.app.models.Customer_Points;
    var Reward_OTP_Request = Business.app.models.Reward_OTP_Request;
    var otp;
    var customer;
    var reward_otp_request;

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
          Business_Reward.findById(rewardId, function(err, rewardInstance) {
            if(err || ! rewardInstance)
              return callback(err);

            if(rewardInstance.points > customer_points.balance)
              return callback(new Error('Customer does not have sufficient points to avail this offer.'));

            rewardItem = rewardInstance;
            if(rewardItem.points == null) {
              return callback(new Error('This reward has no points to be redeemed.'));
            }
            // console.log('inside reddempoints 3==', menuItem);
            callback();
          });
        },

        function(callback) {
            Customer.findById(customerId, function(err, cInstance) {
              if(err)
                return callback(err);
              else if(!cInstance)
                return callback(new Error('No Customer found with this id'));

              customer = cInstance;
              customer.generateOtp(function(err, token) {
                if(err)
                  return callback(err);

                otp = token;
                callback();
              })
            });
        },

        function(callback) {
          async.parallel([
            // function(callback2) {
            //   customer_points.redeem(rewardItem.points, function(err, customerPoints) {
            //     if(err || !customerPoints)
            //       return callback2(err);
            //
            //     // console.log('inside reddempoints 4==', customerPoints);
            //     customer_points = customerPoints;
            //     callback2();
            //   })
            // },
            function(callback2) {
              var data = {
                customerId: customer.id,
                businessId: customer_points.businessId,
                points: rewardItem.points,
                storeId: storeId,
                rewardId: rewardId
              };


              Reward_OTP_Request.create(data, function(err, request) {
                if(err || !request)
                 return callback2(err);

                 reward_request = request;
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
          reward_otp_requestId: reward_request.id,
          otp: otp
        }
        cb(null, response);
      });

    });
  }

  Business.remoteMethod(
    'RedeemPoints',
    {
      http: {path: '/:id/loyalty_member_request_reward_redeem', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'data', type: 'object', http: { source: 'body' }, required: true},
      ],
      returns: {arg: 'response', type: 'object', root: true},
      description: ["Call this to redeem customer's points, ",
        "provide storeId and business_rewardId and customerId in body."]
    }
  );

  Business.VerifyRewardRedeemOtp = function(businessId, data, cb) {

    var Customer = Business.app.models.Customer;
    var Reward_OTP_Request = Business.app.models.Reward_OTP_Request;
    var Customer_Reward_History = Business.app.models.Customer_Reward_History;
    var Customer_Other_Rewards = Business.app.models.Customer_Other_Rewards;
    var Customer_Points = Business.app.models.Customer_Points;
    var token = data.otp;
    var reward_otp_requestId = data.reward_otp_requestId;
    var customerId = data.customerId;
    var reward_otp_request;
    var customer_reward_history;
    var customer_other_rewards;
    var customer_points;

    Customer.findById(customerId, function(err, cInstance) {
      if(err)
        return cb(err);
      else if(!cInstance)
        return cb(new Error('No customer instance found with this ID'));

      customer = cInstance;
      var tokenValidation = speakeasy.totp.verify({
        secret: customer.temp_secret,
        encoding: 'base32',
        token: token,
        window: 6
      });

      if(!tokenValidation) {
        return cb(new Error('This token is invalid'));
      }
      else {
        Reward_OTP_Request.findById(reward_otp_requestId, function(err, instance) {
          if(err)
            return cb(err);
          else if(!instance)
            return cb(new Error('Incorrect reward_otp_requestId.'));

          reward_otp_request = instance;
          async.parallel ([
            function(callback) {
              Customer_Points.find({where: {
                customerId: reward_otp_request.customerId,
                businessId: reward_otp_request.businessId
              }}, function(err, points) {
                if(err)
                  return callback(err);
                else if(points == null || points.length == 0)
                  return cb(new Error('No point entry for this customerId - businessId combination.'));

                customer_points = points[0];
                customer_points.redeem(reward_otp_request.points, function(err, customerPoints) {
                  if(err || !customerPoints)
                    return callback(err);

                  // console.log('inside reddempoints 4==', customerPoints);
                  customer_points = customerPoints;
                  callback();
                });
              });
            },

            function(callback) {
              var data = {
                customerId: reward_otp_request.customerId,
                businessId: reward_otp_request.businessId,
                action: 'redeem',
                points: reward_otp_request.points,
                storeId: reward_otp_request.storeId,
                rewardId: reward_otp_request.rewardId
              };
              Customer_Reward_History.create(data, function(err, instance) {
                if(err)
                  return callback(err);
                else if(!instance)
                  return callback(new Error('Not able to create customer_reward_history due to some issue.'));

                customer_reward_history = instance;
                callback();
              });
            },

            function(callback) {
              var data = {
                customerId: reward_otp_request.customerId,
                businessId: reward_otp_request.businessId,
                used: true,
                used_ts: Date.now(),
                rewardId: reward_otp_request.rewardId
              };
              Customer_Other_Rewards.create(data, function(err, instance) {
                if(err)
                  return callback(err);
                else if(!instance)
                  return callback(new Error('Not able to create customer_other_reward due to some issue.'));

                customer_other_rewards = instance;
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
    });
  }

  Business.remoteMethod(
    'VerifyRewardRedeemOtp',
    {
      http: {path: '/:id/loyalty_verify_reward_redem_otp', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'data', type: 'object', http: { source: 'body' }, required: true},
      ],
      returns: {arg: 'response', type: 'string', root: true},
      description: ["Verify OTP before redeeming a reward. Provide customerId, otp, reward_otp_requestId fields."]
    }
  );

  Business.UploadCoverPhoto = function(businessId, data, cb) {

  }

  Business.remoteMethod(
    'UploadCoverPhoto',
    {
      http: {path: '/:id/upload_cover', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'data', type: 'object', http: { source: 'body' }, required: true},
      ],
      returns: {arg: 'result', type: 'object', root: true},
      description: ["Uploads cover photo of the business."]
    }
  );

  Business.UploadLogo = function(businessId, data, cb) {

  }

  Business.remoteMethod(
    'UploadCoverLogo',
    {
      http: {path: '/:id/upload_logo', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'data', type: 'object', http: { source: 'body' }, required: true},
      ],
      returns: {arg: 'result', type: 'object', root: true},
      description: ["Uploads cover logo of the business."]
    }
  );

  Business.getAverageRating = function(id, cb) {
    var businessId = id;
    var ReviewAndRatings = Business.app.models.Business_Ratings_Review;
    var average_ratings = 0;
    var number_of_users;

    ReviewAndRatings.find({where: {businessId: businessId}}, function(err, reviews) {
      if(err)
        return cb(err);
      else if(!reviews || reviews.length == 0) {
        var response = {
          average_ratings: 0,
          number_of_users: 0
        }
        return cb(null, response);
      }
      else {
        for(var i = 0 ; i < reviews.length; i++) {
          if(reviews[i].ratings != null)
            average_ratings += reviews[i].ratings;
        }
        average_ratings = average_ratings / reviews.length;

        number_of_users = _.size(_.groupBy(reviews, 'customerId'));
        var response = {
          average_ratings: average_ratings,
          number_of_users: number_of_users
        };
        cb(null, response);
      }
    })
  }

  Business.remoteMethod(
    'getAverageRating',
    {
      http: {path: '/:id/review_and_rating_stats', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required: true}
      ],
      returns: {arg: 'response', type: 'object', root: true},
      description: ["Get Average rating stats."]
    }
  );

  Business.allMembersDetail = function (id, member_type, cb) {
    var Member = Business.app.models.Member;
    var Customer = Business.app.models.Customer;
    var business;
    var members = [];

    Business.findById(id, function(err, result) {
      if(err)
        return cb(err);
      else if(!result)
        return cb(new Error('BusinessId Invalid.'));

      business = result;

      var includeFilter = {
        relation: 'customer', // include the customer object
        scope: { // further filter the customer object
           fields: ['phone', 'email', 'first_name', 'last_name', 'name', 'countryCode', 'id'], // only show two fields
           include: [
             { // include visits for the customer
               relation: 'visits',
               scope: {
                 fields: ['created', 'id'],
                 where: {businessId: business.id} // only select order with id 5
               }
             },
             { // include visits for the customer
               relation: 'points',
               scope: {
                 fields: ['balance'], // only select order with id 5
                 where: {businessId: business.id}
               }
             },
           ]
         },
      };

      var whereFilter;
      if(member_type != null)
      {
        whereFilter = {
          membership_category: member_type,
          businessId: id
        };
      }
      else {
        whereFilter = {
          businessId: id
        };
      }


      Member.find({where: whereFilter, include: includeFilter}, function(err, instances) {
        if(err)
          return cb(err);

        instances.forEach(function(member) {
          member = member.toJSON();
          var balance;
          if(member.customer.points[0] == null)
            balance = 0;
          else {
            balance = member.customer.points[0].balance;
          }
          var temp = {
            first_name: member.customer.first_name,
            last_name: member.customer.last_name,
            phone_no: member.customer.countryCode + member.customer.phone,
            email: member.customer.email,
            member_since: member.created,
            current_balance: balance,
            status: member.membership_category,
            last_visit: member.customer.visits.length != 0 ? member.customer.visits[member.customer.visits.length-1].created : 'No visits yet',
            total_visits: member.customer.visits.length,
            customerId: member.customer.id,
            memberId: member.id
          };
          members.push(temp);
        });
        return cb(null, members);
      });
    });
  }

  Business.remoteMethod(
    'allMembersDetail',
    {
      http: {path: '/:id/all_members_details', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'member_type', type: 'string'},
      ],
      returns: {arg: 'res', type: 'array', root: true},
      description: ["Get all Members detail."]
    }
  );

  Business.listAllActivity = function (id, storeId, cb) {
    var Customer_Reward_History = Business.app.models.Customer_Reward_History;
    var Customer = Business.app.models.Customer;
    var business;
    var histories = [];

    Business.findById(id, function(err, result) {
      if(err)
        return cb(err);
      else if(!result)
        return cb(new Error('BusinessId Invalid.'));

      business = result;

      var includeFilter = {
        relation: 'customer', // include the customer object
        scope: { // further filter the customer object
           fields: ['phone', 'email', 'first_name', 'last_name', 'name', 'countryCode'], // only show two fields
         },
      };

      var whereFilter;
      if(storeId != null)
      {
        whereFilter = {
          storeId: storeId,
          businessId: id
        };
      }
      else {
        whereFilter = {
          businessId: id
        };
      }


      Customer_Reward_History.find({where: whereFilter, include: includeFilter, order: 'created DESC',}, function(err, instances) {
        if(err)
          return cb(err);

        instances.forEach(function(history) {
          history = history.toJSON();

          var temp = {
            first_name: history.customer.first_name,
            last_name: history.customer.last_name,
            phone_no: history.customer.countryCode + history.customer.phone,
            email: history.customer.email,
            activity: history.action,
            points: history.points,
            store_id: history.storeId,
            reward: history.rewardId,
            date_time: history.created
          };
          histories.push(temp);
        });
        return cb(null, histories);
      });
    });
  }

  Business.remoteMethod(
    'listAllActivity',
    {
      http: {path: '/:id/activity_list', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'storeId', type: 'string'},
      ],
      returns: {arg: 'res', type: 'array', root: true},
      description: ["Get all Members detail."]
    }
  );

  Business.getOverviewStatistics = function(id, cb) {
    var Member = Business.app.models.Member;
    var Customer_Visit = Business.app.models.Customer_Visit;
    var business;
    var members;
    var thisWeekMembers;
    var visits;
    var thisWeekVisits;
    var res;

    async.parallel([
      function(callback) {
        Business.findById(id, function(err, result) {
          if(err)
            return callback(err);
          else if(!result)
            return callback(new Error('BusinessId Invalid.'));

          business = result;
          callback();
        });
      },

      function(callback) {
        var whereFilter = {
          businessId: id,
          status: 'active'
        }
        Member.find({where: whereFilter}, function(err, results) {
          if(err)
            return callback(err);
          console.log('members== ', results);
          members = results;
          callback();
        });
      },

      function(callback) {
        var firstDayOfWeek = dateHelper.getFirstDayOfWeek();
        whereFilter = {
          businessId: id,
          status: 'active',
          created: {gte: firstDayOfWeek}
        }
        Member.find({where: whereFilter}, function(err, results) {
          if(err)
            return callback(err);
console.log('weekm== ', results);
          thisWeekMembers = results;
          callback();
        });
      },

      function(callback) {
        var whereFilter = {
          businesId: id
        }

        Customer_Visit.find({where: whereFilter}, function(err, results) {
          if(err)
            return callback(err);
console.log('vis== ', results);
          visits = results;
          callback();
        });
      },

      function(callback) {
        var firstDayOfWeek = dateHelper.getFirstDayOfWeek();
        var whereFilter = {
          businesId: id,
          created: {gte: firstDayOfWeek}
        }

        Customer_Visit.find({where: whereFilter}, function(err, results) {
          if(err)
            return callback(err);
console.log('thv== ', results);
          thisWeekVisits = results;
          callback();
        });
      }
    ],function(err) {
      if(err)
        return cb(err);

      res = {
        total_members: members.length,
        total_visits: visits.length,
        visits_this_week: thisWeekVisits.length,
        new_members_this_week: thisWeekMembers.length
      }

      cb(null, res);
    });
  }

  Business.remoteMethod(
    'getOverviewStatistics',
    {
      http: {path: '/:id/overview_statistics', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required: true}
      ],
      returns: {arg: 'res', type: 'object', root: true},
      description: ["Get overall statistics."]
    }
  );

  Business.getActiveMemberStatistics = function(id, cb) {
    var Member = Business.app.models.Member;
    var Customer_Visit = Business.app.models.Customer_Visit;
    var business;
    var members;
    var newMembers =[];
    var regularMembers = [];
    var vipMembers = [];
    var deactiveMembers = [];
    var thisMonthVIPMembers = [];
    var thisMonthRegularMembers = [];
    var thisMonthNewMembers = [];
    var visits;
    var thisWeekVisits;
    var res;

    async.parallel([
      function(callback) {
        Business.findById(id, function(err, result) {
          if(err)
            return callback(err);
          else if(!result)
            return callback(new Error('BusinessId Invalid.'));

          business = result;
          callback();
        });
      },

      function(callback) {
        var whereFilter = {
          businessId: id
        }
        Member.find({where: whereFilter}, function(err, results) {
          if(err)
            return callback(err);
          members = results;
          for(var i = 0 ; i < members.length ; i++)
          {
            if(members.status == 'active') {
              if(members.membership_category == 'VIP') {
                vipMembers.push(members[i]);
              }
              else if(members.membership_category == 'Regular') {
                regularMembers.push(members[i]);
              }
              else {
                newMembers.push(members[i]);
              }
            }
            else {
              deactiveMembers.push(members[i]);
            }
          }
          callback();
        });
      },

      function(callback) {
        var firstDayOfWeek = dateHelper.getFirstDayOfWeek();
        whereFilter = {
          businessId: id,
          status: 'active',
          created: {gte: firstDayOfWeek}
        }
        Member.find({where: whereFilter}, function(err, results) {
          if(err)
            return callback(err);
          thisWeekMembers = results;
          callback();
        });
      },

      function(callback) {
        var whereFilter = {
          businesId: id
        }

        Customer_Visit.find({where: whereFilter}, function(err, results) {
          if(err)
            return callback(err);
          visits = results;
          callback();
        });
      },

      function(callback) {
        var firstDayOfWeek = dateHelper.getFirstDayOfWeek();
        var whereFilter = {
          businesId: id,
          created: {gte: firstDayOfWeek}
        }

        Customer_Visit.find({where: whereFilter}, function(err, results) {
          if(err)
            return callback(err);
          thisWeekVisits = results;
          callback();
        });
      }
    ],function(err) {
      if(err)
        return cb(err);

      res = {
        total_members: members.length,
        total_visits: visits.length,
        visits_this_week: thisWeekVisits.length,
        new_members_this_week: thisWeekMembers.length
      }

      cb(null, res);
    });
  }

  Business.remoteMethod(
    'getActiveMemberStatistics',
    {
      http: {path: '/:id/active_member_statistics', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required: true}
      ],
      returns: {arg: 'res', type: 'object', root: true},
      description: ["Get overall statistics."]
    }
  );

  Business.getMonthWiseStatistics = function(id, start_date, end_date, cb) {
    var Member = Business.app.models.Member;
    Member.getMonthWiseStatistics(id, start_date, end_date, cb) ;
  }

  Business.remoteMethod(
    'getMonthWiseStatistics',
    {
      http: {path: '/:id/active_member_statistics', verb: 'get'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'start_date', type: 'date'},
        {arg: 'end_date', type: 'date'}
      ],
      returns: {arg: 'res', type: 'object', root: true},
      description: ["Get overall statistics."]
    }
  );
  // Business.OTPtesting = function(businessId, data, cb) {
  //   var memberId = data.memberId;
  //   var store_Id = data.storeId;
  //   var customerId = data.customerId;
  //   var Customer = Business.app.models.Customer;
  //   var Member = Business.app.models.Member;
  //   var customer;
  //
  //   Customer.findById(customerId, function(err, cInstance) {
  //     if(err)
  //       return cb(err);
  //     else if(!cInstance)
  //       return cb(new Error('No customer instance found with this ID'));
  //
  //     customer = cInstance;
  //     var secret = speakeasy.generateSecret({length: 20});
  //     var token = speakeasy.totp({
  //       secret: secret.base32,
  //       encoding: 'base32'
  //     });
  //     customer.temp_secret = secret.base32;
  //     sendSms('+919824479354', 'Testing for OTP', function(err, success) {
  //       if(err)
  //         return cb(err);
  //
  //       customer.save(function(err, instance) {
  //         if(err)
  //           return cb(err);
  //
  //
  //         var tokenValidates = speakeasy.totp.verify({
  //           secret: customer.temp_secret,
  //           encoding: 'base32',
  //           token: token,
  //           window: 6
  //         });
  //         var obj = {
  //           token: token,
  //           verified: tokenValidates
  //         }
  //         return cb(null, obj);
  //       });
  //     });
  //
  //   });
  // }
  //
  // Business.remoteMethod(
  //   'OTPtesting',
  //   {
  //     http: {path: '/:id/otpcheck', verb: 'post'},
  //     accepts: [
  //       {arg: 'id', type: 'string', required: true},
  //       {arg: 'data', type: 'object', http: { source: 'body' }, required: true},
  //     ],
  //     returns: {arg: 'obj', type: 'object', root: true},
  //     description: ["OTP testing."]
  //   }
  // );


};
