const util = require('util');
const events = require('events');
const fs = require('fs');
const directories = require('./directories');

const Adaptor = function(app, configMs, structure, mqttTopic) {
  this.app = app;
  this.useMapping = configMs.publish_mapping;
  this.structure = structure;
  this.mqttTopic = mqttTopic;
  this.msSerialNr = this.structure.msInfo.serialNr;
  this.path2control = {};
  this.stateuuid2path = {};
  this.uuid2topic = {};
  this.rooms = {};
  this.cats = {};
  this.states = {};
  this.dataFile = `${directories.data}/${this.msSerialNr}_mapping.json`;
  this.useMappingFile = false;
  this.topicPrefix = this.mqttTopic + '/' + this.msSerialNr + '/';
  
  if (this.useMapping) {
    try {
      const data = fs.readFileSync(this.dataFile);
      this.uuid2topic = JSON.parse(data);
      this.app.logger.info("MQTT Adaptor - Loading stored topic mapping table");
      this.useMappingFile = true;
    } catch (error) {
      this.app.logger.error("MQTT Adaptor - Stored topic mapping table not found. Skipped");
    }
  }

  this.buildPaths();
};

util.inherits(Adaptor, events.EventEmitter);

Adaptor.prototype.clear = function() {
  this.structure = undefined;
};

Adaptor.prototype.setValueForUuid = function(uuid, value, publishTopicName) {
  let topic = this.topicPrefix + uuid;
  if (publishTopicName && this.uuid2topic[topic]) {
    topic = this.uuid2topic[topic];
  }
  this.states[topic] = String(value);
  this.emit('publish_state', topic, value);
};

Adaptor.prototype.publishStates = function() {
  this.emit('publish_state', this.topicPrefix + 'states', JSON.stringify(this.states));
};

Adaptor.prototype.getSerialnr = function() {
  return this.msSerialNr;
};

Adaptor.prototype.getSecuredDetails = function() {
  return Object.values(this.structure.controls).filter( item => item.securedDetails == true).map(item => item.uuidAction);
}

Adaptor.prototype.getHistory = function() {
  return Object.values(this.structure.controls).filter( item => item.details && item.details.hasHistory > 0).map(item => item.uuidAction);
}

Adaptor.prototype.getControlFromTopic = function(topic, data) {
  const path_groups = topic.match('^(.+)/cmd$');
  let control;
  if (!path_groups) {
    return {};
  }
  control = this.path2control[path_groups[1]];

  if (!control) {
    const uuidPath = Object.entries(this.uuid2topic).find(([key, value]) => value === path_groups[1])[0];
    if (uuidPath) {
      control = this.path2control[uuidPath];
    }
  }
  
  if (!control) {
    return {};
  }

  return {
    'uuidAction': control.uuidAction,
    'command': data
  };
};

Adaptor.prototype.getTopics = function() {
  // subscribe to topics. Examples:
  // <mqttTopic>/<serialnr>/<uuid>/cmd
  // <mqttTopic>/<serialnr>/states/cmd
  // <mqttTopic>/<serialnr>/<uuid>/<subcontrol>/cmd
  // <mqttTopic>/<serialnr>/<uuid>/<subcontrol>/states/cmd
  // <mqttTopic>/<serialnr>/<category>/<room>/<control>/cmd
  // <mqttTopic>/<serialnr>/<category>/<room>/<control>/<subcontrol>/cmd
  // <mqttTopic>/<serialnr>/<category>/<room>/<control>/<subcontrol>/states/cmd
  return [
    this.mqttTopic + '/+/+/cmd',
    this.mqttTopic + '/+/+/+/cmd',
    this.mqttTopic + '/+/+/+/+/cmd',
    this.mqttTopic + '/+/+/+/+/+/cmd',
    this.mqttTopic + '/+/+/+/+/+/+/cmd',
  ]
};

Adaptor.prototype.publishStructure = function() { // publish the original structure (if map has entries)
  if (this.structure && Object.keys(this.structure).length) {
    this.emit('publish_structure', this.topicPrefix + 'structure', JSON.stringify(this.structure));
  }
};

Adaptor.prototype.publishMapping = function() { // publish the mapping table (if map has entries)
  if (this.uuid2topic && Object.keys(this.uuid2topic).length) {
    this.emit('publish_mapping', this.topicPrefix + 'mapping', JSON.stringify(this.uuid2topic));
  }
};

