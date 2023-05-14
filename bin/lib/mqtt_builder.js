const mqtt = require('mqtt');

var mqtt_builder = function(globalConfig, app) {
  var url = 'mqtt://' + globalConfig.Mqtt.Brokerhost + ':' + globalConfig.Mqtt.Brokerport;
  var options = { username: globalConfig.Mqtt.Brokeruser, password: globalConfig.Mqtt.Brokerpass };
  var client = mqtt.connect(url, options);

  app.on('exit', function(code) {
    client.end();
  });

  client.on('connect', function(connack) {
    app.logger.info("MQTT Client - connect: " + JSON.stringify(connack));
  });

  client.on('reconnect', function() {
    app.logger.debug("MQTT Client - reconnect");
  });

  client.on('close', function() {
    app.logger.info("MQTT Client - close");
  });

  client.on('offline', function() {
    app.logger.info("MQTT Client - offline");
  });

  client.on('error', function(error) {
    app.logger.error("MQTT Client - error: " + error);
    app.exit(1, error);
  });

  client.on('message', function(topic, message, packet) {
    app.logger.debug("MQTT Client - topic: " + topic + ", message: " + message);
  });

  return client;
};

module.exports = mqtt_builder;
