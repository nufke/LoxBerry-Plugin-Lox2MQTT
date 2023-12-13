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
    .then(data => { console.log('Push Messaging Service config status: ', data.status); return data.status; })
    .catch(error => {
      this.app.logger.error("Push Messaging Service server error: " + JSON.stringify(error));
    });
}

pms.prototype.postMessage = function(obj, target, serialnr) {
  let url = this.config.pms.url + '/api/v1/send';
  let method = 'POST';

  let body = {
    'token': target.token,
    'webpush': {
      'notification': {
        'title': obj.data.title ? obj.data.title : "no title",
        'body': obj.data.message ? obj.data.message : "no message",
        'icon': target.url + '/assets/icons/icon-512x512.png',
        'badge': target.url + '/assets/icons/icon-72x72bw.png',
        'click_action': target.url + '/app/home'
      }
    }
  };

  switch (obj.data.type) {
    // 10 = normal message
    case 10: body['data'] = { 
      'uid': obj.data.uid,
      'ts': String(obj.data.ts),
      'title': obj.data.title,
      'message': obj.data.message,
      'type': String(obj.data.type),
      'mac': obj.data.mac,
      'lvl': String(obj.data.lvl),
      'uuid': obj.data.uuid
      };
      break;
    // 11 = combined message
    case 11: body['data'] = {
      'uids': obj.data.ids,
      'type': String(obj.data.type)
      };
  }

  let headers = {
    'Authorization': 'Bearer ' + this.config.pms.key,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'id': serialnr
  };

  return fetch(url, {
    method: method,
    headers: headers,
    body:  JSON.stringify(body)
  })
  .then(response => response.json()) // return any response type
  .then(data => { console.log('Push Messaging Service send status: ', data.status); return data.status; })
  .catch(error => {
    this.app.logger.error("Push Messaging Service server error: " + JSON.stringify(error));
  });
};

module.exports = pms;
