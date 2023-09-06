const node_lox_ws_api = require("node-lox-ws-api");

function _limit_string(text, limit) {
  if (text.length <= limit) {
    return text;
  }
  return text.substr(0, limit) + '...(' + text.length + ')';
}

var WebSocketAPI = function(app, config, globalConfig, msid) {
  var miniserver = globalConfig.Miniserver[msid];
  // FIXME: currently only support for http port for communication with Miniserver(s)
  // var host = miniserver.Ipaddress + ":" + ((miniserver.Preferhttps==='1') ? miniserver.Porthttps : miniserver.Port);
  var host = miniserver.Ipaddress + ":" + miniserver.Port;
  const user = config.miniserver[msid].other_user ? config.miniserver[msid].user : miniserver.Admin_raw;
  const pass = config.miniserver[msid].other_user ? config.miniserver[msid].pass : miniserver.Pass_raw;

  app.logger.info("WebSocketAPI " + host + " - try to connect to Miniserver as user " + user + "...");
  var client = new node_lox_ws_api(host, user, pass, true, 'Token-Enc');
  var text_logger_limit = 100;

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
    var data = {
      type: message.type,
    };
    switch (message.type) {
      case 'json':
        data.json = _limit_string(JSON.stringify(message.json), text_logger_limit);
        break;
      case 'control':
        data.control = message.control;
        data.value = message.value;
        data.code = message.code;
        break;
      default:
        data.text = _limit_string(message.data, text_logger_limit);
    }
    app.logger.debug("WebSocketAPI " + host + " - received text message: " + JSON.stringify(data));
  });

  client.on('message_file', function(message) {
    var data = {
      type: message.type,
      filename: message.filename,
    };
    switch (message.type) {
      case 'json':
        data.json = _limit_string(JSON.stringify(message.data), text_logger_limit);
        break;
      case 'binary':
        data.length = message.data, length;
        break;
      default:
        data.text = _limit_string(message.data, text_logger_limit);
    }
    app.logger.debug("WebSocketAPI " + host + " - received file: " + JSON.stringify(data));
  });

  function _update_event(uuid, evt) {
    var data = {
      uuid: uuid,
      'event': _limit_string(JSON.stringify(evt), text_logger_limit),
    };
    app.logger.debug("WebSocketAPI " + host + " - received update event: " + JSON.stringify(data));
  }

  client.on('update_event_value', _update_event);
  client.on('update_event_text', _update_event);
  client.on('update_event_daytimer', _update_event);
  client.on('update_event_weather', _update_event);

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
