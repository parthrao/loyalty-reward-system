module.exports = function(CustomerPoints) {
  CustomerPoints.beforeRemote('create', function(context, instance, next) {
    var req = context.req;
    req.body.created = Date.now();
    next();
  });
};
