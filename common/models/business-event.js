var path = require('path');
var app = require(path.resolve(__dirname, '../../server/server'));

module.exports = function(BusinessEvent) {
  // console.log('Model ==', app.dataSources);
  // var ds = app.dataSources.mysqlDs;
  // var schema_v1 = {
  //   "name": "Business_Event",
  //   "base": "PersistedModel",
  //   "idInjection": true,
  //   "options": {
  //     "validateUpsert": true
  //   },
  //   "properties": {
  //     "event_desc": {
  //       "type": "string"
  //     },
  //     "schedule_start_ts": {
  //       "type": "date",
  //       "required": true
  //     },
  //     "schedule_end_ts": {
  //       "type": "date",
  //       "required": true
  //     },
  //     "other_desc": {
  //       "type": "string"
  //     }
  //   },
  //   "validations": [],
  //   "relations": {},
  //   "acls": [],
  //   "methods": {}
  // };
  //
  // ds.createModel(schema_v1.name, schema_v1.properties, schema_v1.options);
  //
  // ds.automigrate(function () {
  //   ds.discoverModelProperties('Business_Event', function (err, props) {
  //     console.log(props);
  //   });
  // });
};
