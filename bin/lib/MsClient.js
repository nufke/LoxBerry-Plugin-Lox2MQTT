const fs = require('fs');
const WebSocket = require("./WebSocketAPI.js");
const Adaptor = require("./Adaptor.js");
const MqttClient = require("./mqtt_builder.js");
const PMS = require("./pms.js");
const directories = require('./directories');
var fcache = require('flat-cache')

var MsClient = function(app, config, globalConfig, loxbuddyConfig, msid, mqtt_client) {
  if (!globalConfig.Miniserver[msid]) {
    app.logger.error("Miniserver with id " + msid + " not found.");
    return;
  }

  var lox_ms_client = WebSocket(app, config, globalConfig, msid);
  var lox_mqtt_adaptor = undefined;
  var pms = undefined; // push messaging service
  var pmsRegistered = false;
  var serialnr = undefined;
  var loxbuddyTopic = 'loxbuddy'; // TODO get via config

  // Check if we already have an MQTT client, otherwise create one
  if (!mqtt_client) {
    mqtt_client = MqttClient(globalConfig, app);
  }

  var cache = fcache.load('data', directories.data);
  var fromCache = cache.getKey('pmsRegistrations');
  var pmsRegistrations = fromCache ? fromCache : {};

  if (Object.keys(pmsRegistrations).length) {
    let keys = Object.keys(pmsRegistrations);
    app.logger.info("Messaging - Loaded registered Apps from cache: " + keys );
  }

  // check configuration variables
  var retain_message = config.miniserver[msid].retain_message ? config.miniserver[msid].retain_message : false;

  var mqtt_topic_ms = config.miniserver[msid].mqtt_topic_ms;
  if (mqtt_topic_ms === undefined || !mqtt_topic_ms.length) {
    mqtt_topic_ms = 'loxone';
  }

  function _push_message(obj) {
    Object.values(pmsRegistrations).forEach(item => {
      if (item.ids.find(id => id == serialnr)) {
        pms.postMessage(obj, item, serialnr).then(resp => {
          if (resp.code == 200) app.logger.info("Messaging - Push notification send to AppID: " + item.appId);
          else {
            app.logger.info("Messaging - Push notification failed to send to AppID: " + item.appId + " response: " + resp.status + ': ' + resp.message);
            delete pmsRegistrations[item.appId];
            app.logger.info("Messaging - AppID " + item.appId + " removed from registry.");
            cache.setKey('pmsRegistrations', pmsRegistrations);
            cache.save();
          }
        });
      }
    });
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
      // check for notifications when push messaging serive registration was successful
      if (pmsRegistered && isNotification) {
        let pushMessage = JSON.parse(data);
        if (pushMessage.message && pushMessage.title) {
          _push_message(pushMessage);
        } else {
          app.logger.info("Messaging - Incomplete Push Message received. Check title and message of the Push Message."); 
        }
      }
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
        let keys = Object.keys(pmsRegistrations);
        app.logger.info("Messaging - All registered Apps: " + (keys.length ? keys : 'none' ));
        cache.setKey('pmsRegistrations', pmsRegistrations);
        cache.save();
      }

      if (resp.pushMessage) {
        if (!resp.pushMessage.title || !resp.pushMessage.message) {
          app.logger.info("Messaging - Incomplete Push Message received. Check title and message of the Push Message."); 
          return;
        }
        let values = Object.values(pmsRegistrations);
        if (values.length == 0) {
          app.logger.info("Messaging - Push message received over MQTT associated to  Miniserver with ID " + serialnr + " but no registered apps found!");
          return;
        }
        values.forEach( item => {
          if (item.ids.find( id => id === serialnr)) {
            pms.postMessage(resp.pushMessage, item, serialnr).then(resp => { 
              if (resp.code == 200) app.logger.info("Messaging - Push message send to AppID: " + item.appId);
              else {
                app.logger.info("Messaging - Push message failed to send to AppID: " + item.appId + " response: " + resp.status + ': ' + resp.message);
                delete pmsRegistrations[item.appId];
                app.logger.info("Messaging - AppID " + item.appId + " removed from registry.");
                cache.setKey('pmsRegistrations', pmsRegistrations);
                cache.save();
              }
            });
          }
        });
      }

      if (resp.notification && config.miniserver[msid].publish_states) {
        if (resp.notification.title && resp.notification.message) {
          const notification = _reformat_notification(resp.notification);
          const uuid = lox_mqtt_adaptor.get_globalstates_uuid_from_key('globalstates/notifications');
          _publish_topic(mqtt_topic_ms + '/' + serialnr + '/' + uuid, JSON.stringify(notification));
        } else {
          app.logger.info("Messaging - Incomplete notification received. Check title and message of the notification message.");  
        }
      } else {
        app.logger.debug("MQTT Adaptor - Publising notifications over MQTT has been disabled by the user settings");
      }
    }
  });

};

module.exports = MsClient;
