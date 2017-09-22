module.exports = function(BusinessRatingsReview) {
  BusinessRatingsReview.validatesInclusionOf('ratings', {in: [0,1,2,3,4,5]});
  BusinessRatingsReview.observe('before save', function filterProperties(ctx, next) {
    if(ctx.isNewInstance) {
      ctx.instance.created = Date.now();
      next();
    }
    else {
      next();
    }
  });
};
