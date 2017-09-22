var loopback = require('loopback');
var boot = require('loopback-boot');
var path = require('path');
var explorer = require('loopback-component-explorer');
var pushHelper = require('./helper/push-notifications');
var config = require('./config');

var AWS = require('aws-sdk');
AWS.config.update({accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, region: config.region});
// pushHelper.setDefaultSMSAttributes(); us-west-2

var shortid = require('shortid');
shortid.seed(1);

var app = module.exports = loopback();

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};
console.log('process PId = ', process.pid);
console.log('RUN_BOOT =', process.env.RUN_BOOT);
app.use('/explorer', explorer.routes(app, { uiDirs: path.resolve(__dirname, 'explorer') }));
app.use(loopback.context());
app.use(loopback.token());

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.

boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
