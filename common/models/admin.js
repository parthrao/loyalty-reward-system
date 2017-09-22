var modelUtils = require('../../server/utils/modelUtils');
var loopback = require('loopback');

module.exports = function(Admin) {
  // Clears base USER model's ACLs and allow Admin to set it's own ACLs
  modelUtils.clearBaseACLs(Admin, require('./admin.json'));

  // Cleaar the email check
  delete Admin.validations.email;

  // Before calling create it adds created date in the req.body
  Admin.observe('before save', function filterProperties(ctx, next) {
    if(ctx.isNewInstance) {
      ctx.instance.created = Date.now();

      if(ctx.instance.storeId != null) {
        var Store = Admin.app.models.Store;
        Store.findById(ctx.instance.storeId, function(err, store) {
          if(err)
            return next(err);
          else if(!store)
            return next(new Error('storeId does not exist. Provide valid storeId'));
          else if(JSON.stringify(store.businessId) !== JSON.stringify(ctx.instance.businessId))
            return next(new Error('storeId does not belong to this business. Provide valid storeId which belongs to this business.'));

          next();
        });
      }
      else{
        next();
      }
    }
    else {
      next();
    }
  });

};
