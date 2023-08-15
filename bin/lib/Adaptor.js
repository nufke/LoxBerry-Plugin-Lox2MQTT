const util = require('util');
const events = require('events');
const Structure = require("node-lox-structure-file");

var Adaptor = function(app, data, mqtt_topic_ms) {
  this.data = data; // raw structure;
  this.structure = Structure.create_from_json(data,
    function(value) {
      app.logger.warn("MQTT Adaptor - Undefined control found in Loxone Structure: " +  JSON.stringify(value));
    }
  );
  this.mqtt_topic_ms = mqtt_topic_ms;
  this.serial_nr = this.structure.msInfo.serialNr;
  this.path2control = {};
  this.stateuuid2path = {};
  this.ispushbutton = {};
  this.mqtt_structure = {};

  this._build_paths();
};

util.inherits(Adaptor, events.EventEmitter);

Adaptor.prototype.set_value_for_uuid = function(uuid, value) {
  this.structure.set_value_for_uuid(uuid, value);
  this.emit('for_mqtt', this.mqtt_topic_ms + '/' + this.serial_nr + '/' + uuid, value);
};

Adaptor.prototype.get_serialnr = function() {
  return this.serial_nr;
}

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

Adaptor.prototype.get_topics_for_subscription = function() {
  // topics: mqtt_topic_ms/serialnr/uuid/cmd, mqtt_topic_ms/serialnr/uuid/<subcontrol>/cmd
  return [this.mqtt_topic_ms + '/+/+/cmd', this.mqtt_topic_ms + '/+/+/+/cmd'];
};

Adaptor.prototype.abort = function() {
  this.structure.removeAllListeners();
  this.structure = undefined;
  this.removeAllListeners();
};

Adaptor.prototype.publish_structure = function() { // NOTE: we publish the original structure
  this.emit('for_mqtt', this.mqtt_topic_ms + '/' + this.serial_nr + '/structure', JSON.stringify(this.data));
}

Adaptor.prototype._build_paths = function() {
  Object.keys(this.structure.controls.items).forEach(function(key) {
    var control = this.structure.controls.items[key];
    this._add_control(control);
    if (control.subControls !== undefined) {
      Object.keys(control.subControls.items).forEach(function(sub_key) {
        this._add_control(control.subControls.items[sub_key]);
      }, this);
    }
  }, this);

  this.path2control['globalstates'] = this.structure.globalStates;
  Object.keys(this.structure.globalStates).forEach(function(key) {
    this.stateuuid2path[this.structure.globalStates[key].uuid] = 'globalstates/' + key;
  }, this);
};

Adaptor.prototype._add_control = function(control) {
  var serialnr = this.structure.msInfo.serialNr;
  var path = this.mqtt_topic_ms + '/' + serialnr + '/' + control.uuidAction;
  this.path2control[path] = control;
}

module.exports = Adaptor;
