const fs = require('fs');

const WebSocket = require("./WebSocketAPI.js");
const Adaptor = require("./Adaptor.js");
const Structure = require("node-lox-structure-file");
const MqttClient = require("./mqtt_builder.js");

var MsClient = function (app, config, msid, mqtt_client) {

    try {
        var syscnffile = fs.readFileSync(process.env.LBSCONFIG + '/general.json');
        var syscnf = JSON.parse(syscnffile);
    } catch (err) {
        console.log(err);
        return;
    }

    // TODO add more miniservers
    var lox_ms_client = WebSocket(app, syscnf, msid);
    var lox_mqtt_adaptor = undefined;

    // Check if we already have an MQTT client, otherwise create one
    if (!mqtt_client) {
        mqtt_client = MqttClient(syscnf, app);
    }

    // check configuration variables
    var mqtt_topic_app = config.app.mqtt_topic;
    var icon_path = config.app.icon_path;
    var mqtt_topic_lox = config.miniserver[msid].mqtt_topic;

    if (mqtt_topic_lox === undefined || !mqtt_topic_lox.length) {
        mqtt_topic_lox = 'loxone';
    }

    if (mqtt_topic_app === undefined || !mqtt_topic_app.length) {
        mqtt_topic_app = 'loxberry/app';
    }

    if (icon_path === undefined || !icon_path.length) {
        icon_path = '/assets/icons/svg';
    }

    function _update_event(uuid, value) {
        if (lox_mqtt_adaptor) {
            lox_mqtt_adaptor.set_value_for_uuid(uuid, value);
        }
    };

    lox_ms_client.on('update_event_text', _update_event);
    lox_ms_client.on('update_event_value', _update_event);

    lox_ms_client.on('get_structure_file', function (data) {
        if (lox_mqtt_adaptor) {
            lox_mqtt_adaptor.abort();
        }

        lox_mqtt_adaptor = new Adaptor(Structure.create_from_json(data,
            function (value) {
                app.logger.warn("MQTT Structure - invalid type of control", value);
            }
        ), mqtt_topic_lox, mqtt_topic_app, icon_path);

        if (config.miniserver[msid].subscribe)
            mqtt_client.subscribe(lox_mqtt_adaptor.get_topics_for_subscription());

        lox_mqtt_adaptor.on('for_mqtt', function (topic, data, retain_) {
            let payload = String(data);
            let options = { retain: retain_ };
            app.logger.debug("MQTT Adaptor - for mqtt: ", { topic: topic, data: payload });
            var fixedTopicName = topic.replace("+", "_").replace("#", "_")
            mqtt_client.publish(fixedTopicName, payload, options);
        });

        if (config.miniserver[msid].publish_structure)
            lox_mqtt_adaptor.publish_mqtt_structure();
    });

    app.on('exit', function (code) {
        if (lox_mqtt_adaptor) {
            lox_mqtt_adaptor.abort();
        }
    });

    mqtt_client.on('connect', function (conack) {
        if (!lox_ms_client.is_connected()) {
            lox_ms_client.connect();
        }
    });

    mqtt_client.on('message', function (topic, message, packet) {
        // only send to Miniserver if adapter exists and the serial number in the topic matches
        if ((!lox_mqtt_adaptor) && (topic.search(mqtt_topic_lox + "/" + lox_mqtt_adaptor.get_serialnr()) != 0)) {
            return;
        }

        var action = lox_mqtt_adaptor.get_command_from_topic(topic, message.toString());

        app.logger.debug("MQTT Adaptor - for miniserver: ", { uuidAction: action.uuidAction, command: action.command });

        if (config.miniserver[msid].subscribe) {
            lox_ms_client.send_cmd(action.uuidAction, action.command);
        } else {
            app.logger.debug("MQTT Adaptor - readonly mode");
        }
    });

};

module.exports = MsClient;
