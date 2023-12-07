#!/usr/bin/env node

const fs = require('fs');
const directories = require('./lib/directories');
const configFile = `${directories.config}/default.json`;
const globalConfigFile = `${directories.homedir}/config/system/general.json`;

let globalConfig = require(globalConfigFile);
let config;

try {
  const configData = fs.readFileSync(configFile);
  config = JSON.parse(configData);
} catch (err) {
  // in case of an error, the config file is not found
  // or the content is not compliant to JSON format.
  // print, the error, but proceed with the creation of the
  // config file, since it is considered empty
  console.log(err);
}

update_config(config);

function update_config(config) {

  if (!config)
    config = {};

  if (!config.miniserver) {
    config.miniserver = {};
  }

  if (!config.pms) {
    config['pms'] = 
    {
      url: "",
      key: ""
    };
  }

  Object.keys(globalConfig.Miniserver).forEach(key => {
    if (!config.miniserver[key]) {
      let ms = {
        mqtt_topic_ms: "loxone",
        publish_structure: false,
        publish_states: false,
        retain_message: false,
        subscribe: false,
        other_user: false,
        user: null,
        pass: null,
      };
      config.miniserver[key] = ms;

    } else { // exists, check/update each individual item
      let ms = config.miniserver[key];
      if (!ms.mqtt_topic_ms) ms.mqtt_topic_ms = "loxone";
      if (!ms.publish_structure) ms.publish_structure = false;
      if (!ms.publish_states) ms.publish_states = false;
      if (!ms.retain_message) ms.retain_message = false;
      if (!ms.subscribe) ms.subscribe = false;
      if (!ms.other_user) ms.other_user = false;
      if (!ms.user) ms.user = null;
      if (!ms.pass) ms.pass = null;
    }
  });

  fs.writeFileSync(process.env.LBPCONFIG + '/lox2mqtt/default.json', JSON.stringify(config));
}
