#!/usr/bin/env node

const fs = require('fs');

try {
    var configfile = fs.readFileSync(process.env.LBPCONFIG + '/lox2mqtt/default.json');
    var config = JSON.parse(configfile);
} catch (err) {
    console.log(err);
}

try {
    var syscnffile = fs.readFileSync(process.env.LBSCONFIG + '/general.json');
    var syscnf = JSON.parse(syscnffile);
} catch (err) {
    console.log(err);
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

    if (!config.miniserver) {
        config.miniserver = {};
    }

    Object.keys(syscnf.Miniserver).forEach(key => {
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
