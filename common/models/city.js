var helper = require('../../server/helper/date-helper');

module.exports = function(City) {
  City.observe('before save', function filterProperties(ctx, next) {
    if(ctx.isNewInstance) {
      ctx.instance.created = new Date();
      next();
    }
    else {
      next();
    }
  });

  City.check = function(cb) {
    var Customer = City.app.models.Customer;
    var Business = City.app.models.Business;
    var Campaign = City.app.models.Campaign;

    var filter = {
      campaign_type: 'call_them_back'
    }

    var includeFilter = {
      business: ['customers']
    }
    Campaign.find({where: filter, include: includeFilter}, function(err, results) {
      if(err)
        return cb(err);
      else if(results.length == 0)
        return cb(new Error('No result found'));
      else {
        var today = new Date();

        var cust;


        // for(var i=0; i < cities.length ; i++) {
        //
        //   if(cities[i].birthday != null) {
        //     console.log('comparing =', today  );
        //     console.log("with =", cities[i].birthday);
        //     console.log('answer =', helper.isTodayLessThanEndDate(today, cities[i].birthday));
        //     if(cities[i].birthday.getMonth() == today.getMonth() && cities[i].birthday.getDate() == today.getDate()) {
        //       cust = cities[i];
        //       break;
        //     }
        //   }
        // }
        // console.log(cities.length);
        // var date = cust.birthday;
        // console.log('month', date.getMonth());

        return cb(null, results[0]);
      }
    });
  }

  City.remoteMethod(
    'check',
    {
      http: {path: '/check', verb: 'get'},
      returns: {arg: 'response', type: 'object', root: true},
      description: ["Update attributes for a model instance and persiste in data source."]
    }
  );
};
