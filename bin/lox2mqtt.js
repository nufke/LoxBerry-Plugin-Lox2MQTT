#!/usr/bin/env node

const _ = require('lodash');
const directories = require('./lib/directories');
const Logger = require('./lib/Logger');
const App = require('./lib/App');
const MsClient = require('./lib/MsClient');

const configFile = `${directories.config}/default.json`;
const globalConfigFile = `${directories.homedir}/config/system/general.json`;
const globalPluginDbFile = `${directories.systemData}/plugindatabase.json`;

const getPluginLogLevel = () => {
  const pluginData = _.find(globalPluginDb.plugins, (entry) => entry.name === 'lox2mqtt');
  if (_.isUndefined(pluginData)) return 3; // not defined defaults to ERROR level
  return pluginData.loglevel;
};

let config = require(configFile);
let globalConfig = require(globalConfigFile);
let globalPluginDb = require(globalPluginDbFile);
let logLevel = getPluginLogLevel();
const logger = new Logger(logLevel);
var app = new App(logger);

let mqtt_client = undefined;
let ms_client = {}

Object.keys(config.miniserver).forEach(key => {
    logger.info("Lox2MQTT - register Miniserver " + key);
    ms_client[key] = new MsClient(app, config, globalConfig, key, mqtt_client);
});
