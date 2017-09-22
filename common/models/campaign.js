var push = require('../../server/web').push;
var shortid = require('shortid');
var _ = require('lodash');
var pushHelper = require('../worker/message-helper');
var async = require('async');

module.exports = function(Campaign) {
  Campaign.observe('before save', function filterProperties(ctx, next) {
    if(ctx.isNewInstance) {
      ctx.instance.created = Date.now();
      ctx.instance.campaign_code = shortid.generate();
      ctx.instance.state = 'draft';
      next();
    }
    else {
      next();
    }
  });

  Campaign.updateCampaign = function(id, data, cb) {
    var campaign;
    Campaign.findById(id, function(err, campaignInstance) {
      if(err)
        return cb(err);
      else if(!campaignInstance)
        return cb(new Error('Incorrect campaign Id.'));

      campaign = campaignInstance;
      if(campaign.state != 'draft') {
        var keys = _.keysIn(data);
        if(keys.length == 1 && keys[0] == 'state') {
          if(campaign.state == 'launched' && (data.state != null && (data.state != 'stopped' && data.state != 'launched')))
            return cb(new Error('Invalid state. You can change state to stopped from launched.'));
          else if(campaign.state == 'stopped' && (data.state != null && (data.state != 'stopped' && data.state != 'draft')))
            return cb(new Error('Invalid state. You can change state to draft from stopped.'));
          else {
            campaign.state = (data.state != null) ? data.state : campaign.state;
            campaign.save(cb);
          }
        }
        else {
          return cb(new Error('Only state can be changed in a launched or stopped campaigns.'));
        }
      }

      else {
        if (data.state != null && data.state != 'draft' && data.state != 'launched')
          return cb(new Error('Invalid state. You can only change the state to launched from draft.'));

        campaign = _.merge(campaign, data);
        campaign.save(cb);
      }
    });
  }

  Campaign.remoteMethod(
    'updateCampaign',
    {
      http: {path: '/:id', verb: 'put'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'data', type: 'object', http: { source: 'body' }, required: true},
      ],
      returns: {arg: 'response', type: 'object', root: true},
      description: ["Update attributes for a model instance and persiste in data source."]
    }
  );

  Campaign.afterRemote('updateCampaign', function(ctx, data, next) {
    console.log('coming here', ctx.result);
    if(ctx.result.campaign_type == 'promotion' || ctx.result.campaign_type == 'announcement') {
      if(ctx.result.state == 'launched') {
        Campaign.sendNotification(ctx.result.id, function(err, result) {
          if(err)
            return next(err);
          next();
        });
      }
      else{
        next();
      }

    }
    else {
      next();
    }
  });

  Campaign.sendNotification = function(id, cb) {
    var Business = Campaign.app.models.Business;
    var campaign;
    var members;

    console.log('campaign Id ==',  id);

    Campaign.findById(id, function(err, result) {
      if(err)
        return cb(err);
      else if(!result)
        return cb(new Error('Invalid CampaignId'));

      console.log('result.state =', result.state);
      if(result.state != 'launched')
        return cb(new Error('The state of the campaign is not launched'));

      campaign = result;
      campaign.getTargetAudiance(function(err, results) {
        if(err)
          return cb(err);

        members = results;
        console.log('members are ', members);

        if(members.length != 0) {
          var message = {
            type:'campaign_message',
            customers: members,
            campaign: campaign
          };
          push.publish(message);
          return cb(null, 'success');
        }

      });

    })
  }

  Campaign.remoteMethod(
    'sendNotification',
    {
      http: {path: '/:id/send_notification', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true}
      ],
      returns: {arg: 'response', type: 'string', root: true},
      description: ["Sneds campaign messages to customers."]
    }
  );

  Campaign.prototype.getTargetAudiance = function(cb) {
    var Customer = Campaign.app.models.Customer;
    var Member = Campaign.app.models.Member;
    // var orFilter = [];
    // for (var i=0 ; i < this.target_audiance.length; i++) {
    //   switch (this.target_audiance[i]) {
    //     case 'New':
    //       orFilter.push({
    //         businessId: this.businessId,
    //         status: 'active',
    //         membership_category: 'New'
    //       });
    //     break;
    //     case 'Regular':
    //       orFilter.push({
    //         businessId: this.businessId,
    //         status: 'active',
    //         membership_category: 'Regular'
    //       });
    //     break;
    //     case 'VIP':
    //       orFilter.push({
    //         businessId: this.businessId,
    //         status: 'active',
    //         membership_category: 'VIP'
    //       });
    //     break;
    //     case 'All':
    //       orFilter.push({
    //         businessId: this.businessId,
    //         status: 'active',
    //         membership_category: 'New'
    //       });
    //       orFilter.push({
    //         businessId: this.businessId,
    //         status: 'active',
    //         membership_category: 'Regular'
    //       });
    //       orFilter.push({
    //         businessId: this.businessId,
    //         status: 'active',
    //         membership_category: 'VIP'
    //       });
    //     break;
    //     default:
    //     break;
    //   }
    // }
    //
    // console.log('orFilter ==', orFilter);
    //
    // Member.find({where:{or: orFilter}, include: 'customer'}, function(err, results) {
    //   if(err)
    //     return cb(err);
    //   else if(!results)
    //     return cb(new Error('Error getting members'));
    //
    //   console.log('results ==', results);
    //   var members = [];
    //   results.forEach(function(instance) {
    //     members.push(instance.toJSON().customer);
    //   });
    //   return cb(null, members);
    // })
    var members = [];
    var whereFilter = {
      businessId: this.businessId,
      status: 'active',
      notification_subscription_status: 'active'
    };

    async.forEach(this.target_audiance, function(customerId, callback){
      whereFilter.customerId = customerId;
      Member.find({where: whereFilter, include: 'customer'}, function(err, customers){
        if(err)
          return callback(err);
        else if(!customers || customers.length == 0)
          callback();

        members.push(customers[0].toJSON().customer);
        callback();
      });
    }, function(err) {
      if(err)
        return cb(err);

      return cb(null, members)
    });
  }

  Campaign.testing = function(cb) {
    // var message = {
    //   type: 'testing',
    //   customerId: 'lkasndfas',
    //   businessId: 'asdfasdfasdf',
    //   message: 'Hey watssapp'
    // }
    // push.publish(message);
    // return cb(null, {Success: true});
    var message = "testing";
    // pushHelper.sendSingleSMS(message, function(err, data){
    //   if(err)
    //     return cb(err);
    //   return cb(null, data);
    // });

  }

  Campaign.remoteMethod(
    'testing',
    {
      http: {path: '/testing', verb: 'post'},
      accepts: [

      ],
      returns: {arg: 'response', type: 'object', root: true},
      description: ["testing."]
    }
  );
};
