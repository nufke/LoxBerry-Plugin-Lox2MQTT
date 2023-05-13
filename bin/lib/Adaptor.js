const util = require('util');
const events = require('events');

var Adaptor = function(structure, mqtt_topic_ms, mqtt_topic_app, icon_path) {
  this.structure = structure;
  this.mqtt_topic_ms = mqtt_topic_ms;
  this.mqtt_topic_app = mqtt_topic_app;
  this.icon_path = icon_path;

  this.device_info = this.structure.msInfo.serialNr;
  this.path2control = {};
  this.stateuuid2path = {};
  this.ispushbutton = {};
  this.mqtt_structure = {};

  this._build_paths();
};

util.inherits(Adaptor, events.EventEmitter);

Adaptor.prototype.set_value_for_uuid = function(uuid, value) {
  this.structure.set_value_for_uuid(uuid, value);
  this.emit('for_mqtt', this.mqtt_topic_ms + '/' + this.device_info + '/' + uuid, value, true);
};

Adaptor.prototype.get_serialnr = function() {
  return this.device_info;
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

Adaptor.prototype.publish_structure = function() {
  this.emit('for_mqtt', this.mqtt_topic_app + '/structure', JSON.stringify(this.structure), true);
}

Adaptor.prototype._process_states = function(obj) {
  let that = this;
  let states = {};
  if (obj) {
    Object.keys(obj.items).forEach(function(key) {
      if (Array.isArray(obj.items[key].uuid)) { // handle array,
        let list = [];
        obj.items[key].uuid.forEach(uuid => {
          list.push({ mqtt: that.mqtt_topic_ms + '/' + that.device_info + '/' + uuid })
        });
        states[camelToSnake(key)] = list;
      }
      else
        states[camelToSnake(key)] = { mqtt: that.mqtt_topic_ms + '/' + that.device_info + '/' + obj.items[key].uuid };
    });
  }
  return states;
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

function camelToSnake(str) {
  let s = str[0].toLowerCase() + str.slice(1);
  return s.replace(/[A-Z]/g, (c) => { return '_' + c.toLowerCase() });
}

module.exports = Adaptor;
