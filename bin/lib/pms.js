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
    .then(data => { return data.status == 'success'; })
    .catch(error => {
      this.app.logger.error("Push Messaging Service server error: " + JSON.stringify(error));
    });
}

pms.prototype.postMessage = function(obj, target, serialnr) {

  function replace(origObj){
    let newObj = {}; 
    Object.keys(origObj).forEach(key => {
      typeof origObj[key] == 'object' ? replace(origObj[key]) : newObj[key]= String(origObj[key]);
    });
    return newObj;
  }

  const url = this.config.pms.url + '/api/v1/send';
  let method = 'POST';
  let data = replace(obj);
  let body = {
    token: target.token,
    data: { 
      ...data,
      icon: target.url + '/assets/icons/icon-512x512.png',
      badge: target.url + '/assets/icons/icon-72x72bw.png',
      click_action: target.url + '/app/home'  }
  };
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
  .then(data => { this.app.logger.debug('"PMS response received: ' + JSON.stringify(data)); return data.status == 'success'; })
  .catch(error => {
    this.app.logger.error("PMS server error: " + JSON.stringify(error));
  });
};

module.exports = pms;
