var pushNotifications = require('../../server/helper/push-notifications');
var app = require('../../server/server');
var async = require('async');
var config = require('../../server/config');
var sendgridKey = process.env.SENDGRID_API_KEY || config.SENDGRID_API_KEY;
var sendgrid = require('sendgrid').SendGrid(sendgridKey);
var sendgridHelper = require('sendgrid').mail;

module.exports.sendWelcomeMessages = function(campaign, customer) {
  console.log('sending message', campaign, customer);

  async.forEach(campaign.promotion_channels, function(channel, callback) {
      sendSingleMessages(channel, customer, campaign,callback);
    },function(err) {
        if(err) {
          console.log('err is', err);
          return err;
        }
        return 'success';
  });

}

module.exports.sendBdayMessages = function(campaign, customers) {
  var Customer = app.models.Customer;

  async.forEach(campaign.promotion_channels, function(channel, callback) {
      sendMultipleMessages(channel, customers, campaign,callback);
    },function(err) {
        if(err) {
          console.log('err is', err);
          return err;
        }
        return 'success';
  });

}

module.exports.sendCallThemBackMessages = function(campaign, customers) {
  var Customer = app.models.Customer;

  async.forEach(campaign.promotion_channels, function(channel, callback) {
      sendMultipleMessages(channel, customers, campaign,callback);
    },function(err) {
        if(err) {
          console.log('err is', err);
          return err;
        }
        return 'success';
  });

}

module.exports.sendCampaignMessages = function(campaign, customers) {
  var Customer = app.models.Customer;

  async.forEach(campaign.promotion_channels, function(channel, callback) {
      sendMultipleMessages(channel, customers, campaign, callback);
    },function(err) {
        if(err) {
          console.log('err is', err);
          return err;
        }
        return 'success';
  });

}


var sendSingleMessages = function(channelType, customer, campaign, cb) {

  switch(channelType) {
    case 'email':
      var message = {
        subject: campaign.promotion_short_description,
        text: campaign.promotion_short_description,
        html: campaign.promotion_long_description
      }
      sendSingleSendgridMail(customer, message, cb);
      break;
    case 'push_notification':
      return cb();
      break;
    case 'text':
      var message = campaign.promotion_long_description;
      sendSingleSMS(customer, message, cb);
      break;
    default:
      break;
  }
}

var sendMultipleMessages = function(channelType, customers, campaign, cb) {
  switch(channelType) {
    case 'email':
      var message = {
        subject: campaign.promotion_short_description,
        text: campaign.promotion_short_description,
        html: 'Hi <br/>' + campaign.promotion_long_description
      }
      sendMultipleSendgridMail(customers, message, cb);
      break;
    case 'push_notification':
      return cb();
      break;
    case 'text':
      var message = campaign.promotion_long_description;
      sendMultipleSMS(customers, message, cb);
      break;
    default:
      break;
  }
}

var sendSingleEmail = function(customer, message, cb) {
  var Email = app.models.Email;
  if(customer.email == null) {
    console.log('No email Address.');
    return cb(new Error('Email address is null for this customer.'))
  }

  console.log('sending email');
  Email.send({
    to: customer.email,
    from: 'zazareward@gmail.com',
    subject: message.subject,
    text: message.text,
    html: message.html
  }, function(err, mail) {
    if(err){
      console.log('err in sending mail', err);
        return cb(err);
    }

    console.log('email sent!', mail);
    cb(null, mail)
  });
}

