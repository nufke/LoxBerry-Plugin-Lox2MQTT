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
  var serialnr = undefined;

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

  function _generate_lox_UUID() {
    return 'xxxxxxxx-xxxx-6xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
  }
  
  function _reformat_notification(obj) {
    const mac = obj.mac ? obj.mac : (obj.data && obj.data.mac ? obj.data.mac : serialnr);
    const lvl = obj.lvl ? String(obj.lvl) : ( obj.data && obj.data.lvl ? String(obj.data.lvl) : '0');
    const uuid = obj.uuid ? obj.uuid : ( obj.data && obj.data.uuid ? obj.data.uuid : '');
    return {
      uid: obj.uid ? obj.uid : _generate_lox_UUID(),                 // unique message id, generated if not specified
      ts: obj.ts ? String(obj.ts) : String(Date.now()).slice(0, -3), // unix time stamp in seconds, generated if not specified
      title: obj.title ? obj.title : 'no title',                     // message title or 'no title' if not specified
      message: obj.message ? obj.message : 'no message body',        // message body or 'no message body' if not specified
      type: obj.type ? String(obj.type) : '10',                      // message type or 10 (= normal message) if not specified
      mac: mac,                                                      // mac of targeted miniserver
      lvl: lvl,                                                      // level, 1 = Info, 2 = Error, 3 = SystemError, 0 = unknown
      uuid: uuid                                                     // uuid of control, or empty string if not specified 
    }
  }

  function _update_event(uuid, value) {
    if (lox_mqtt_adaptor) {
      const isNotification = lox_mqtt_adaptor.is_notification(uuid);
      const data = isNotification ? JSON.stringify(_reformat_notification(JSON.parse(value))) : value;
      lox_mqtt_adaptor.set_value_for_uuid(uuid, data);
    }
  }

  function _publish_topic(topic, data) {
    let payload = String(data);
    let options = { retain: retain_message, qos: 1 };
    app.logger.debug("MQTT Adaptor - Publish topic: " + topic + ", payload: " + payload);
    var fixedTopicName = topic.replace("+", "_").replace("#", "_")
    mqtt_client.publish(fixedTopicName, payload, options);
  }

  lox_ms_client.on('update_event_text', _update_event);
  lox_ms_client.on('update_event_value', _update_event);
  lox_ms_client.on('update_event_daytimer', _update_event);
  lox_ms_client.on('update_event_weather', _update_event);

  lox_ms_client.on('get_structure_file', async function(structure) {
    if (lox_mqtt_adaptor) {
      lox_mqtt_adaptor.clear();
    }

    lox_mqtt_adaptor = new Adaptor(structure, mqtt_topic_ms);
    serialnr = lox_mqtt_adaptor.get_serialnr();

    if (config.miniserver[msid].subscribe) {
      mqtt_client.subscribe(lox_mqtt_adaptor.get_topics_for_subscription());
    }

    lox_mqtt_adaptor.on('publish_state', function(topic, data) {
      if (config.miniserver[msid].publish_states) {
        _publish_topic(topic, data);
      } else {
        app.logger.debug("MQTT Adaptor - Publising control states has been disabled by the user settings");
      }
    });

    lox_mqtt_adaptor.on('publish_structure', function(topic, data) {
      if (config.miniserver[msid].publish_structure) {
        _publish_topic(topic, data);
      } else {
        app.logger.debug("MQTT Adaptor - Publishing the structure has been disabled by the user settings");
      }
    });

    lox_mqtt_adaptor.publish_structure();
  });

  mqtt_client.on('connect', function(conack) {
    if (!lox_ms_client.is_connected()) {
      lox_ms_client.connect();
    }
  });

  mqtt_client.on('message', async function(topic, message, packet) {
    // only send to Miniserver if adapter exists and the serial number in the topic matches
    if (lox_mqtt_adaptor && message.length && (topic.search(mqtt_topic_ms + "/" + serialnr) > -1)) {
      let action = lox_mqtt_adaptor.get_command_from_topic(topic, message.toString());
      app.logger.debug("MQTT Adaptor - for miniserver, uuidAction: " + action.uuidAction + ", command: ", + action.command);
      if (config.miniserver[msid].subscribe) {
        lox_ms_client.send_cmd(action.uuidAction, action.command);
      } else {
        app.logger.debug("MQTT Adaptor - Miniserver in readonly mode");
      }
    }
  });

};

module.exports = MsClient;
