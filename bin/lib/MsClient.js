const fs = require('fs');

const WebSocket = require("./WebSocketAPI.js");
const Adaptor = require("./Adaptor.js");
const MqttClient = require("./mqtt_builder.js");

var MsClient = function(app, config, globalConfig, msid, mqtt_client) {

  if (!globalConfig.Miniserver[msid]) {
    app.logger.error("Miniserver with id " + msid + " not found.");
    return;
  }

  var lox_ms_client = WebSocket(app, config, globalConfig, msid);
  var lox_mqtt_adaptor = undefined;

  // Check if we already have an MQTT client, otherwise create one
  if (!mqtt_client) {
    mqtt_client = MqttClient(globalConfig, app);
  }

  // check configuration variables
  var retain_message = config.miniserver[msid].retain_message ? config.miniserver[msid].retain_message : false;

  var mqtt_topic_ms = config.miniserver[msid].mqtt_topic_ms;
  if (mqtt_topic_ms === undefined || !mqtt_topic_ms.length) {
    mqtt_topic_ms = 'loxone';
  }

  function _update_event(uuid, value) {
    if (lox_mqtt_adaptor) {
      lox_mqtt_adaptor.set_value_for_uuid(uuid, value);
    }
  };

  function _publish_topic(topic, data) {
    let payload = String(data);
    let options = { retain: retain_message };
    app.logger.debug("MQTT Adaptor - Publish topic: " + topic + ", payload: " + payload);
    var fixedTopicName = topic.replace("+", "_").replace("#", "_")
    mqtt_client.publish(fixedTopicName, payload, options);
  };

  lox_ms_client.on('update_event_text', _update_event);
  lox_ms_client.on('update_event_value', _update_event);

  lox_ms_client.on('get_structure_file', function(data) {
    if (lox_mqtt_adaptor) {
      lox_mqtt_adaptor.abort();
    }

    lox_mqtt_adaptor = new Adaptor(app, data, mqtt_topic_ms);

    if (config.miniserver[msid].subscribe) {
      mqtt_client.subscribe(lox_mqtt_adaptor.get_topics_for_subscription());
    }

    lox_mqtt_adaptor.on('for_mqtt_state', function(topic, data) {
      if (config.miniserver[msid].publish_states) {
        _publish_topic(topic, data);
      } else {
        app.logger.debug("MQTT Adaptor - Publising control states has been disabled by the user settings");
      }
    });

    lox_mqtt_adaptor.on('for_mqtt_structure', function(topic, data) {
      if (config.miniserver[msid].publish_structure) {
        _publish_topic(topic, data);
      } else {
        app.logger.debug("MQTT Adaptor - Publishing the structure has been disabled by the user settings");
      }
    });

    lox_mqtt_adaptor.publish_structure();
  });

  app.on('exit', function(code) {
    if (lox_mqtt_adaptor) {
      lox_mqtt_adaptor.abort();
    }
  });

  mqtt_client.on('connect', function(conack) {
    if (!lox_ms_client.is_connected()) {
      lox_ms_client.connect();
    }
  });

  mqtt_client.on('message', function(topic, message, packet) {
    // only send to Miniserver if adapter exists and the serial number in the topic matches
    if ((!lox_mqtt_adaptor) && (topic.search(mqtt_topic_ms + "/" + lox_mqtt_adaptor.get_serialnr()) != 0)) {
      return;
    }

    let action = lox_mqtt_adaptor.get_command_from_topic(topic, message.toString());

    app.logger.debug("MQTT Adaptor - for miniserver, uuidAction: " + action.uuidAction + ", command: ", + action.command);

    if (config.miniserver[msid].subscribe) {
      lox_ms_client.send_cmd(action.uuidAction, action.command);
    } else {
      app.logger.debug("MQTT Adaptor - Miniserver in readonly mode");
    }
  });
};

module.exports = MsClient;
