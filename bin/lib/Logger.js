//const directories = require('./directories');
//const sqlite3 = require('sqlite3').verbose();

const format = (level, message) => `${level.toUpperCase()}: ${message}\n`;

const stdErr = (msg) => process.stderr.write(msg);
const stdOut = (msg) => process.stdout.write(msg);

const DEBUG = 7;
const INFO = 6;
const WARN = 4;
const ERROR = 3;

class Logger {
  constructor(logLevel) {
    this.loglevel = logLevel;
  }

  info(message) {
    if (this.loglevel >= INFO) stdOut(format('INFO', message));
  }

  debug(message) {
    if (this.loglevel === DEBUG) stdOut(format('DEBUG', message));
  }

  warn(message) {
    if (this.loglevel >= WARN) stdOut(format('WARN', message));
  }

  error(message, error) {
    if (this.loglevel >= ERROR) {
      stdErr(format('ERROR', message));

      if (error) {
        if (error.stack) {
          return stdErr(`    ${error.stack}\n`);
        }
        return stdErr(`    ${error.name}: ${error.message}\n`);
      }
    }
  }
}

module.exports = Logger;