var sendSingleSendgridMail = function (customer, message, cb) {
  var Message_Logs = app.models.Message_Logs;
  var from_email = new sendgridHelper.Email("zazareward@gmail.com");
  var to_email = new sendgridHelper.Email(customer.email);
  var subject = "Sending with SendGrid is Fun";
  var content = new sendgridHelper.Content("text/plain", "and easy to do anywhere, even with Node.js");
  var category = new sendgridHelper.Category('Promotions');
  var mail = new sendgridHelper.Mail(from_email, subject, to_email, content);
  mail.addCategory(category);

  var requestBody = mail.toJSON();
  var request = sendgrid.emptyRequest();
  request.method = 'POST';
  request.path = '/v3/mail/send';
  request.body = requestBody;
  sendgrid.API(request, function (response) {
    console.log('mail response =', response);
    var log = {
      receiver: customer.id,
      message_type: 'email',
      receiver_address: customer.email
    };
    if (response.status != 202) {

      log.success = false;
      log.error = err;
      Message_Logs.create(log, function(error, res) {
        if(error)
          return cb(error)

        else
          return cb(err)
      });
    }
    else     {
      console.log('email success==', data);
      log.success = true;

      Message_Logs.create(log, function(error, res) {
        if(error)
          return cb(error)

        else
          return cb(null, response)
      });         // successful response

    }

  });
}

var sendMultipleSendgridMail = function (customers, message, cb) {

  var subject = message.subject;
  var content = new sendgridHelper.Content("text/html", message.html);
  var category = new sendgridHelper.Category('Promotions');
  var personalization = new sendgridHelper.Personalization();
  for(var i=0 ; i < customers.length ; i++) {
    console.log('before sending email to ', customers);
    if(customers[i].email != null) {
      console.log('sending email to ', customers[i].email);
      personalization.addTo(new sendgridHelper.Email(customers[i].email));
    }
  }

  personalization.setSubject(subject);

  mail = new sendgridHelper.Mail()
  var from_email = new sendgridHelper.Email("zazareward@gmail.com");
  mail.setFrom(from_email);
  mail.addPersonalization(personalization);
  mail.addCategory(category);
  mail.addContent(content);

  var requestBody = mail.toJSON();
  var request = sendgrid.emptyRequest();
  request.method = 'POST';
  request.path = '/v3/mail/send';
  request.body = requestBody;
  sendgrid.API(request, function (response) {
    console.log('mail response =', response);
    return cb(null, response);
  });
}

sendSingleSMS = function(customer, message, cb) {
  var Message_Logs = app.models.Message_Logs;
  var params = {
  Message: message, /* required */
  MessageAttributes: {
    someKey: {
      DataType: 'String', /* required */
      StringValue: 'STRING_VALUE'
    },
    /* anotherKey: ... */
  },
  MessageStructure: 'String',
  PhoneNumber: customer.countryCode + customer.phone,
  Subject: 'STRING_VALUE'
  };
  pushNotifications.publish(params, function(err, data) {
    var log = {
      receiver: customer.id,
      message_type: 'phone',
      receiver_address: customer.phone
    };
    if (err) {
      console.log(err, err.stack); // an error occurred
      log.success = false;
      log.error = err;
      Message_Logs.create(log, function(error, res) {
        if(error)
          return cb(error)

        else
          return cb(err)
      });
    }
    else     {
      console.log('sms success==', data);
      log.success = true;

      Message_Logs.create(log, function(error, res) {
        if(error)
          return cb(error)

        else
          return cb(null, data)
      });         // successful response

    }
  });
}

sendMultipleSMS = function(customers, message, cb) {
  var params = {
  Message: message, /* required */
  MessageAttributes: {
    someKey: {
      DataType: 'String', /* required */
      StringValue: 'STRING_VALUE'
    },
    /* anotherKey: ... */
  },
  MessageStructure: 'String',
  Subject: 'STRING_VALUE'
  };

  async.forEach(customers, function(customer, callback) {
    params.PhoneNumber = customer.countryCode + customer.phone;
    pushNotifications.publish(params, function(err, data) {
      if (err) {
        // console.log(err, err.stack); // an error occurred
        return callback(err);
      }
      else     {
        // console.log(data);           // successful response
        return callback();
      }
    });
  }, function(err) {
    if (err) {
      console.log(err, err.stack); // an error occurred
      return cb(err, null);
    }
    else     {
      console.log('multiple sms success');           // successful response
      var data = {
        success: 'success'
      };
      return cb(null, data);
    }
  })

}
