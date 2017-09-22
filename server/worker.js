var rabbitmqURL = process.env.RABBITMQ_BIGWIG_URL || 'amqp://localhost';
var testingMessaging = require('../common/worker/testingMessaging');
var messageHelper = require('../common/worker/message-helper');
var checkBdays = require('../common/worker/birthday-campaign');
var checkCallThemBack = require('../common/worker/callthemback-campaign');
var campaignAssignHelper = require('../common/worker/campaign-assign');
var pull= require('./web').pull;
pull.subscribe(function(msg) {
  // console.log('TODO:', msg);
  switch (msg.type) {
    case 'testing':
      console.log('just log testing', msg.type);
      var total = 0;
      for(var i = 0 ; i < 100000; i++)
      {
        for(var j = 0 ; j < 100000; j++) {
          total++;
        }
      }
      break;
    case 'welcome_message':
      var res = messageHelper.sendWelcomeMessages(msg.campaign, msg.customer);
      campaignAssignHelper(msg.campaign, [msg.customer]);
      break;
    case 'check_bdays':
      var res = checkBdays();
      break;
    case 'bday_message':
      var res = messageHelper.sendBdayMessages(msg.campaign, msg.customers);
      campaignAssignHelper(msg.campaign, msg.customers);
      break;
    case 'check_call_them_back':
      var res = checkCallThemBack();
      break;
    case 'call_them_back_message':
      var res = messageHelper.sendCallThemBackMessages(msg.campaign, msg.customers);
      campaignAssignHelper(msg.campaign, msg.customers);
      break;
    case 'campaign_message':
      var res = messageHelper.sendCampaignMessages(msg.campaign, msg.customers);
      campaignAssignHelper(msg.campaign, msg.customers);
      break;
    case 'kill':
      process.exit();
      break;
    default:
      break;

  }
  //connection.close();
});
