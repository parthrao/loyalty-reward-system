var schedule = require('node-schedule');
var async = require('async');
var push = require('../web').push;
var dateHelper = require('../helper/date-helper');

module.exports = function(app) {
  // Install a `/` route that returns server status
  if(process.env.RUN_BOOT) {
    var router = app.loopback.Router();

    var rule = new schedule.RecurrenceRule();
    rule.minute = 7;
    rule.seconds = 10;
    rule.hour = 00;


    var bdayCampaignCheck = schedule.scheduleJob(rule, function() {
      var message = {
        type: 'check_bdays'
      };
      push.publish(message);
    });
  }

};
