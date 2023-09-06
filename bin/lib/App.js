const util = require('util');
const events = require('events');

var App = function(logger, logFile) {

  process.title = 'Lox2MQTT'; // required to restart process at OS level

  var that = this;
  this.logger = logger;
  this.logFile = logFile;

  this.logger.info('Lox2MQTT ' + process.env.npm_package_version + ' started');
  this.logger.startLog('lox2mqtt', 'Lox2MQTT', this.logFile, 'Lox2MQTT started');

  process.on('SIGINT', function() {
    that.logger.info('Lox2MQTT try to stop');
    that.exit(0, 'SIGINT');
  });
  process.on('SIGHUP', function() {
    that.exit(0, 'SIGHUP');
  });
  process.on('SIGTERM', function() {
    that.exit(0, 'SIGTERM');
  });
};

util.inherits(App, events.EventEmitter);

App.prototype.exit = function(code, message) {
  this.emit('exit', code);
  this.logger.info('Lox2MQTT exit - ' + message);
  this.logger.closeLog(this.logFile);
};

module.exports = App;
