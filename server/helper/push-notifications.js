var config = require('../config');
var AWS = require('aws-sdk');
console.log('accessKeyId ==', config.accessKeyId);
AWS.config.update({accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, region: config.region});
var sns = new AWS.SNS();

module.exports.createPlatformApplication = function(params, cb) {
  sns.createPlatformApplication(params, cb);
}

module.exports.createPlatformEndpoint = function(params, cb) {
  sns.createPlatformEndpoint(params, cb);
}

module.exports.createTopic = function(params, cb) {
  sns.createTopic(params, cb);
}

module.exports.publish = function(params, cb) {
  sns.publish(params, cb);
}

module.exports.subscribe = function(params, cb) {
  sns.subscribe(params, cb);
}

module.exports.unsubscribe = function(params, cb) {
  sns.unsubscribe(params, cb);
}

module.exports.deletePlatformApplication = function(params, cb) {
  sns.deletePlatformApplication(params, cb);
}

module.exports.deletePlatformEndpoint = function(params, cb) {
  sns.deletePlatformEndpoint(params, cb);
}

module.exports.deleteTopic = function(params, cb) {
  sns.deleteTopic(params, cb);
}

module.exports.sendSingleSMS = function(params, cb) {

}

module.exports.setSMSAttributes = function(params, cb) {
  sns.setSMSAttributes(params, cb);
}