Adaptor.prototype.processMapping = function(mapping) { // publish the mapping table
  let map;
  try {
    map = JSON.parse(mapping);
  } catch(error) {
    this.app.logger.error("MQTT Adaptor - Error in received topic mapping table. Skipped");
  }
  if (map) {
    this.uuid2topic = map;
    this.app.logger.info("MQTT Adaptor - Topic mapping table read");
    this.useMappingFile = true;
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(map));
      this.app.logger.info("MQTT Adaptor - Saved topic mapping table");
    } catch(error) {
      this.app.logger.error("MQTT Adaptor - Cannot save topic mapping table");
    }
  }
};

Adaptor.prototype.buildPaths = function() {
  let that = this;
  Object.keys(this.structure.rooms).forEach( (key) => {
    let room = that.structure.rooms[key];
    that.rooms[key] = room.name;
  });
  Object.keys(this.structure.cats).forEach( (key) => {
    let cat = that.structure.cats[key];
    that.cats[key] = cat.name;
  });
  Object.keys(this.structure.controls).forEach( (key) => {
    const control = that.structure.controls[key];
    this.addControl(control);
    if (control.subControls !== undefined) {
      Object.keys(control.subControls).forEach( (sub_key) => {
        const subControl = control.subControls[sub_key];
        this.addControl(control, subControl);
      });
    }
  });

  this.path2control["globalstates"] = this.structure.globalStates;
  Object.keys(this.structure.globalStates).forEach(function(key) {
    const uuid = that.structure.globalStates[key];
    const path = "globalstates/" + key;
    const topicPath = this.topicPrefix + path;
    this.stateuuid2path[uuid] = path;
    
    if (!this.useMappingFile && this.useMapping) {
      this.registerUuid(this.topicPrefix + uuid, topicPath, "");
    }
  }, this);
};

Adaptor.prototype.processStates = function(control, ctrlName, subTopicName) {
  if (control.states) {
    Object.keys(control.states).forEach(key => {
      let state = control.states[key];
      this.app.logger.debug("MQTT Adaptor - state found, key:" + key + ", state: " + state);
      if (Array.isArray(state)) { // check if array, then unroll array
        state.forEach( (element, index) => {
          let topic = subTopicName + '/' + key + '/' + index;
          this.registerUuid(this.topicPrefix + element, ctrlName, topic);
        });
      } else {
        let topic = subTopicName + '/' + key;
        this.registerUuid(this.topicPrefix + state, ctrlName, topic);
      }
    });
  }
}

Adaptor.prototype.registerUuid = function(uuidPath, topicPath, subControlPath) {
  this.app.logger.debug("MQTT Adaptor - registerUuid for " + topicPath + subControlPath);
  let path = topicPath;
  const found = Object.values(this.uuid2topic).filter( path => path === (topicPath + subControlPath));
  if (found.length != 0) {
    path += '-' + String(found.length);
  }
  this.uuid2topic[uuidPath] = path + subControlPath;
}

Adaptor.prototype.addControl = function(control, subcontrol = undefined) {
 
  function slugify(str) {
    return String(str)
      .normalize('NFKD') // split accented characters into their base characters and diacritical marks
      .replace(/[\u0300-\u036f]/g, '') // remove all the accents, which happen to be all in the \u03xx UNICODE block.
      .trim() // trim leading or trailing whitespace
      .toLowerCase() // convert to lowercase
      .replace(/[^a-z0-9 -]/g, '') // remove non-alphanumeric characters
      .replace(/\s+/g, '-') // replace spaces with hyphens
      .replace(/-+/g, '-'); // remove consecutive hyphens
  }
  
  const uuidPath = this.topicPrefix + control.uuidAction;
  
  this.path2control[uuidPath] = control;
  
  if (!this.useMappingFile && this.useMapping) {
    let topicPath = this.topicPrefix + slugify(this.cats[control.cat]) + '/' + 
      slugify(this.rooms[control.room]) + '/' + slugify(control.name);

    let subControlPath = '';
    if (subcontrol) subControlPath = '/' + slugify(subcontrol.name);

    this.registerUuid(uuidPath, topicPath, subControlPath);

    if (control && control.states && !subcontrol) {
      this.processStates(control, topicPath, subControlPath);
    }

    if (subcontrol && subcontrol.states) {
      this.processStates(subcontrol, topicPath, subControlPath);
    }
  }
};

module.exports = Adaptor;
