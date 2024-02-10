const node_lox_ws_api = require("node-lox-ws-api");

const WebSocketAPI = function(app, config, globalConfig, msid) {
  const miniserver = globalConfig.Miniserver[msid];
  // FIXME: currently only support for http port for communication with Miniserver(s)
  // const host = miniserver.Ipaddress + ":" + ((miniserver.Preferhttps==='1') ? miniserver.Porthttps : miniserver.Port);
  const host = miniserver.Ipaddress + ":" + miniserver.Port;
  const user = config.miniserver[msid].other_user ? config.miniserver[msid].user : miniserver.Admin_raw;
  const pass = config.miniserver[msid].other_user ? config.miniserver[msid].pass : miniserver.Pass_raw;

  function limitString(text, limit) {
    if (text.length <= limit) {
      return text;
    }
    return text.substr(0, limit) + '...(' + text.length + ')';
  }

  app.logger.info("WebSocketAPI " + host + " - try to connect to Miniserver as user " + user + "...");
  const client = new node_lox_ws_api(host, user, pass, true, 'Token-Enc');
  const LogLimit = 100; // TODO configuration item

  app.on('exit', function(code) {
    client.abort();
  });

  client.on('connect', function() {
    app.logger.info("WebSocketAPI " + host + " - connect");
  });

  client.on('authorized', function() {
    app.logger.info("WebSocketAPI " + host + " - authorized");
  });

  client.on('connect_failed', function(error, reason) {
    app.logger.error("WebSocketAPI " + host + " - connect failed: " + reason);
  });

  client.on('connection_error', function(error, reason) {
    app.logger.error("WebSocketAPI " + host + " - connection error: " + reason);
  });

  client.on('close', function(info, reason) {
    app.logger.info("WebSocketAPI " + host + " - close: " + reason);
  });

  client.on('send', function(message) {
    app.logger.debug("WebSocketAPI " + host + " - send message: " + message);
  });

  client.on('message_text', function(message) {
    let data = {
      type: message.type,
    };
    switch (message.type) {
      case 'json':
        data.json = limitString(JSON.stringify(message.json), LogLimit);
        break;
      case 'control':
        data.control = message.control;
        data.value = message.value;
        data.code = message.code;
        break;
      default:
        data.text = limitString(message.data, LogLimit);
    }
    app.logger.debug("WebSocketAPI " + host + " - received text message: " + JSON.stringify(data));
  });

  client.on('message_file', function(message) {
    let data = {
      type: message.type,
      filename: message.filename,
    };
    switch (message.type) {
      case 'json':
        data.json = limitString(JSON.stringify(message.data), LogLimit);
        break;
      case 'binary':
        data.length = message.data, length;
        break;
      default:
        data.text = limitString(message.data, LogLimit);
    }
    app.logger.debug("WebSocketAPI " + host + " - received file: " + JSON.stringify(data));
  });

  function updateEvent(uuid, evt) {
    const data = {
      uuid: uuid,
      'event': limitString(JSON.stringify(evt), LogLimit),
    };
    app.logger.debug("WebSocketAPI " + host + " - received update event: " + JSON.stringify(data));
  }

  client.on('update_event_value', updateEvent);
  client.on('update_event_text', updateEvent);
  client.on('update_event_daytimer', updateEvent);
  client.on('update_event_weather', updateEvent);

  client.on('message_invalid', function(message) {
    app.logger.warn("WebSocketAPI " + host + " - invalid message: " + JSON.stringify(message));
  });

  client.on('keepalive', function(time) {
    app.logger.debug("WebSocketAPI " + host + " - keepalive (" + time + "ms)");
  });

  client.on('message_header', function(header) {
    app.logger.debug("WebSocketAPI " + host + " - received message header (" + header.next_state() + "): "+ JSON.stringify(header));
  });

  client.on('message_event_table_values', function(messages) {
    app.logger.debug("WebSocketAPI " + host + " - received value messages: " + messages.length);
  });

  client.on('message_event_table_text', function(messages) {
    app.logger.debug("WebSocketAPI " + host + "- received text messages: " + messages.length);
  });

  client.on('get_structure_file', function(data) {
    app.logger.debug("WebSocketAPI " + host + "- get structure file " + data.lastModified);
  });

  client.on('auth_failed', function() {
    app.logger.debug("WebSocketAPI " + host + " - authorization failed");
  });

  client.on('error', function() {
    app.logger.debug("WebSocketAPI " + host + " - error");
  });

  client.on('close_failed', function() {
    app.logger.debug("WebSocketAPI " + host + " - close failed");
  });

  return client;
};

module.exports = WebSocketAPI;
