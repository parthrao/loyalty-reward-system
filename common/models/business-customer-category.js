module.exports = function(BusinessCustomerCategory) {
  BusinessCustomerCategory.observe('before save', function filterProperties(ctx, next) {
    if(ctx.isNewInstance) {
      ctx.instance.created = Date.now();
      next();
    }
    else {
      next();
    }
  });
};
