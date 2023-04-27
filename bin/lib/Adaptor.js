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

Adaptor.prototype.publish_mqtt_structure = function() {
  let categories = Object.values(this.structure.categories.items);
  let rooms = Object.values(this.structure.rooms.items);
  let controls = Object.values(this.structure.controls.items);

  categories.sort((a, b) => { return a.name.localeCompare(b.name); }) // sort A-Z
  rooms.sort((a, b) => { return a.name.localeCompare(b.name); }) // sort A-Z
  controls.sort((a, b) => { return a.name.localeCompare(b.name); }) // sort A-Z

  this.mqtt_structure.categories = {};
  this.mqtt_structure.rooms = {};
  this.mqtt_structure.controls = {};

  Object.keys(categories).forEach(key => {
    let category = categories[key];
    let mqtt_uuid = this.device_info + '/' + category.uuid;
    this.mqtt_structure.categories[mqtt_uuid] =
    {
      hwid: this.device_info,
      uuid: category.uuid,
      mqtt_cmd: this.mqtt_topic_ms + '/' + mqtt_uuid + '/cmd',
      name: category.name,
      type: category.type,
      icon: { href: this.icon_path + '/' + category.image },
      is_favorite: category.isFavorite,
      is_visible: true,
      is_protected: category.isSecured,
      order: [
        category.name.toLowerCase().charCodeAt(0) - 86, /* order as listitem (1=highest) */
        11 - category.defaultRating                   /* order as favorite (1=highest) */
      ]
    };
  });

  Object.keys(rooms).forEach(key => {
    let room = rooms[key];
    let mqtt_uuid = this.device_info + '/' + room.uuid;
    this.mqtt_structure.rooms[mqtt_uuid] =
    {
      hwid: this.device_info,
      uuid: room.uuid,
      mqtt_cmd: this.mqtt_topic_ms + '/' + mqtt_uuid + '/cmd',
      name: room.name,
      type: room.type,
      icon: {
        href: this.icon_path + '/' + room.image,
        color: room.color
      },
      is_favorite: room.isFavorite,
      is_visible: true,
      is_protected: room.isSecured,
      order: [
        room.name.toLowerCase().charCodeAt(0) - 86, /* order as listitem (1=highest) */
        11 - room.defaultRating                   /* order as favorite (1=highest) */
      ]
    };
  });

  Object.keys(controls).forEach(key => {
    let that = this;
    let control = controls[key];
    let mqtt_uuid = this.device_info + '/' + control.uuidAction;
    if (control.defaultIcon && (control.defaultIcon.length > 0)) {
      icon = this.icon_path + '/' + control.defaultIcon;
      if (icon.search(".svg") == -1) // ext not found
        icon = icon + ".svg";
    }
    else
      if (control.type === 'Daytimer') {
        icon = this.icon_path + '/IconsFilled/daytimer.svg'; // TODO missing shipped lib?
      }
      else // take icon from category
        icon = Object.values(this.mqtt_structure.categories).find(element => element.uuid === control.category).icon.href;

    let details = {};
    if (control.details !== undefined)
      Object.keys(control.details).forEach(function(key) { details[camelToSnake(key)] = control.details[key] });

    let subcontrols = {};
    if (control.subControls !== undefined)
      Object.keys(control.subControls.items).forEach(key => {
        let sub_uuid = this.device_info + '/' + control.subControls.items[key].uuidAction;
        subcontrols[sub_uuid] =
        {
          uuid: control.subControls.items[key].uuidAction,
          name: control.subControls.items[key].name,
          mqtt_cmd: this.mqtt_topic_ms + '/' + sub_uuid + '/cmd',
          type: control.subControls.items[key].type,
          is_favorite: control.subControls.items[key].isFavorite,
          is_visible: true,
          is_protected: control.subControls.items[key].isSecured,
          states: that._process_states(control.subControls.items[key].states)
        };
      });

    this.mqtt_structure.controls[mqtt_uuid] =
    {
      hwid: this.device_info,
      uuid: control.uuidAction,
      mqtt_cmd: this.mqtt_topic_ms + '/' + mqtt_uuid + '/cmd',
      name: control.name,
      defaultIcon: control.defaultIcon,
      icon: { href: icon },
      type: control.type,
      room: control.room,
      category: control.category,
      is_favorite: (control.defaultRating > 0),
      is_visible: true,
      is_protected: control.isSecured,
      details: details,
      states: that._process_states(control.states),
      subcontrols: subcontrols,
      order: [
        control.name.toLowerCase().charCodeAt(0) - 86, /* order as listitem (1=highest) */
        control.name.toLowerCase().charCodeAt(0) - 86, /* order as favorite (1=highest) */
        control.isFavorite ? (11 - control.defaultRating) : 0 /* order for homepage (1=highest) */
      ]
    };
  });

  this.emit('for_mqtt', this.mqtt_topic_app + '/structure', JSON.stringify(this.mqtt_structure), true);
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
