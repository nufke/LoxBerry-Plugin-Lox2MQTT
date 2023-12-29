const fs = require('fs');
const WebSocket = require("./WebSocketAPI.js");
const Adaptor = require("./Adaptor.js");
const MqttClient = require("./mqtt_builder.js");
const PMS = require("./pms.js");

var MsClient = function(app, config, globalConfig, loxbuddyConfig, msid, mqtt_client) {
  if (!globalConfig.Miniserver[msid]) {
    app.logger.error("Miniserver with id " + msid + " not found.");
    return;
  }

  var lox_ms_client = WebSocket(app, config, globalConfig, msid);
  var lox_mqtt_adaptor = undefined;
  var pms = undefined; // push messaging service
  var pmsRegistered = false;
  var pmsRegistrations = {};
  var serialnr = undefined;
  var loxbuddyTopic = 'loxbuddy'; // TODO get via config

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

  function _push_message(uuid, value) {
    // check if event was a notification of type 10 (=normal message)
    const key = lox_mqtt_adaptor.get_globalstates_key_from_uuid(uuid);
    if (key === 'globalstates/notifications') {
      let notification = JSON.parse(value.toString());
      if (Number(notification.type) == 10) {
        Object.values(pmsRegistrations).forEach(item => {
          if (item.ids.find(id => id == serialnr)) {
            pms.postMessage(notification, item, serialnr).then(statusOk => {
              if (statusOk) app.logger.info("Messaging - Push notification send to AppID: " + item.appId);
              else app.logger.info("Messaging - Push notification failed to send to AppID: " + item.appId);
            })
          }
        });
      }
    }
  }

  function _update_event(uuid, value) {
    if (lox_mqtt_adaptor) {
      lox_mqtt_adaptor.set_value_for_uuid(uuid, value);

      // check for notifications when push messaging serive registration was successful
      if (pmsRegistered) {
        _push_message(uuid, value);
      }
    }
  };

  function _publish_topic(topic, data) {
    let payload = String(data);
    let options = { retain: retain_message, qos: 1 };
    app.logger.debug("MQTT Adaptor - Publish topic: " + topic + ", payload: " + payload);
    var fixedTopicName = topic.replace("+", "_").replace("#", "_")
    mqtt_client.publish(fixedTopicName, payload, options);
  };

  lox_ms_client.on('update_event_text', _update_event);
  lox_ms_client.on('update_event_value', _update_event);
  lox_ms_client.on('update_event_daytimer', _update_event);
  lox_ms_client.on('update_event_weather', _update_event);

  lox_ms_client.on('get_structure_file', async function(structure) {
    if (lox_mqtt_adaptor) {
      lox_mqtt_adaptor.abort();
    }

    lox_mqtt_adaptor = new Adaptor(structure, mqtt_topic_ms);
    serialnr = lox_mqtt_adaptor.get_serialnr();

    if (loxbuddyConfig && 
        loxbuddyConfig.messaging &&
        loxbuddyConfig.messaging.url.length && 
        loxbuddyConfig.messaging.key.length) {

      pms = new PMS(loxbuddyConfig, app, lox_mqtt_adaptor);

      pms.checkRegistration(serialnr).then( resp => {
        if (resp.status == "success") {
          pmsRegistered = true;
          const pmsConfig = {
            messaging: {
              url: resp.message.url,
              key: loxbuddyConfig.messaging.key,
              id: serialnr
            }
          }
          _publish_topic(loxbuddyTopic, JSON.stringify(pmsConfig));
          app.logger.info("Messaging - Access to LoxBuddy Messaging Service sucessful");
        } else {
          app.logger.error("Messaging - Access to LoxBuddy Messaging Service failed. Check correctness of messaging URL or personal token!");
          pmsRegistered = false;
        }
      });
    } else {
      app.logger.warn("Messaging - No LoxBuddy Messaging Service configuration found.");
      pmsRegistered = false;
    }

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

  mqtt_client.on('message', function(topic, message, packet) {
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

    // register pmsToken for each app
    // TODO: get topic prefix via LoxBuddy config
    if (lox_mqtt_adaptor && message.length && (topic.search( loxbuddyTopic + '/cmd') > -1)) {
      let resp = JSON.parse(message.toString())

      if (resp.messagingService && (resp.messagingService.ids.length == 0) && pmsRegistrations[resp.messagingService.appId]) {
        delete pmsRegistrations[resp.messagingService.appId];
        app.logger.info("Messaging - Unregistered App: " + resp.messagingService.appId);
      }

      if (resp.messagingService && resp.messagingService.ids.length) {
        pmsRegistrations[resp.messagingService.appId] = resp.messagingService;
        app.logger.info("Messaging - Registered App: " + resp.messagingService.appId);
      }

      if (resp.messagingService) {
        app.logger.info("Messaging - All registered Apps: " + (Object.keys(pmsRegistrations).length ? Object.keys(pmsRegistrations) : 'none' ));
      }

      if (resp.pushMessage) {
        if (Object.values(pmsRegistrations).length == 0) {
          app.logger.info("Messaging - Push message received from Miniserver with ID " + serialnr + " but no registered apps found!");
          return;
        }
        Object.values(pmsRegistrations).forEach( item => {
          if (item.ids.find( id => id === serialnr)) {
            pms.postMessage(resp.pushMessage, item, serialnr).then( statusOk => { 
              if (statusOk) app.logger.info("Messaging - Push message send to AppID: " + item.appId);
              else app.logger.info("Messaging - Push message failed to send to AppID: " + item.appId);
            })
          }
        });
      }
    }
  });
};

module.exports = MsClient;
