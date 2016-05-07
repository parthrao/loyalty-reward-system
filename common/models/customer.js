var modelUtils = require('../../server/utils/modelUtils');
var authy = require('authy')('uipnSWP9aDAc6kRDLVZew1dUEAgHhsJK');
var twilioClient = require('twilio')('AC520b9fd0579a3ff0f5237c2eb3399e9a', '1de3ca6fe04576ddc95dd3bb163ccfd4');


module.exports = function(Customer) {
  // Clears base USER model's ACLs and allow Admin to set it's own ACLs
  modelUtils.clearBaseACLs(Customer, require('./Customer.json'));

  // Set created date
  Customer.beforeRemote('create', function(context, instance, next) {
    var req = context.req;
    req.body.created = Date.now();
    next();
  });

  // Customer.testMethod = function(user, cb) {
  //   cb(null , user);
  // }

  // Customer.afterRemote('create', function(context, usr, next) {
  //   var user = context.result;
  //   console.log('result ----', user);
  //   if (!user.authyId) {
  //       // Register this user if it's a new user
  //       authy.register_user(user.email, user.phone, user.countryCode,
  //           function(err, response) {
  //
  //           if (err || !response.user) return next(err, user);
  //           user.authyId = response.user.id;
  //           user.save(null ,function(err, doc) {
  //               if (err || !doc) return next.call(err, user);
  //               user = doc;
  //               sendToken();
  //           });
  //       });
  //   } else {
  //       // Otherwise send token to a known user
  //       sendToken();
  //   };
  //
  //   // With a valid Authy ID, send the 2FA token for this user
  //   function sendToken() {
  //       authy.request_sms(user.authyId, true, function(err, response) {
  //           next.call(self, err);
  //       });
  //   };
  // });

  // Customer.remoteMethod();

  // Customer.verifyAuthyToken = function(userId, code, cb) {
  //   var user;
  //   Customer.findById( userId, function (err, doc) {
  //     if(err || !doc) {
  //       return cb(err, doc)
  //     }
  //     console.log('user athentication of ', doc);
  //     user = doc;
  //     authy.verify(user.authyId, code, function(err, response) {
  //         postVerify(err)
  //     });
  //   });
  //
  //   function postVerify(err) {
  //       if (err) {
  //           return die('The token you entered was invalid - please retry.');
  //       }
  //
  //       // If the token was valid, flip the bit to validate the user account
  //       user.verified = true;
  //       user.save(null, postSave);
  //   }
  //
  //   function postSave(err, obj) {
  //       if (err) {
  //           return die('There was a problem validating your account '
  //               + '- please enter your token again.');
  //       }
  //
  //       // Send confirmation text message
  //       var message = 'You did it! Signup complete :)';
  //       user.sendMessage(message, function(err) {
  //           if (err) {
  //               request.flash('errors', 'You are signed up, but '
  //                   + 'we could not send you a message. Our bad :(');
  //           }
  //
  //           // show success page
  //           request.flash('successes', message);
  //           response.redirect('/users/'+user._id);
  //       });
  //   }
  //
  // };

  // Customer.
};
