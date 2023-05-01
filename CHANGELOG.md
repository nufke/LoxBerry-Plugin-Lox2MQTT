# Version History

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
