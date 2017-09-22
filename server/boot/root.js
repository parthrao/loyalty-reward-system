module.exports = function(server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();
  router.get('/', server.loopback.status());
  router.get('/ping', function(req,res) {
    res.send('pong');
  })
  server.use(router);
};
