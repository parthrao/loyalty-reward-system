var _ = require('lodash');
module.exports = function(Store) {

  Store.observe('before save', function filterProperties(ctx, next) {
    var City = Store.app.models.City;
    if(ctx.isNewInstance) {
      ctx.instance.created = Date.now();
      if(ctx.instance.cityId == null)
        return next( new Error('Please provide valid cityId.'));

      City.findById(ctx.instance.cityId, function(err, city) {
        if(err)
         return next(err);

        ctx.instance.city = city.name;
        next();
      })

    }
    else {
      ctx.data = _.omit(ctx.data, ['city']);

    if((_.keysIn(ctx.data)).length == 0) {
        next( new Error('Please provide value other then city'))
      }

      if(ctx.data.cityId != null) {
        City.findById(ctx.data.cityId, function(err, city) {
          if(err)
           next(err);

          ctx.data.city = city.name;
          next();
        })
      }
      else {
        next();
      }

    }

  });
};
