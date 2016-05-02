module.exports = function(BusinessFanWall) {
  BusinessFanWall.beforeRemote('create', function(context, instance, next) {
    var req = context.req;
    req.body.created = Date.now();
    next();
  });
};