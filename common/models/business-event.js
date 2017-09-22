var path = require('path');
var app = require(path.resolve(__dirname, '../../server/server'));

module.exports = function(BusinessEvent) {
  BusinessEvent.observe('before save', function filterProperties(ctx, next) {
    if(ctx.isNewInstance) {
      ctx.instance.created = Date.now();
      next();
    }
    else {
      next();
    }
  });
};
