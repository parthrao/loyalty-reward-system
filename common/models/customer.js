var modelUtils = require('../../server/utils/modelUtils');
var authy = require('authy')('uipnSWP9aDAc6kRDLVZew1dUEAgHhsJK');
var twilioClient = require('twilio')('AC520b9fd0579a3ff0f5237c2eb3399e9a', '1de3ca6fe04576ddc95dd3bb163ccfd4');
var async = require('async');
var _ = require('lodash');
var speakeasy = require('speakeasy');
var sendSms = require('../../server/utils/sendSMS');

module.exports = function(Customer) {
  // Clears base USER model's ACLs and allow Admin to set it's own ACLs
  modelUtils.clearBaseACLs(Customer, require('./customer.json'));

  // Validate uniqueness of email
  Customer.validatesUniquenessOf('email');

  // Set created date
  Customer.observe('before save', function filterProperties(ctx, next) {
    if(ctx.isNewInstance) {
      ctx.instance.created = Date.now();

      if(ctx.instance.phone == null)
        return next(new Error('phone field can not be null.'));


      if(!ctx.instance.username)
        ctx.instance.username = ctx.instance.phone;

      if(!ctx.instance.email)
        ctx.instance.email = ctx.instance.phone + '@zaza.com';

      next();
    }
    else {
      next();
    }
  });

  Customer.afterRemote('create', function(context, usr, next) {
    var user = context.result;
    if (!user.authyId) {
        // Register this user if it's a new user
        authy.register_user(user.email, user.phone, user.countryCode,
            function(err, response) {

            if (err || !response.user) return next.call(user, err);
            user.authyId = response.user.id;
            user.save(null ,function(err, doc) {
                if (err || !doc) return next.call(user, err);
                user = doc;
                sendToken();
            });
        });
    } else {
        // Otherwise send token to a known user
        sendToken();
    };

    // With a valid Authy ID, send the 2FA token for this user
    function sendToken() {
        authy.request_sms(user.authyId, true, function(err, response) {
            next.call(user, err);
        });
    };
  });

  // Customer.remoteMethod();

  Customer.verifyAuthyToken = function(userId, code, cb) {
    var user;
    var code = code;

    Customer.findById( userId, function (err, doc) {
      if(err || !doc) {
        return cb(err, doc)
      }
      user = doc;
      authy.verify(user.authyId, code, function(err, response) {
          postVerify(err)
      });
    });

    function postVerify(err) {
        if (err) {
            return cb(new Error('The token you entered was invalid - please retry.'));
        }

        // If the token was valid, flip the bit to validate the user account
        user.verified = true;
        user.save(null, postSave);
    }

    function postSave(err, obj) {
        if (err) {
            return cb(err, obj)
        }

        // Send confirmation text message
        var message = 'You did it! Signup complete :)';
        user.sendMessage(message, function(err, userObj) {
            if (err) {
                return cb(new Error('errors', 'You are signed up, but '
                    + 'we could not send you a message. Our bad :('), obj);
            }

            // show success page
            return cb(err, userObj);
        });
      }
    };

    Customer.prototype.sendMessage = function(message, cb) {

      var self = this;
      twilioClient.sendMessage({
        to: self.countryCode + self.phone,
        from: "+12056831893",
        body: message
      }, function(err, response) {
          cb(err, self);
      });
    };


    Customer.remoteMethod(
      'verifyAuthyToken',
      {
        http: {path: '/:id/authenticate', verb: 'post'},
        accepts: [
          {arg: 'id', type: 'string', required: true},
          {arg: 'code', type: 'string', required: true},
        ],
        returns: {arg: 'user', type: 'object'}
      }
    );

    Customer.getMembershipDetails = function (userId, businessId, cb) {
      var customer;
      var result = {};
      var Member = Customer.app.models.Member;
      Customer.findById( userId, function (err, doc) {
        if(err || !doc) {
          return cb(err, doc)
        }
        customer = doc;

        async.parallel([
          // Find membership status
          function(callback) {
            var filter = {
              businessId: businessId,
              customerId: userId
            }
            Member.find({where: filter}, function(err, memberships) {
              if(err || !doc) {
                return callback(err)
              }
              else if(memberships.length === 0){
                return callback(new Error('This customer is not a member of this business.'))
              }
              result.membership_category = memberships[0].membership_category;
              callback();
            });
          },
          //  Find customer points
          function(callback) {
            customer.points({where: {businessId: businessId}}, function(err, points) {
              if(err || !points) {
                return callback(err)
              }
              result.points = points[0];
              callback()
            });
          },
          //  Find Customer history for this business
          function(callback) {
            customer.customer_reward_history({where: {businessId: businessId}}, function(err, histories) {
              if(err || !histories) {
                return callback(err)
              }

              result.history = histories;
              callback();
            });
          }
        ],
        function(err) {
          if(err)
            cb(err);
          cb(null, result);
        });

      });
    }

    Customer.remoteMethod(
      'getMembershipDetails',
      {
        http: {path: '/:id/businesses/:fk/membership_details', verb: 'get'},
        accepts: [
          {arg: 'id', type: 'string', required: true},
          {arg: 'fk', type: 'string', required: true}
        ],
        returns: {arg: 'body', type: 'object'}
      }
    );



  Customer.prototype.generateOtp = function(cb) {
    var secret = speakeasy.generateSecret({length: 20});
    var token = speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32'
    });
    this.temp_secret = secret.base32;

    this.save(function(err, instance) {
      if(err)
        return cb(err);

      sendSms(this.countryCode+this.phone, 'Testing for OTP', function(err, success) {
        if(err)
          return cb(err);

        return cb(null, token);
      });
    });
  }

  Customer.appLogin = function(credentials, cb) {
    var first_name = credentials.first_name;
    var last_name = credentials.last_name;
    var phone = credentials.phone;
    var countryCode = credentials.countryCode;
    var AppLogin_OTP_Request = Customer.app.models.AppLogin_OTP_Request;
    var customer;


    var tempCustomer = {
      first_name: credentials.first_name,
      last_name: credentials.last_name,
      phone: credentials.phone,
      countryCode: credentials.countryCode,
      name: credentials.first_name + ' ' + credentials.last_name,
      username: credentials.phone,
      password: phone,
    };

    Customer.findOrCreate ({where: {phone: phone}}, tempCustomer, function(err, instance, created) {
      if(err)
        return cb(err);
      if(created)
        console.log('inside created');

      customer = instance;

      var otpRequest = {
        customerId: customer.id
      };

      AppLogin_OTP_Request.create(otpRequest, function(err, applogin_otp_request) {
        if(err)
          return cb(err);
        customer.generateOtp(function(err, token) {
          if(err)
            return cb(err);

          var data = {
            otp: token,
            applogin_otp_requestId: applogin_otp_request.id
          };
          return cb(null, data);
        });
      });
    });
  }

  Customer.remoteMethod(
    'appLogin',
    {
      http: {path: '/request_login_otp', verb: 'post'},
      accepts: {arg: 'credentials', type: 'object', required: true, http: {source: 'body'}},
      returns: {arg: 'response', type: 'object', root: true},
      description: "Provide phone,first_name,last_name,countryCode in the data field."
    }
  );

  Customer.verifyAppLoginOtp = function (data, cb) {
    var otp = data.otp;
    var applogin_otp_requestId = data.applogin_otp_requestId;
    var AppLogin_OTP_Request = Customer.app.models.AppLogin_OTP_Request;

    AppLogin_OTP_Request.findById(applogin_otp_requestId, function(err, applogin_otp_request) {
      if(err)
        return  cb(err);
      else if(!applogin_otp_request)
        return cb(new Error('Incorrect applogin_otp_requestId.'));

      Customer.findById(applogin_otp_request.customerId, function(err, customer) {
        if(err)
          return  cb(err);
        else if(!customer)
          return cb(new Error('Incorrect customerId stored in the otp request.'));

        var tokenValidation = speakeasy.totp.verify({
          secret: customer.temp_secret,
          encoding: 'base32',
          token: otp,
          window: 6
        });

        if(!tokenValidation) {
          return cb(new Error('This token is invalid.'));
        }
        else {
          Customer.login({
             password: customer.phone,
             username: customer.username
            }, 'user', function(err, token) {
              if (err)
                return cb(err);

              var response = {
                customerId: customer.id,
                id: token.id,
                ttl: token.ttl
              };

              cb(null, response);
           });
        }



      });
    });
  }

  Customer.remoteMethod(
    'verifyAppLoginOtp',
    {
      http: {path: '/verify_login_otp', verb: 'post'},
      accepts: {arg: 'data', type: 'object', required: true, http: {source: 'body'}},
      returns: {arg: 'response', type: 'object', root: true},
      description: "Provide otp and applogin_otp_requestId in the data field."
    }
  );

  Customer.listAllMembershipClub = function(customerId, cb) {
    var Business = Customer.app.models.Business;
    var Membership = Customer.app.models.Member;
    var customer;

    Customer.findById(customerId, function(err, instance) {
      if(err)
        return cb(err);
      else if(!instance)
        return cb(new Error('Invalid CustomerId.'));

      customer = instance;

      Membership.find({where:{customerId: customer.id},
        include: {
          relation: 'business'
          }
        }, function(err, response) {
        if(err)
          return cb(err);
        cb(null, response);
      });
    });
  }

  Customer.remoteMethod(
    'listAllMembershipClub',
    {
      http: {path: '/:id/membership_club', verb: 'get'},
      accepts: [
        {arg: 'customerId', type: 'string', required: true}
      ],
      returns: {arg: 'response', type: 'array', root: true},
      description: "Provide customerId in the path."
    }
  );

  Customer.listSingleMembershipClub = function(customerId, businessId, cb) {
    var Business = Customer.app.models.Business;
    var Membership = Customer.app.models.Member;
    var Customer_Points = Customer.app.models.Customer_Points;
    var Customer_Reward_History = Customer.app.models.Customer_Reward_History;
    var points;
    var history;
    var customer;
    var response;

    Customer.findById(customerId, function(err, instance) {
      if(err)
        return cb(err);
      else if(!instance)
        return cb(new Error('Invalid CustomerId.'));

      customer = instance;

      Membership.find({where:{customerId: customer.id, businessId: businessId},
        include: {
          relation: 'business'
          }
        }, function(err, memberships) {
        if(err)
          return cb(err);
        else if(!memberships || memberships.length == 0)
          return cb(new Error('Customer is not a member of this business.'));

        response = memberships[0];
        async.parallel([
          function(callback) {
            Customer_Points.find({where:{customerId: customer.id, businessId: businessId}
            }, function(err, instances) {
              if(err)
                return callback(err);
              else if(!instances || instances.length == 0)
                return callback(new Error('Customer is not a member of this business as there is no point entry in the table.'));

              points = instances[0];
              callback();
            });
          },

          function(callback) {
            Customer_Reward_History.find({where:{customerId: customer.id, businessId: businessId}
            }, function(err, instances) {
              if(err)
                return callback(err);

              history = instances;
              callback();
            });
          }
        ],function(err) {
          if(err)
            return cb(err);
          response.history = history;
          response.current_balance = points.balance;
          cb(null, response);
        });
      });
    });
  }

  Customer.remoteMethod(
    'listSingleMembershipClub',
    {
      http: {path: '/:customerId/membership_club/:businessId', verb: 'get'},
      accepts: [
        {arg: 'customerId', type: 'string', required: true},
        {arg: 'businessId', type: 'string', required: true}
      ],
      returns: {arg: 'response', type: 'object', root: true},
      description: "Provide customerId and businessId in the path."
    }
  );

  Customer.updateBasicInfo = function (id, data, cb){
    console.log('asdf aksdnfasjdfnaksjdfnaksjdf ==', _.hasIn(data, 'email'));
    if(_.hasIn(data, 'email') || _.hasIn(data, 'phone') || _.hasIn(data, 'username')) {

      return cb(new Error('You can not change email or phone or username in this request so remove these fields if present.'));
    }

    Customer.findById(id, function(err, instance) {
      if(err)
        return cb(err);
      else if(!instance)
        return cb(new Error('Invalid customerId'));

      instance.updateAttributes(data, function(err, customer) {
        if(err)
          return cb(err);

        cb(null, customer);
      });
    });
  }

  Customer.remoteMethod(
    'updateBasicInfo',
    {
      http: {path: '/:id/update_basic_info', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'data', type: 'object', required: true, http: {source: 'body'}},
      ],
      returns: {arg: 'response', type: 'object', root: true},
      description: "Provide customerId in the path. Don't send email or phone in data."
    }
  );

  Customer.requestChangePhone = function(id, data, cb) {
    var type = data.type;
    var new_info = data.new_info;
    var customerId = id;
    var UserInfoChangeRequest = Customer.app.models.UserInfoChangeRequest;

    if(type != 'phone_number' && type != 'email')
      return cb(new Error('Incorrect type.'));

    Customer.findById(customerId, function(err, customer) {
      if(err)
        return cb(err);
      else if(!customer)
        return cb(new Error('Invalid customerId'));

      data.customerId = id;
      UserInfoChangeRequest.create(data, function(err, instance) {
        if(err)
          return cb(err);

        customer.generateOtp(function(err, token) {
          if(err)
            return cb(err);

          var response = {
            user_critical_info_change_otp_requestId: instance.id,
            otp: token
          };
          return cb(null, response);
        });
      });
    });
  }

  Customer.remoteMethod(
    'requestChangePhone',
    {
      http: {path: '/:id/request_phone_change', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'data', type: 'object', required: true, http: {source: 'body'}},
      ],
      returns: {arg: 'response', type: 'object', root: true},
      description: "Provide new_info and type in data."
    }
  );

  Customer.verifyChangePhone = function(id, data, cb) {
    var user_critical_info_change_otp_requestId = data.user_critical_info_change_otp_requestId;
    var otp = data.otp;
    var UserInfoChangeRequest = Customer.app.models.UserInfoChangeRequest;

    UserInfoChangeRequest.findById(user_critical_info_change_otp_requestId, function(err, user_info_change_request) {
      if(err)
        return cb(err);
      else if(!user_info_change_request)
        return cb(new Error('Invalid user_critical_info_change_otp_requestId.'));

      Customer.findById(user_info_change_request.customerId, function(err,customer) {
        if(err)
          return cb(err);
        else if(!customer)
          return cb(new Error('Invalid customerId.'));

        var tokenValidation = speakeasy.totp.verify({
          secret: customer.temp_secret,
          encoding: 'base32',
          token: otp,
          window: 6
        });

        if(!tokenValidation) {
          return cb(new Error('This token is invalid.'));
        }
        else {
          if(user_info_change_request.type == 'phone_number') {
            customer.phone = user_info_change_request.new_info;
            customer.username = user_info_change_request.new_info;
            customer.save(function(err, cInstance) {
              if(err)
                return cb(err);

              cb(null, cInstance);
            });
          }
          else if(user_info_change_request.type == 'email') {
            customer.email = user_info_change_request.new_info;
            customer.save(function(err, cInstance) {
              if(err)
                return cb(err);

              cb(null, cInstance);
            });
          }

        }

      });
    });

  }

  Customer.remoteMethod(
    'verifyChangePhone',
    {
      http: {path: '/:id/verify_phone_change', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'data', type: 'object', required: true, http: {source: 'body'}},
      ],
      returns: {arg: 'response', type: 'object', root: true},
      description: "Provide otp, user_critical_info_change_otp_requestId in the path."
    }
  );

  Customer.sendEmail = function(cb) {
    Customer.app.models.Email.send({
      to: 'parthrao8@gmail.com',
      from: 'zazareward@gmail.com',
      subject: 'my subject',
      text: 'my text',
      html: 'my <em>html</em>'
    }, function(err, mail) {
      if(err)
        return cb(err);
      console.log('email sent!', mail);
      cb(null, mail)
    });
  }

  Customer.remoteMethod(
    'sendEmail',
    {
      http: {path: '/sendmail', verb: 'post'},
      accepts: [],
      returns: {arg: 'response', type: 'object', root: true},
      description: "Provide otp, user_critical_info_change_otp_requestId in the path."
    }
  );

};
