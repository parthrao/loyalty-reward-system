var async = require('async');
var push = require('../../server/web').push;
var dateHelper = require('../../server/helper/date-helper');
var _ = require('lodash');
var async = require('async');

module.exports = function(Member) {
  Member.observe('before save', function filterProperties(ctx, next) {
    // console.log('coming hereeeeeeeeeeee', ctx.instance);
    if(ctx.isNewInstance) {
      console.log('new instance ============ ');
      ctx.instance.created = Date.now();

      var Campaign = Member.app.models.Campaign;
      var Customer_Points = Member.app.models.Customer_Points;
      var Customer = Member.app.models.Customer;
      var filter = {
        businessId: ctx.instance.businessId,
        campaign_type: 'welcome'
      }

      Campaign.findOne({where: filter}, function(err, campaign) {
        if(err)
          return next(err);
        else if(!campaign || campaign.state != 'launched')
          return next();

        console.log('campaign found.');

        Customer.findById(ctx.instance.customerId, function(err, customer) {
          if(err)
            return next(err);

          push.publish({type: 'welcome_message', campaign: campaign, customer: customer });
          var customer_points = {
            customerId: ctx.instance.customerId,
            businessId: ctx.instance.businessId,
            balance: 0
          }
          Customer_Points.create(customer_points, function(err, instance) {
            console.log("setting points ==", instance);
            if(err || !instance)
              return cb(err);

            next();
          });
        });
      });
    }
    else {
      next();
    }
  });

  Member.join = function (data, cb) {
    var customerId = data.customerId;
    var businessId = data.businessId;
    var Customer = Member.app.models.Customer;
    var Business = Member.app.models.Business;
    var customer;
    var business;
    var member;

    async.parallel([
      function(callback) {
        Customer.findById(customerId, function(err, instance) {
          if(err)
            return callback(err);
          else if(!instance)
            return callback(new Error('Invalid CustomerId'));

          customer = instance;
          callback();
        });
      },

      function(callback) {
        Business.findById(businessId, function(err, instance) {
          if(err)
            return callback(err);
          else if(!instance)
            return callback(new Error('Invalid businessId'));

          business = instance;
          callback();
        });
      }
    ], function(err) {
      if(err)
        return cb(err);

      var tempMember = {
        customerId: customerId,
        businessId: businessId
      }
      Member.findOrCreate ({where: tempMember}, tempMember, function(err, instance, created) {
        if(err)
          return cb(err);

        member = instance;
        if(created) {
          return cb(null, member);
        }

        if(member.status === 'active') {
          return cb(new Error('This customer is already a member of this business.'));
        }
        else {
          member.status = 'active';
          member.save(function(err, instance) {
            if (err)
              return cb(err);

            return cb(null, instance);
          });
        }
      });
    });
  }

  Member.remoteMethod(
    'join',
    {
      http: {path: '/', verb: 'post'},
      accepts: [
        {arg: 'data', type: 'object', required: true, http: {source: 'body'}}
      ],
      returns: {arg: 'response', type: 'object', root: true},
      description: "customerId, businessId required."
    }
  );

  Member.unjoin = function(id, data, cb) {
    var customerId = data.customerId;
    var membershipId = id;
    var Customer = Member.app.models.Customer;
    var Business = Member.app.models.Business;
    var customer;
    var business;
    var member;

    Member.findById(membershipId, function(err, instance) {
      if(err)
        return cb(err);
      else if(!instance)
        return cb(new Error('Invalid membershipId.'));
      else if(instance.customerId != customerId)
        return cb(new Error('Invalid customerId'));

      instance.status = 'deactive';
      instance.save(function(err, member) {
        if(err)
          return cb(err);

        cb(null,{status: 'success'});
      });
    });
  }

  Member.remoteMethod(
    'unjoin',
    {
      http: {path: '/:id/unjoin', verb: 'post'},
      accepts: [
        {arg: 'id', type: 'string', required: true},
        {arg: 'data', type: 'object', required: true, http: {source: 'body'}}
      ],
      returns: {arg: 'response', type: 'object', root: true},
      description: "customerId, membershipId required."
    }
  );

  Member.getMonthWiseStatistics = function(id, start_date, end_date, cb) {
    var Business = Member.app.models.Business;

    async.aparallel([
      function(callback) {
        Business.findById(id, function(err, result) {
          if(err)
            return callback(err);
          else if(!result)
            return callback(new Error('BusinessId Invalid.'));

          business = result;
          callback();
        });
      },

      function(callback) {
        var whereFilter = {
          businessId: id
        }
        Member.find({where: whereFilter}, function(err, results) {
          if(err)
            return callback(err);
          members = results;
          for(var i = 0 ; i < members.length ; i++)
          {
            if(members.status == 'active') {
              if(members.membership_category == 'VIP') {
                vipMembers.push(members[i]);
              }
              else if(members.membership_category == 'Regular') {
                regularMembers.push(members[i]);
              }
              else {
                newMembers.push(members[i]);
              }
            }
            else {
              deactiveMembers.push(members[i]);
            }
          }
          callback();
        });
      }

    ], function(err) {
      if(err)
        return cb(err)

      var res = {

      };
      cb(null, res);
    });
  }
};
