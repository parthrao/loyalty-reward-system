module.exports = function(Member) {
  Member.beforeRemote('create', function(context, instance, next) {
    var req = context.req;
    req.body.created = Date.now();
    next();
  });

  Member.observe('before save', function filterProperties(ctx, next) {
    console.log('coming hereeeeeeeeeeee', ctx.instance);
    ctx.instance.created = Date.now();
    next();
  });
};
