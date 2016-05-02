module.exports = function(CustomerOtherRewards) {
  CustomerOtherRewards.beforeRemote('create', function(context, instance, next) {
    var req = context.req;
    req.body.created = Date.now();
    next();
  });
};
