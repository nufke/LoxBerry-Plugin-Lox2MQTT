# LoxBerry-Plugin-Lox2MQTT

LoxBerry plugin to enable communication between the Loxone Miniserver and MQTT. This plugin connects to the Loxone Miniserver websocket and the LoxBerry MQTT Gateway and publishes Miniserver state changes over MQTT. In addition, control commands can be send over MQTT to control the Miniserver directly.

*NOTE: The current version is not production ready. Use it at your own risk.*

## Installation

Use the LoxBerry plugin installation procedure.

## Configuration

Use the LoxBerry plugin webpage to configure communication with MQTT. The plugin detects and lists the available Miniservers. For each Miniserver, the following configuration options are available:

  * **Miniserver topic name**: MQTT topic name used when publishing control state changes (default: loxone)

  * **Options**:

    * **Use other Miniserver login credentials**: Connect to the Miniserver as a different user (default: false)

    * **Publish structure**: at plugin startup, the Miniserver structure is published (default: false)

    * **Publish control states**: the Miniserver controls state changes are published (default: false)

    * **Retain published MQTT messages**: Published MQTT messages will be retained by the MQTT server (default: false)

    * **Subscribe to MQTT**: the Miniserver will listen to MQTT and control commands sent over MQTT will control the Miniserver (default: false)

  * **Miniserver username**: Miniserver username (if enabled, default: empty)

  * **Miniserver password**: Miniserver password (if enabled, default: empty)

When saving the configuration, the Lox2MQTT plugin will be restarted automatically. Updates to the general Miniserver settings or plugin logging level will also restart this plugin. The process status of the Lox2MQTT plugin is shown at the bottom of the configuration page. Also

**WARNING!** Publishing and subscribing to control state changes will increase the load on your Loxone Miniserver(s) and MQTT server.

## Broadcasting Miniserver state changes over MQTT

Each Miniserver state change is broadcasted over MQTT, using the following topic structure:

```
<mqtt_topic_ms>/<serialnr>/<uuid>/states/<state> <value>
```

Each MQTT message uses a topic name `<mqtt_topic_ms>` as is defined in the configuration, to identify messages send to or from a Loxone Miniserver. The next topic level specifies the serial number `serialnr` of the Miniserver, followed by a unique identifier `uuid`, and `state` representing a control state, which can be found in the Loxone structure file `LoxAPP3.json` on your Miniserver.

If enabled, each last Miniserver control state broadcast is retained by the MQTT server. This enables MQTT clients to receive the latest state values immediately after subscribing to the topic.

As MQTT topics are case sentitive, the `CamelCase` state names as defined in the Loxone structure file `LoxAPP3.json` are mapped to lowercase `snake_case` topic strings. For example, the state `activeMoodsNum` of a control of type `LightControllerV2` is translated into `active_moods_num`.

**Example**

```
loxone/0123456789AB/01234567-abcd-0123-ffffeeeeddddcccc/states/value 0.8431345820426941
```

Where `loxone` is the MQTT topic indicating a Miniserver message, `0123456789AB` is the Miniserver serial nr., and `01234567-abcd-0123-ffffeeeeddddcccc` the uuid of the control state, and the value is `0.8431345820426941`.

## Broadcasting Miniserver structure over MQTT

If enabled, the Miniserver structure (`LoxAPP3.json`) is broadcasted over MQTT, but only once, at plugin startup. It uses the following topic structure:

```
<mqtt_topic_ms>/<serialnr>/structure <LoxAPP3.json>
```

If enabled, the Miniserver structure is retained by the MQTT server. This enables MQTT clients to receive the latest structure immediately after subscribing to the topic.

## Controling the Loxone Miniserver over MQTT

To control a Loxone Miniserver, a messages should be send using the following topic structure:

```
<mqtt_topic_ms>/<serialnr>/<uuid>/cmd <command>
or
<mqtt_topic_ms>/<serialnr>/<uuid>/<subcontrol>/cmd <command>
```

Note that Loxone subcontrols share the same `uuid` inherited from the parent control, and therefore define an additional string `subcontrol`.

**Example**

```
loxone/0123456789AB/01234567-abcd-0123-ffffeeeeddddcccc/cmd Off
```

In this example, a switch on Miniserver `0123456789AB` with uuid `01234567-abcd-0123-ffffeeeeddddcccc` is switched `Off`.

## FAQ

**Q: What is the difference between the LoxBerry MQTT Gateway and Lox2MQTT?**

A: LoxBerry MQTT Gateway communicates to the Miniserver via HTTP Virtual Inputs or UDP messages, which require additional infrastructure in your Loxone Config program. The Lox2MQTT plugin connects to the Miniserver websocket and has direct access to the Miniserver controls and states. Therefore there are no changes required in your Loxone Config program.

**Q: I receive state information from my Miniserver over MQTT, but I do not recognize the format and identifiers**

A: A received MQTT message has the following format: `<mqtt_topic_ms>/<serialnr>/<uuid>/states/<state> <value>`. Each MQTT message uses the Miniserver topic name (`mqtt_topic_ms`) as defined in the configuration to identify messages coming from a Loxone Miniserver. The next topic level specifies the serial number (`serialnr`) of your Miniserver, followed by the unique identifier (`uuid`) and state (`state`) representing a control state as defined in the Loxone structure file `LoxAPP3.json` on your Miniserver.

**Q: Can I change the Miniserver control states via MQTT?**

A: Yes, you can send MQTT messages which are converted to commands for the Loxone Miniserver. A transmited MQTT message should have the following format: `<mqtt_topic_ms>/<serialnr>/<uuid>/cmd <command>`. Note the command extension (`/cmd`) in this message, which has been added to the unique identifier of a control or subcontrol. The allowed values for `command` are defined in the [Loxone Structure File](https://www.loxone.com/dede/wp-content/uploads/sites/2/2022/06/1300_Structure-File.pdf)

## Issues and questions

Please submit your issues and questions via the GitHub issue tracker: https://github.com/nufke/LoxBerry-Plugin-Lox2MQTT/issues or use https://www.loxforum.com

## Credits

This plugin uses portions of the [Node.js Loxone WebSocket API](https://github.com/alladdin/node-lox-ws-api) created by [Ladislav Dokulil](https://github.com/alladdin)

The logging capabilites are based on the [LoxBerry message-center plugin](https://github.com/LoxYourLife/message-center) developed by [LoxYourLife](https://github.com/LoxYourLife)
