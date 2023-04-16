#!/usr/bin/env node

if (!process.env.NODE_CONFIG_DIR) {
    process.env.NODE_CONFIG_DIR = process.env.LBPCONFIG + '/lox2mqtt';
}

var config = require("config");
const lox2mqtt = require('./lib/index.js');

var mqtt_client = undefined;
var logger = lox2mqtt.Logger(config.get('logging'));
var app = new lox2mqtt.App(logger);
var ms_client = {}

Object.keys(config.miniserver).forEach(key => {
    logger.info("Lox2MQTT - register Miniserver " + key);
    ms_client[key] = new lox2mqtt.MsClient(app, config, key, mqtt_client);
});
