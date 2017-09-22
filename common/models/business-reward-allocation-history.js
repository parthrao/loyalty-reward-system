module.exports = function(BusinessRewardAllocationHistory) {
  BusinessRewardAllocationHistory.observe('before save', function filterProperties(ctx, next) {
    if(ctx.isNewInstance) {
      ctx.instance.created = Date.now();
      next();
    }
    else {
      next();
    }
  });

};
