//Initialize a REST client in a single line:
var client = require('twilio')('AC520b9fd0579a3ff0f5237c2eb3399e9a', '1de3ca6fe04576ddc95dd3bb163ccfd4');

// Use this convenient shorthand to send an SMS:
function sendSms(toNumber, message, cb) {
  client.sendSms({
      to: toNumber,
      from:'+12056831893',
      body: message,
  }, function(error, message) {
      if (!error) {
          console.log('Success! The SID for this SMS message is:');
          console.log(message.sid);
          console.log('Message sent on:');
          console.log(message.dateCreated);
          console.log('message body is:');
          console.log(message);
          return cb(error);
      } else {
          console.log('Oops! There was an error.');
          console.log(error);
          return cb(null, true);
      }
  });
}

module.exports = sendSms;
