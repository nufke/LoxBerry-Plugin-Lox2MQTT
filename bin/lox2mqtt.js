#!/usr/bin/env node

const _ = require('lodash');
const directories = require('./lib/directories');
const Logger = require('loxberry-logger');
const App = require('./lib/App');
const MsClient = require('./lib/MsClient');

const configFile = `${directories.config}/default.json`;
const logFile = `${directories.logdir}/lox2mqtt.log`;
const globalConfigFile = `${directories.homedir}/config/system/general.json`;
const globalPluginDbFile = `${directories.systemData}/plugindatabase.json`;
const syslogDbFile = `${directories.syslogdir}/logs_sqlite.dat`;

const getPluginLogLevel = () => {
  let globalPluginDb = require(globalPluginDbFile);
  const pluginData = _.find(globalPluginDb.plugins, (entry) => entry.name === 'lox2mqtt');
  if (_.isUndefined(pluginData)) return 3; // not defined defaults to ERROR level
  return pluginData.loglevel;
};

const main = () => {
  let config = require(configFile);
  let globalConfig = require(globalConfigFile);
  let logLevel = getPluginLogLevel();
  const logger = new Logger(syslogDbFile, logLevel);

  if (!config.miniserver) {
    logger.info("Lox2MQTT - Missing or illegal configuration. Reinstall the plugin or report this issue.");
    return;
  }

  let app = new App(logger, logFile);
  let mqtt_client = undefined;
  let ms_client = {}

  Object.keys(config.miniserver).forEach(key => {
      logger.info("Lox2MQTT - register Miniserver " + key);
      ms_client[key] = new MsClient(app, config, globalConfig, key, mqtt_client);
  });
};

main();
