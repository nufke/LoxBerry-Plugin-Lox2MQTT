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

    Object.keys(globalConfig.Miniserver).forEach(key => {
        if (!config.miniserver[key]) {
            let ms = {
                "mqtt_topic_ms": "loxone",
                "publish_structure": false,
                "publish_states": false,
                "subscribe": false,
                "mqtt_topic_app": "loxberry/app",
                "icon_path": "/assets/icons/svg"
            };
            config.miniserver[key] = ms;
        }
    });

    fs.writeFileSync(process.env.LBPCONFIG + '/lox2mqtt/default.json', JSON.stringify(config));
}
