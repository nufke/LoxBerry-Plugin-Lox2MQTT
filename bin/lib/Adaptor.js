const util = require('util');
const events = require('events');

const Adaptor = function(structure, mqttTopic) {
  this.structure = structure;
  this.mqttTopic = mqttTopic;
  this.msSerialNr = this.structure.msInfo.serialNr;
  this.path2control = {};
  this.controlList = [];
  this.stateuuid2path = {};
  this.buildPaths();
};

util.inherits(Adaptor, events.EventEmitter);

Adaptor.prototype.clear = function() {
  this.structure = undefined;
};

Adaptor.prototype.setValueForUuid = function(uuid, value) {
  this.emit('publish_state', this.mqttTopic + '/' + this.msSerialNr + '/' + uuid, value);
};

Adaptor.prototype.getSerialnr = function() {
  return this.msSerialNr;
};

Adaptor.prototype.control_exists = function(uuid) {
  return (this.controlList.findIndex( item => item == uuid) > -1);
};

Adaptor.prototype.getSecuredDetails = function() {
  return Object.values(this.structure.controls).filter( item => item.securedDetails == true).map(item => item.uuidAction);
}

Adaptor.prototype.getCommandFromTopic = function(topic, data) {
  const path_groups = topic.match('^(.+)/cmd$');
  if (!path_groups) {
    return {};
  }
  const control = this.path2control[path_groups[1]];
  if (!control) {
    return {};
  }
  return {
    'uuidAction': control.uuidAction,
    'command': data
  };
};

Adaptor.prototype.getTopics = function() {
  // subscribe to following topics:
  // <mqttTopic>/<serialnr>/<uuid>/cmd
  // <mqttTopic>/<serialnr>/<uuid>/<subcontrol>/cmd
  return [
    this.mqttTopic + '/+/+/cmd',
    this.mqttTopic + '/+/+/+/cmd'
  ]
};

Adaptor.prototype.publishStructure = function() { // NOTE: we publish the original structure
  this.emit('publish_structure', this.mqttTopic + '/' + this.msSerialNr + '/structure', JSON.stringify(this.structure));
};

Adaptor.prototype.buildPaths = function() {
  Object.keys(this.structure.controls).forEach(function(key) {
    const control = this.structure.controls[key];
    this.addControl(control);
    if (control.subControls !== undefined) {
      Object.keys(control.subControls).forEach(function(sub_key) {
        this.addControl(control.subControls[sub_key]);
      }, this);
    }
  }, this);

  this.path2control['globalstates'] = this.structure.globalStates;
  Object.keys(this.structure.globalStates).forEach(function(key) {
    this.stateuuid2path[this.structure.globalStates[key]] = 'globalstates/' + key;
  }, this);
};

Adaptor.prototype.addControl = function(control) {
  const path = this.mqttTopic + '/' + this.msSerialNr + '/' + control.uuidAction;
  this.path2control[path] = control;
  this.controlList.push(control.uuidAction);
};

module.exports = Adaptor;
