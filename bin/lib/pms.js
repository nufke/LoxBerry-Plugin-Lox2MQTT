// Push Messaging Service (PMS)
var pms = function(config, app, adapter) {
  this.config = config;
  this.app = app;
  this.adapter = adapter;
};

pms.prototype.checkRegistration = function(serialnr) {
  let url = this.config.messaging.url;
  let method = 'GET'
  let headers = {
    'Authorization': 'Bearer ' + this.config.messaging.key,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'id': serialnr
  };
  return fetch(url, {
    method: method,
    headers: headers
  })
    .then(response => response.json()) // return any response type
    .then(data => data )
    .catch(error => {
      this.app.logger.error("Push Messaging Service server error: " + JSON.stringify(error));
    });
}

pms.prototype.postMessage = function(obj, target, serialnr) {
  const controlExists = obj.uuid ? this.adapter.control_exists(obj.uuid) : 
                       ( obj.data && obj.data.uuid ? this.adapter.control_exists(obj.data.uuid) : false);
  const url = this.config.messaging.url + '/send';
  const method = 'POST';
  let body = {
    token: target.token,
    data: { 
      ...obj,
      icon: target.url + '/assets/icons/icon-512x512.png',
      badge: target.url + '/assets/icons/icon-72x72bw.png',
      click_action: controlExists ? target.url + '/app/home/' + obj.mac + '/' + obj.uuid : (target.url + '/notifications')
    },
    android: {
      priority: 'high'
    },
    apns: {
      headers: {
        'apns-priority': '5'
      }
    },
    webpush: {
      headers: {
        Urgency: 'high'
      }
    }
  };

  let headers = {
    'Authorization': 'Bearer ' + this.config.messaging.key,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'id': serialnr
  };

  this.app.logger.debug("Messaging - Message created: " + JSON.stringify(body));

  return fetch(url, {
    method: method,
    headers: headers,
    body:  JSON.stringify(body)
  })  
  .then(response => response.json()) // return any response type
  .then(data => { this.app.logger.debug("Messaging - Response received: " + JSON.stringify(data)); return data.status == 'success'; })
  .catch(error => {
    this.app.logger.error("Messaging - Server error: " + JSON.stringify(error));
  });
};

module.exports = pms;
