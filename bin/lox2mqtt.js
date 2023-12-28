#!/usr/bin/env node

const _ = require('lodash');
const directories = require('./lib/directories');
const Logger = require('loxberry-logger');
const App = require('./lib/App');
const MsClient = require('./lib/MsClient');

const configFile = `${directories.config}/default.json`;
const logFile = `${directories.logdir}/lox2mqtt.log`;
const globalConfigFile = `${directories.system_config}/general.json`;
const globalPluginDbFile = `${directories.system_data}/plugindatabase.json`;
const syslogDbFile = `${directories.syslogdir}/logs_sqlite.dat`;
const loxbuddyConfigFile = `${directories.loxbuddy_config}/default.json`;

const getPluginLogLevel = () => {
  let globalPluginDb = require(globalPluginDbFile);
  const pluginData = _.find(globalPluginDb.plugins, (entry) => entry.name === 'lox2mqtt');
  if (_.isUndefined(pluginData)) return 3; // not defined defaults to ERROR level
  return Number(pluginData.loglevel);
};

const main = () => {
  let config = require(configFile);
  let globalConfig = require(globalConfigFile);
  let logLevel = getPluginLogLevel();
  const logger = new Logger(syslogDbFile, logLevel);
  let loxbuddyConfig = null;

  try {
    loxbuddyConfig = require(loxbuddyConfigFile);
   }
   catch (e) {
    logger.warn('Lox2MQTT - No LoxBuddy configuration found.');
   }

  if (!config.miniserver) {
    logger.info("Lox2MQTT - Missing or illegal configuration. Reinstall the plugin or report this issue.");
    return;
  }

  let app = new App(logger, logFile);
  let mqtt_client = undefined;
  let ms_client = {}

  Object.keys(config.miniserver).forEach(key => {
      logger.info("Lox2MQTT - register Miniserver " + key);
      ms_client[key] = new MsClient(app, config, globalConfig, loxbuddyConfig, key, mqtt_client);
  });
};

main();
