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

  if (!config.logging) {
    config.logging = [];
    let file = {
      "File": {
        "filename": "../../../log/plugins/lox2mqtt/lox2mqtt.log",
        "timestamp": true,
        "level": "debug"
      }
    };
    config.logging.push(file);
  }

  if (!config.app)
    config.app = {
      "mqtt_topic": "loxberry/app",
      "icon_path": "/assets/icons/svg"
    };

  if (!config.miniserver)
    config.miniserver = {
      "1": {
        "mqtt_topic": "loxone",
        "publish_structure": false,
        "subscribe": true
      }
    }

  fs.writeFileSync(process.env.LBPCONFIG + '/lox2mqtt/default.json', JSON.stringify(config));
}
