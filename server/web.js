var webmodule = function (){
  var rabbitmqURL = process.env.RABBITMQ_BIGWIG_URL || 'amqp://localhost';
  console.log('rabbitmqURL in web.js', rabbitmqURL);
  var connection = require('strong-mq')
      .create(rabbitmqURL)
          .open();
   var push = connection.createPushQueue('todo-items');
   var pull= connection.createPullQueue('todo-items');
   var ret={push:push,
   pull:pull};
  return ret;
};

var ques = webmodule();

module.exports.push = ques.push;
module.exports.pull = ques.pull;
