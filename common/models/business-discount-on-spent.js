module.exports = function(BusinessDiscountOnSpent) {
  BusinessDiscountOnSpent.beforeRemote('create', function(context, instance, next) {
    var req = context.req;
    req.body.created = Date.now();
    next();
  });
};
