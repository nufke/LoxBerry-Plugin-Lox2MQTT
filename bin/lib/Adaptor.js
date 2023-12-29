const util = require('util');
const events = require('events');

var Adaptor = function(structure, mqtt_topic_ms) {
  this.structure = structure;
  this.mqtt_topic_ms = mqtt_topic_ms;
  this.serial_nr = this.structure.msInfo.serialNr;
  this.path2control = {};
  this.controlList = [];
  this.stateuuid2path = {};
  this.ispushbutton = {};
  this.mqtt_structure = {};
  this._build_paths();
};

util.inherits(Adaptor, events.EventEmitter);

Adaptor.prototype.set_value_for_uuid = function(uuid, value) {
  this.emit('publish_state', this.mqtt_topic_ms + '/' + this.serial_nr + '/' + uuid, value);
};

Adaptor.prototype.get_serialnr = function() {
  return this.serial_nr;
};

Adaptor.prototype.control_exists = function(uuid) {
  return (this.controlList.findIndex( item => item == uuid) > -1);
};

Adaptor.prototype.get_command_from_topic = function(topic, data) {
  var path_groups = topic.match('^(.+)/cmd$');
  if (!path_groups) {
    return {};
  }
  var control = this.path2control[path_groups[1]];
  if (!control) {
    return {};
  }
  return {
    'uuidAction': control.uuidAction,
    'command': data
  };
};

Adaptor.prototype.get_globalstates_key_from_uuid = function(uuid) {
  return this.stateuuid2path[uuid];
}

Adaptor.prototype.get_globalstates_uuid_from_key = function(value) {
  return Object.keys(this.stateuuid2path).find(uuid => this.stateuuid2path[uuid] === value );
}

Adaptor.prototype.is_notification = function(uuid) {
  return (this.get_globalstates_key_from_uuid(uuid) === 'globalstates/notifications');
}

Adaptor.prototype.get_topics_for_subscription = function() {
  // subscribe to following topics:
  // <mqtt_topic_ms>/<serialnr>/<uuid>/cmd
  // <mqtt_topic_ms>/<serialnr>/<uuid>/<subcontrol>/cmd
  // loxbuddy/cmd (used for PMS configuration, push messages and notifications)
  return [
    this.mqtt_topic_ms + '/+/+/cmd',
    this.mqtt_topic_ms + '/+/+/+/cmd',
    'loxbuddy/cmd'
  ]
};

Adaptor.prototype.publish_structure = function() { // NOTE: we publish the original structure
  this.emit('publish_structure', this.mqtt_topic_ms + '/' + this.serial_nr + '/structure', JSON.stringify(this.structure));
};

Adaptor.prototype._build_paths = function() {
  Object.keys(this.structure.controls).forEach(function(key) {
    var control = this.structure.controls[key];
    this._add_control(control);
    if (control.subControls !== undefined) {
      Object.keys(control.subControls).forEach(function(sub_key) {
        this._add_control(control.subControls[sub_key]);
      }, this);
    }
  }, this);

  this.path2control['globalstates'] = this.structure.globalStates;
  Object.keys(this.structure.globalStates).forEach(function(key) {
    this.stateuuid2path[this.structure.globalStates[key]] = 'globalstates/' + key;
  }, this);
};

Adaptor.prototype._add_control = function(control) {
  var path = this.mqtt_topic_ms + '/' + this.serial_nr + '/' + control.uuidAction;
  this.path2control[path] = control;
  this.controlList.push(control.uuidAction);
};

module.exports = Adaptor;
