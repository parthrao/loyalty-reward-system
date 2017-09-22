var schedule = require('node-schedule');
var async = require('async');
var push = require('../../server/web').push;
var dateHelper = require('../../server/helper/date-helper');
var app = require('../../server/server');

module.exports = function() {

  console.log('Running bday checker!');
  var Customer = app.models.Customer;
  var Business = app.models.Business;
  var Campaign = app.models.Campaign;
  var today = new Date();
  var customersWithBdays = [];
  var bdayCampaigns = [];

  async.parallel ([
    function(callback) {
      Customer.find({where : {}}, function(err, customers) {
        if(err)
          return callback(err);
        else if(!customers || customers.length == 0)
          return callback(new Error('No customers in the db.'));

        var today = new Date();
        for(var i=0; i < customers.length ; i++) {
          if(customers[i].birthday != null) {
            if(customers[i].birthday.getMonth() == today.getMonth() && customers[i].birthday.getDate() == today.getDate()) {
              customersWithBdays.push(customers[i]);
            }
          }
        }

        callback();
      });
    },

    function(callback) {
      Campaign.find({where : {campaign_type: 'birthday'}}, function(err, campaigns) {
        if(err)
          return callback(err);
        else if(!campaigns || campaigns.length == 0)
          return callback();

        var today = new Date();
        campaigns.forEach(function(campaign) {
          if(campaign.state == 'launched' && dateHelper.isTodayLessThanEndDate(today, campaign.end_date))
            bdayCampaigns.push(campaign);
        });

        console.log('bdayCampaigns =', bdayCampaigns);
        callback();
      });
    }
  ], function (err) {
    if(err) {
      console.log('error in bday campaign-1', err);
      return err;
    }

    if(bdayCampaigns.length != 0 && customersWithBdays.length != 0) {
      async.forEach(bdayCampaigns, function(campaign,cb) {
        sendMessagesToMembers(campaign, customersWithBdays, cb)
      }, function(err) {
        if(err)
        {
          console.log('error in bday campaign-1', err);
          return;
        }
        console.log('sucess');
        return;
      });
    }

  });
}

var sendMessagesToMembers = function (campaign, customersWithBdays, callback) {
  var Member = app.models.Member;
  var members = [];

  async.forEach(customersWithBdays, function(customer, cb) {
    var filter = {
      customerId: customer.id,
      businessId: campaign.businessId
    }
    Member.find({where: filter}, function(err, results) {
      if(err)
        return cb(err);
      else if(!results || results.length == 0)
        return cb();

      if(results[0].status == 'active' && results[0].notification_subscription_status == 'active') {
        members.push(customer);
      }

      return cb();

    })
  }, function (err) {
    if(err) {
      console.log('error in sendMessagesToMembers =', sendMessagesToMembers);
      return callback(err);
    }
    if(members.length != 0) {
      var message = {
        type: 'bday_message',
        customers: members,
        campaign: campaign
      }
      push.publish(message);
    }

    return callback();
  })
}
