var modelUtils = require('../../server/utils/modelUtils');

module.exports = function(Admin) {
  // Clears base USER model's ACLs and allow Admin to set it's own ACLs
  modelUtils.clearBaseACLs(Admin, require('./Admin.json'));

  // Before calling create it adds created date in the req.body
  Admin.beforeRemote('create', function(context, instance, next) {
    var req = context.req;
    req.body.created = Date.now();
    next();
  });


};
