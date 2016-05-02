var modelUtils = require('../../server/utils/modelUtils');

module.exports = function(Customer) {
  // Clears base USER model's ACLs and allow Admin to set it's own ACLs
  modelUtils.clearBaseACLs(Customer, require('./Customer.json'));

  // Set created date
  Customer.beforeRemote('create', function(context, instance, next) {
    var req = context.req;
    req.body.created = Date.now();
    next();
  });
};
