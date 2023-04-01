#!/usr/bin/env node

const fs = require('fs');

try {
  var configfile = fs.readFileSync(process.env.LBPCONFIG + '/lox2mqtt/default.json');
  var config = JSON.parse(configfile);
} catch (err) {
  console.log(err);
  return;
}

update_config(config);

function update_config(config) {

  if (!config)
    config = {};

  if (!config.winston) {
    config.winston = [];
    let file = {
      "File" : {
          "level": "debug",
          "timestamp": true,
          "filename": "../../../log/plugins/lox2mqtt/lox2mqtt.log"
      }
    };
    config.winston.push(file);
  }

  if (!config.app)
    config.app = {};

  if (!config.app.subscribe)
    config.app.subscribe = true;

  if (!config.app.mqtt_topic || !config.app.mqtt_topic.length)
    config.app.mqtt_topic = 'loxberry/app';

  if (!config.app.icon_path || !config.app.icon_path.length)
    config.app.icon_path = '/assets/icons/svg';

  if (!config.app.publish_structure)
    config.app.publish_structure = false;

  if (!config.miniserver)
    config.miniserver = {};

  if (!config.miniserver.mqtt_topic || !config.miniserver.mqtt_topic.length)
    config.miniserver.mqtt_topic = 'loxone';

  fs.writeFileSync(process.env.LBPCONFIG + '/lox2mqtt/default.json', JSON.stringify(config));
}
