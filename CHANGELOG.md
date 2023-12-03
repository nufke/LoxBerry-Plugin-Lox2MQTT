# Version History

## v0.5.1 (BETA)

 * fix: keep alive when MQTT server is unreachable
 * improve reporting in log when MQTT server is unreachable

## v0.5.0 (BETA)

 * publish daytimer and weather events
 * update reference to latest Loxone structure file documentation (14.2)

## v0.4.7 (BETA)

 * fix: no program exit after connection error
 * documentation and readme update

## v0.4.6 (BETA)

 * revert: use of http port 80, use specified http port
 * fix: show structure in log file (debug) when option is enabled
 * fix: show state changes in log file (debug) when option is enabled
 * fix: recognize NfcCodeTouch control (fixed filename)

## v0.4.5 (BETA)

 * fix: error handling when undefined control is found in Loxone structure

## v0.4.4 (BETA)

 * add more websocket debug info to log file (if enabled)
 * fix: write lox2mqtt version in log file for debug purposes

## v0.4.3 (BETA)

 * fix: enforce use of http port 80 (secure TLS / https not yet supported)
 * changed dependency to codm/node-lox-ws-api bugfix release
 * write lox2mqtt version in log file for debug purposes

## v0.4.2 (BETA)

 * fix: publish native Miniserver structure
 * fix: update MQTT broadcast definitions in README

## v0.4.1 (BETA)

 * fix: only support http port for communication with Miniserver(s)

## v0.4.0 (BETA)

 * show Miniserver name on configuration page
 * add configuration option to retain MQTT messages
 * use Miniserver topic name to publish structure
 * remove LoxBerry App topic name from configuration
 * Updated documentation/readme

## v0.3.0 (BETA)

 * fix: Debug logger shows content, update [loxberry-logger](https://github.com/nufke/loxberry-logger)
 * fix: Detect use of Miniserver https port
 * remove LoxBerry App icon settings from configuration
 * publish native Miniserver structure
 * restart plugin after system or plugin configuration changes
 * configuration option to use different Miniserver login credentials
 * check and update configuration after upgrade
 * Updated documentation/readme

## v0.2.4 (BETA)

 * fix: Use Miniserver token-based authentication
 * fix: Detect use of Miniserver https port

## v0.2.3 (BETA)

 * fix: Miniserver login using unencoded username and password
 * fix: support user-defined Miniserver port
 * improved reporting in case of a missing plugin configuration file
 * deamon process manager (pm2) should not autorestart the program when exiting

## v0.2.2 (BETA)

 * support multiple log sessions per logger via [loxberry-logger](https://github.com/nufke/loxberry-logger)
 * fix: plugin upgrade will restore log and config files

## v0.2.1 (BETA)

 * custom logger replaced by [loxberry-logger](https://github.com/nufke/loxberry-logger)
 * logfile subpage now available via navigation bar in plugin configuration page
 * fix ARCHIVEURL and INFOURL for plugin updates using [release.cfg](release.cfg)

## v0.2.0 (BETA)

 * winston logger replaced by custom logger via pm2 (thanks to [@LoxYourLife](https://github.com/LoxYourLife))
 * Use LoxBerry loglevel from the plugin settings
 * Add webpage config navigation bar including link to logfile
 * Add warning message in webpage config for publishing and subscribing to MQTT
 * General code cleanup

## v0.1.0 (BETA)

 * Introduce configuration via LoxBerry plugin webpage
 * Default configuration created at plugin install
 * Added configuration option to disable publising Miniserver state changes
 * When starting Lox2MQTT, check if configured Miniserver(s) exist(s)
 * Updated readme

## v0.0.3 (ALPHA)

 * Supports Loxone structure and controls up to version 14.0.0 (2023.04.02)
 * Registers multiple Loxone Miniservers if specified

## v0.0.2 (ALPHA)

 * moved pm2 to local install
 * Current limitations:
    * Works with only one Loxone Miniserver (first one registered in LoxBerry)
    * Supports Loxone structure and controls up to version 13.0

## v0.0.1 (ALPHA)

 * Initial version
 * Current limitations:
    * Works with only one Loxone Miniserver (first one registered in LoxBerry)
    * Supports Loxone structure and controls up to version 13.0
