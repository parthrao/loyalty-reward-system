//Initialize a REST client in a single line:
var client = require('twilio')('AC520b9fd0579a3ff0f5237c2eb3399e9a', '1de3ca6fe04576ddc95dd3bb163ccfd4');

// Use this convenient shorthand to send an SMS:
client.sendSms({
    to:'+919824479354',
    from:'+12056831893',
    body:'ahoy hoy! Testing Twilio and node.js'
}, function(error, message) {
    if (!error) {
        console.log('Success! The SID for this SMS message is:');
        console.log(message.sid);
        console.log('Message sent on:');
        console.log(message.dateCreated);
        console.log('message body is:');
        console.log(message);
    } else {
        console.log('Oops! There was an error.');
        console.log(error);
    }
});
