const mqtt = require('mqtt');

var mqtt_builder = function(globalConfig, app) {
  var url = 'mqtt://' + globalConfig.Mqtt.Brokerhost + ':' + globalConfig.Mqtt.Brokerport;
  var options = { username: globalConfig.Mqtt.Brokeruser, password: globalConfig.Mqtt.Brokerpass };
  var client = mqtt.connect(url, options);
  var errorCnt = 0;

  app.on('exit', function(code) {
    client.end();
  });

  client.on('connect', function(connack) {
    app.logger.info("MQTT Client - connect: " + JSON.stringify(connack));
    errorCnt=0;
  });

  client.on('reconnect', function() {
    app.logger.debug("MQTT Client - reconnect");
  });

  client.on('close', function() {
    if (errorCnt==0) {
      app.logger.info("MQTT Client - close");
    }
  });

  client.on('offline', function() {
    app.logger.info("MQTT Client - offline");
  });

  client.on('error', function(error) {
    if (errorCnt==0) {
      app.logger.error("MQTT Client - error: " + error);
    }
    if (errorCnt==101) {
      app.logger.error("MQTT Client - more than 100 errors received. Check your connection to the MQTT server");
    }
    errorCnt++;
  });

  client.on('message', function(topic, message, packet) {
    app.logger.debug("MQTT Client - topic: " + topic + ", message: " + message);
  });

  return client;
};

module.exports = mqtt_builder;
