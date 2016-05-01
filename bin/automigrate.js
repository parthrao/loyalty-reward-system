var path = require('path');

var app = require(path.resolve(__dirname, '../server/server'));
var model = require(parth.resolve(__dirname, '../comon/models/business-event'))
var ds = app.datasources.mysqlDs;
console.log('valid DS ==', ds);
ds.automigrate('Customer', function(err) {
  if (err) throw err;
  // ds.disconnect();
  // var accounts = [
  //   {
  //     customer_catagory: "VIP",
  //     total_visit_threshold: 30,
  //   },
  //   {
  //     customer_catagory: "normal",
  //     total_visit_threshold: 0,
  //   },
  // ];
  // var count = accounts.length;
  // accounts.forEach(function(account) {
  //   app.models.Business_Customer_Category.create(account, function(err, model) {
  //     if (err) throw err;
  //
  //     console.log('Created:', model);
  //
  //     count--;
  //     if (count === 0)
  //       ds.disconnect();
  //   });
  // });
});
