var schedule = require('node-schedule');
var async = require('async');
var _ = require('lodash');
var push = require('../../server/web').push;
var dateHelper = require('../../server/helper/date-helper');
var app = require('../../server/server');

module.exports = function() {

  console.log('Running CTB checker!');
  var Customer = app.models.Customer;
  var Business = app.models.Business;
  var Campaign = app.models.Campaign;
  var today = new Date();
  var customersWithBdays = [];
  var callbackCampaigns = [];

  async.series ([
    function(callback) {
      var whereFilter = {
        campaign_type: 'call_them_back'
      };
      var includeFilter = {
        business: ['customers']
      }

      Campaign.find({where: whereFilter, include: includeFilter}, function(err, campaigns) {
        if(err)
          return callback(err);
        else if(!campaigns || campaigns.length == 0)
          return callback();

        var today = new Date();
        campaigns.forEach(function(campaign) {
          console.log('checking enddate =', dateHelper.isTodayLessThanEndDate(today, campaign.end_date));
          if(campaign.state == 'launched' && dateHelper.isTodayLessThanEndDate(today, campaign.end_date))
            callbackCampaigns.push(campaign.toJSON());
        });

        console.log('callthemback =', callbackCampaigns);
        callback();
      });
    },

    function(callback) {
      if(callbackCampaigns.length != 0) {
        async.forEach(callbackCampaigns, function(campaign,cb) {
          var members = campaign.business.customers;
          
          if(members.length != 0)
            sendMessagesToMembers(campaign, members, cb);
          else {
            return cb();
          }
        }, function(err) {
          if(err)
          {
            console.log('error in bday campaign-1', err);
            return callback(err);
          }

          console.log('finally ctb done');
          return callback();
        });
      }
    }

  ], function (err) {
    if(err) {
      console.log('error in bday campaign-1', err);
      return err;
    }

    console.log('callthemback campaign sucesss');
    return;
  });

};

var sendMessagesToMembers = function (campaign, customers, callback) {
  var Member = app.models.Member;
  var Customer_Visit = app.models.Customer_Visit;
  var members = [];

  async.forEach(customers, function(customer, cb) {
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

        // Check the conditon of calthemback  days_since_not_visited
        var whereFilter = {
          created: {gt: dateHelper.getPastDate(campaign.days_since_not_visited)},
          customerId: customer.id,
          businessId: campaign.businessId
        }
        Customer_Visit.find({where: whereFilter}, function(err, visits) {
          if(err)
            return cb(err);
          else if(!visits || visits.length == 0)
            members.push(customer);

          console.log('members are =', members);
          return cb();
        });

      }
    })
  }, function (err) {
    if(err) {
      console.log('error in sendMessagesToMembers =', sendMessagesToMembers);
      return callback(err);
    }

    if(members.length != 0) {
      var message = {
        type: 'call_them_back_message',
        customers: members,
        campaign: campaign
      }
      push.publish(message);
    }

    return callback();
  })
}
