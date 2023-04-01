const util = require('util');
const events = require('events');

var App = function(logger) {

    process.title = 'Lox2MQTT';

    var that = this;
    this.logger = logger;

    this.logger.info('Lox2MQTT started');

    process.on('SIGINT', function () {
        that.logger.info('Lox2MQTT try to stop');
        that.exit(0, 'SIGINT');
    });
    process.on('SIGHUP', function () {
        that.exit(0, 'SIGHUP');
    });
    process.on('SIGTERM', function () {
        that.exit(0, 'SIGTERM');
    });
};

util.inherits(App, events.EventEmitter);

App.prototype.exit = function(code, message) {
    var that = this;
    this.emit('exit', code);

    process.on('exit', function(code) {
        that.logger.info('Lox2MQTT stopped - '+message);
    })
};

module.exports = App;
