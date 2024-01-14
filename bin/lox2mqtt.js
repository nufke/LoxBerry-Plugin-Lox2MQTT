#!/usr/bin/env node

const directories = require('./lib/directories');
const Logger = require('loxberry-logger');
const App = require('./lib/App');
const MsClient = require('./lib/MsClient');

const configFile = `${directories.config}/default.json`;
const logFile = `${directories.logdir}/lox2mqtt.log`;
const globalConfigFile = `${directories.system_config}/general.json`;
const globalPluginDbFile = `${directories.system_data}/plugindatabase.json`;
const syslogDbFile = `${directories.syslogdir}/logs_sqlite.dat`;

const getPluginLogLevel = () => {
  let globalPluginDb = require(globalPluginDbFile);
  const pluginData = Object.values(globalPluginDb.plugins).find( (entry) => entry.name === 'lox2mqtt');
  if (!pluginData) return 3; // not defined defaults to ERROR level
  return Number(pluginData.loglevel);
};

const main = () => {
  let config = require(configFile);
  let globalConfig = require(globalConfigFile);
  let logLevel = getPluginLogLevel();
  const logger = new Logger(syslogDbFile, logLevel);

  if (!config.miniserver) {
    logger.error("Lox2MQTT - Missing or illegal configuration. Reinstall the plugin or report this issue.");
    return;
  }

  let app = new App(logger, logFile);
  let mqtt_client = undefined;
  let ms_client = {}

  Object.keys(config.miniserver).forEach(key => {
    if ( config.miniserver[key].enabled && 
         (globalConfig.Miniserver[key].Ipaddress.length > 0) && 
         (config.miniserver[key].mqtt_topic_ms.length > 0) ) {
      logger.info("Lox2MQTT - register Miniserver " + key);
      ms_client[key] = new MsClient(app, config, globalConfig, key, mqtt_client);
    } else {
      logger.info("Lox2MQTT - Miniserver " + key + ' disabled in MQTT communication.');
    }
  });
};

main();
