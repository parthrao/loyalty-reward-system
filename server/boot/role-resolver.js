// Copyright IBM Corp. 2015,2016. All Rights Reserved.
// Node module: loopback-example-access-control
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

var debug = require('debug');

module.exports = function(app) {
  if(process.env.RUN_BOOT) {
    var Role = app.models.Role;
    console.log('its coming hereeeeee==================');
    Role.registerResolver('businessAdmin', function(role, context, cb) {
      function reject() {
        process.nextTick(function() {
          cb(null, false);
        });
      }

      console.log('Before context.modelName ===========================',  context.remotingContext.HttpContext);
      // if the target model is not project
      if (context.modelName !== 'Business' && context.modelName !== 'Customer_Visit') {
        return reject();
      }
      console.log('context.modelName ===========================',  context.modelName);

      // do not allow anonymous users
      var userId = context.accessToken.userId;
      if (!userId) {
        return reject();
      }

      // check if userId is in team table for the given project id
      if (context.modelName === 'Business') {
        context.model.findById(context.modelId, function(err, business) {
          if (err || !business)
            return reject();

          business.admins.findById(userId, function(err, admin) {
            if (err || !admin)
            {
              console.log('This is not the admin');
              return reject();
            }
            console.log('This is the admin');
            return cb(null, true);
          });
        });
      }

      else if (context.modelName === 'Customer_Visit') {
        console.log('its a customer_visit ==========');
        context.model.findById(context.modelId, function(err, visit) {
          if (err || !visit)
            return reject();

          visit.business(function(err, business) {
            if (err || !business)
              return reject();

            business.admins.findById(userId, function(err, admin) {
              if (err || !admin)
              {
                console.log('This is not the admin');
                return reject();
              }
              console.log('This is the admin');
              return cb(null, true);
            });

          });
        });
      }
    });

    var RoleMapping = app.models.RoleMapping;
    var Admin = app.models.Admin;

  }

  // Admin.find({email: 'parthrao8@gmail.com'}, function(err, users) {
  //   if(err)
  //     return console.log('not able to find the admin with this name');
  //
  //   Role.create({
  //     name: 'admin'
  //   }, function(err, role) {
  //     if (err) return debug(err);
  //     debug(role);
  //
  //     console.log('RoleMapping.USER ==', RoleMapping.USER, user);
  //     // Make Bob an admin
  //     role.principals.create({
  //       principalType: RoleMapping.USER,
  //       principalId: users[0].id
  //     }, function(err, principal) {
  //       if (err) return debug(err);
  //       debug(principal);
  //     });
  //   });
  // });
};
