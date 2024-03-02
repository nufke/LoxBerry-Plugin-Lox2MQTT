const util = require('util');
const events = require('events');

const Adaptor = function(structure, mqttTopic) {
  this.structure = structure;
  this.mqttTopic = mqttTopic;
  this.msSerialNr = this.structure.msInfo.serialNr;
  this.path2control = {};
  this.controlList = [];
  this.stateuuid2path = {};
  this.uuid2topic = {};
  this.rooms = {};
  this.cats = {};
  this.states = {};
  this.buildPaths();
};

util.inherits(Adaptor, events.EventEmitter);

Adaptor.prototype.clear = function() {
  this.structure = undefined;
};

Adaptor.prototype.setValueForUuid = function(uuid, value, publishTopicName) {
  let topic;
  if (publishTopicName && this.uuid2topic[uuid]) {
    topic = this.uuid2topic[uuid];
  } else {
    topic = this.mqttTopic + '/' + this.msSerialNr + '/' + uuid;
  }
  this.states[topic] = String(value);
  this.emit('publish_state', topic, value);
};

Adaptor.prototype.publishStates = function() {
  this.emit('publish_state', this.mqttTopic + '/' + this.msSerialNr + '/states', JSON.stringify(this.states));
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
  // <mqttTopic>/<serialnr>/states/cmd
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

  this.path2control['globalstates'] = this.structure.globalStates;
  Object.keys(this.structure.globalStates).forEach(function(key) {
    this.stateuuid2path[that.structure.globalStates[key]] = 'globalstates/' + key;
  }, this);
};

Adaptor.prototype.processStates = function(control, ctrlName) {
  if (control.states) {
    Object.keys(control.states).forEach(key => {
      let state = control.states[key];
      if (Array.isArray(state)) { // check if array, then unroll array
        state.forEach( (element, index) => {
          let namedTopic = ctrlName + '/' + key + '/' + index;
          this.uuid2topic[element] = namedTopic;
        });
      } else {
        let namedTopic = ctrlName + '/' + key;
        this.uuid2topic[state] = namedTopic;
      }
    });
  }
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
  
  const path = this.mqttTopic + '/' + this.msSerialNr + '/' + control.uuidAction;
  
  let namedTopic = this.mqttTopic + '/' + this.msSerialNr + '/' +
    slugify(this.cats[control.cat]) + '/' + slugify(this.rooms[control.room]) + '/' + slugify(control.name);

  if (subcontrol) namedTopic += '/' + slugify(subcontrol.name);

  this.path2control[path] = control;
  this.uuid2topic[control.uuidAction] = namedTopic;
  this.controlList.push(control.uuidAction);
  
  if (control && control.states) {
    this.processStates(control, namedTopic);
  }

  if (subcontrol && subcontrol.states) {
    this.processStates(subcontrol, namedTopic);
  }

};

module.exports = Adaptor;
