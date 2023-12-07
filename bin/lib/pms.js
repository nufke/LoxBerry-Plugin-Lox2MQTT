// Push Messaging Service (PMS)
var pms = function(config, app) {
  this.config = config;
  this.app = app;
};

pms.prototype.getConfig = function(serialnr) {
  let url = this.config.pms.url + '/api/v1/config';
  let method = 'GET'
  let headers = {
    'Authorization': 'Bearer ' + this.config.pms.key,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'id': serialnr
  };
  return fetch(url, {
    method: method,
    headers: headers
  })
    .then(response => response.json()) // return any response type
    .then(data => data.status)
    .catch(error => {
      this.app.logger.error("PMS configuration error: " + JSON.stringify(error));
    });
}

pms.prototype.postMessage = function(msg, token) {
  console.log('postMessage', JSON.stringify(msg), token);
  let url = this.config.pms.url + '/api/v1/send';
  let method = 'POST'
  let headers = {
    'Authorization': 'Bearer ' + this.config.pms.key,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'id': msg.data.mac
  };
  let body = {
    'token': token,
    'notification': {
      'title': msg.title,
      'body': msg.message
    },
    'data': {
      'uid': msg.uid,
      'ts': String(msg.ts),
      'title': msg.title,
      'message': msg.message,
      'type': String(msg.type),
      'mac': msg.data.mac,
      'lvl': String(msg.data.lvl),
      'uuid': msg.data.uuid
    }
  };

  return fetch(url, {
    method: method,
    headers: headers,
    body: body
  })
  .then(response => response.json()) // return any response type
  .then(data => data.status)
  .catch(error => {
    this.app.logger.error("PMS send message error: " + JSON.stringify(error));
  });
};

module.exports = pms;
