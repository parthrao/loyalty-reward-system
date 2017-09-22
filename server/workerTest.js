var rabbitmqURL = process.env.RABBITMQ_BIGWIG_URL || 'amqp://localhost';
var testingMessaging = require('../common/worker/testingMessaging');
var messageHelper = require('../common/worker/message-helper');
var pull= require('./web').pull;
var push = require('./web').push;
// pull.subscribe(function(msg) {
//   // console.log('TODO:', msg);
//   switch (msg.type) {
//     case 'testing':
//       console.log('just log testing', msg.type);
//       var total = 0;
//       for(var i = 0 ; i < 100000; i++)
//       {
//         for(var j = 0 ; j < 100000; j++) {
//           total++;
//         }
//       }
//       console.log('just log testing', total);
//       break;
//     case 'welcome_message':
//       var res = messageHelper.sendWelcomeMessages(msg.campaign, msg.customerId)
//       console.log('welcomeResponse ==', res);
//       break;
//     case 'kill':
//       process.exit();
//       break;
//     default:
//
//   }
//   //connection.close();
// });

console.log('just logging');
