const WebSocket = require("./WebSocketAPI.js");
const Adaptor = require("./Adaptor.js");
const MqttClient = require("./mqttClient.js");
const base64 = require('base-64');

const MsClient = function(app, config, globalConfig, msid, mqttClient) {
  if (!globalConfig.Miniserver[msid]) {
    app.logger.error("Miniserver with id " + msid + " not found.");
    return;
  }

  let msWebsocket = WebSocket(app, config, globalConfig, msid);
  let msAdapter = undefined;
  let msSerialNr = undefined;

  // Check if we already have an MQTT client, otherwise create one
  if (!mqttClient) {
    mqttClient = MqttClient(globalConfig, app);
  }

  // check configuration variables
  let retainMessage = config.miniserver[msid].retain_message | false;

  let mqttTopic = config.miniserver[msid].mqtt_topic_ms;
  if (mqttTopic === undefined || !mqttTopic.length) {
    mqttTopic = 'loxone';
  }

  function updateEvent(uuid, value) {
    if (msAdapter) {
      msAdapter.setValueForUuid(uuid, value);
    }
  }

  function publishTopic(topic, data) {
    let payload = String(data);
    let options = { retain: retainMessage, qos: 1 };
    let fixedTopicName = topic.replace("+", "_").replace("#", "_")
    app.logger.debug("MQTT Adaptor - Publish topic: " + topic + ", payload: " + payload);
    mqttClient.publish(fixedTopicName, payload, options);
  }

  function publishSecuredDetails() {
    let ms = globalConfig.Miniserver[msid];
    let details = msAdapter.getSecuredDetails();
    details.forEach( uuid => {
      fetch("http://" + ms.Ipaddress + ":" + ms.Port + "/jdev/sps/io/" + uuid + "/securedDetails",
      { method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic " + base64.encode(ms.Admin +  ":" + ms.Pass)
        }
      }).then( response => {
        if (response.status !== 200) {
          app.logger.error('Fetch error. Status code: ' + response.status);
          return;
        }
        response.json().then( data => {
          if (!data.LL.value) return;  // unexpected payload, do not publish
          let topic = mqttTopic + '/' + msSerialNr + '/' + uuid + '/securedDetails';
          publishTopic(topic, data.LL.value);
        });
      }).catch( error => {
        app.logger.error('Fetch error : ', error);
      });
    });
  }

  msWebsocket.on('update_event_text', updateEvent);
  msWebsocket.on('update_event_value', updateEvent);
  msWebsocket.on('update_event_daytimer', updateEvent);
  msWebsocket.on('update_event_weather', updateEvent);

  msWebsocket.on('get_structure_file', async function(structure) {
    if (msAdapter) {
      msAdapter.clear();
    }

    msAdapter = new Adaptor(structure, mqttTopic);
    msSerialNr = msAdapter.getSerialnr();

    if (config.miniserver[msid].subscribe) {
      mqttClient.subscribe(msAdapter.getTopics());
    }

    msAdapter.on('publish_state', function(topic, data) {
      if (config.miniserver[msid].publish_states) {
        publishTopic(topic, data);
      } else {
        app.logger.debug("MQTT Adaptor - Publising control states has been disabled by the user settings");
      }
    });

    msAdapter.on('publish_structure', function(topic, data) {
      if (config.miniserver[msid].publish_structure) {
        publishTopic(topic, data);
        publishSecuredDetails();
      } else {
        app.logger.debug("MQTT Adaptor - Publishing the structure has been disabled by the user settings");
      }
    });

    msAdapter.publishStructure();
  });

  mqttClient.on('connect', function(conack) {
    if (!msWebsocket.is_connected()) {
      msWebsocket.connect();
    }
  });

  mqttClient.on('message', function(topic, message, packet) {
    // only send to Miniserver if adapter exists and the serial number in the topic matches
    if (msAdapter && message.length && (topic.search(mqttTopic + "/" + msSerialNr) > -1)) {
      let action = msAdapter.getCommandFromTopic(topic, message.toString());
      app.logger.debug("MQTT Adaptor - for miniserver, uuidAction: " + action.uuidAction + ", command: ", + action.command);
      if (config.miniserver[msid].subscribe) {
        msWebsocket.send_cmd(action.uuidAction, action.command);
      } else {
        app.logger.debug("MQTT Adaptor - Miniserver in readonly mode");
      }
    }
  });

};

module.exports = MsClient;
