exports.clearBaseACLs = function (ModelType, ModelConfig) {
  ModelType.settings.acls.length = 0;
  ModelConfig.acls.forEach(function (r) {
    ModelType.settings.acls.push(r);
  });
};
