#!/usr/bin/env node

if (!process.env.NODE_CONFIG_DIR){
    process.env.NODE_CONFIG_DIR = process.env.LBPCONFIG + '/lox2mqtt';
}

var config = require("config");
const lox2mqtt = require('./lib/index.js');
const fs = require('fs');

try {
    var syscnffile = fs.readFileSync(process.env.LBSCONFIG + '/general.json');
    var syscnf = JSON.parse(syscnffile);
} catch (err) {
    console.log(err);
    return;
}

var logger = lox2mqtt.Logger(config.get('logging'));
var app = new lox2mqtt.App(logger);
var mqtt_client = lox2mqtt.mqtt_builder(syscnf, app);

// TODO add more miniservers
var lox_client = lox2mqtt.WebSocketAPI(syscnf.Miniserver[1],  app);
var lox_mqtt_adaptor = undefined;

app.on('exit', function(code) {
    if (lox_mqtt_adaptor){
        lox_mqtt_adaptor.abort();
    }
});

function _update_event(uuid, value){
    if (lox_mqtt_adaptor){
        lox_mqtt_adaptor.set_value_for_uuid(uuid, value);
    }
};

lox_client.on('update_event_text', _update_event);
lox_client.on('update_event_value', _update_event);

lox_client.on('get_structure_file', function(data) {
    if (lox_mqtt_adaptor){
        lox_mqtt_adaptor.abort();
    }

    lox_mqtt_adaptor = new lox2mqtt.Adaptor(lox2mqtt.Structure.create_from_json(data,
        function(value) {
            logger.warn("MQTT Structure - invalid type of control", value);
        }
    ));

    if (config.app.subscribe)
      mqtt_client.subscribe(lox_mqtt_adaptor.get_topics_for_subscription());

    lox_mqtt_adaptor.on('for_mqtt', function(topic, data, retain_){
        let payload = String(data);
        let options = { retain: retain_ };
        logger.debug("MQTT Adaptor - for mqtt: ", {topic: topic, data: payload});
        var fixedTopicName = topic.replace("+", "_").replace("#", "_")
        mqtt_client.publish(fixedTopicName, payload, options);
    });

    if (config.app.publish_structure)
      lox_mqtt_adaptor.publish_mqtt_structure();
});

mqtt_client.on('connect', function(conack){
    if (!lox_client.is_connected()){
        lox_client.connect();
    }
});

mqtt_client.on('message', function(topic, message, packet) {
    if (!lox_mqtt_adaptor){
        return;
    }
    var action = lox_mqtt_adaptor.get_command_from_topic(topic, message.toString());

    app.logger.debug("MQTT Adaptor - for miniserver: ", {uuidAction: action.uuidAction, command: action.command});

    if (!config.miniserver.readonly){
        lox_client.send_cmd(action.uuidAction, action.command);
    }else{
        app.logger.debug("MQTT Adaptor - readonly mode");
    }
});
