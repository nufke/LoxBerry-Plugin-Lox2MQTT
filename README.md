# LoxBerry-Plugin-Lox2MQTT

LoxBerry plugin to enable communication between the Loxone Miniserver and MQTT. This plugin connects to the Loxone Miniserver websocket and the LoxBerry MQTT Widget and publishes Miniserver control state changes over MQTT. In addition, control commands can be send over MQTT to control the Miniserver directly.

*NOTE: The current version is not production ready. Use it at your own risk.*

## Installation

Use the LoxBerry plugin installation procedure.

## Configuration

Use the LoxBerry plugin webpage to configure the communication using MQTT. The plugin detects and lists the available Miniservers. For each Miniserver, the following configuration options are available:

  * **Enable Miniserver in MQTT communication**: Enable or disable Miniserver in MQTT communication (default: enabled). Note that Miniserver(s) configured as Client can be controlled via a Gateway Miniserver and do not need to be enabled explicitly.

  * **Miniserver topic name**: MQTT topic name used when publishing control state changes and subscribing to Miniserver control commands (default: loxone)

  * **Options**:

    * **Use other Miniserver login credentials**: Connect to the Miniserver as a different user (default: false)

    * **Publish structure**: the Miniserver structure is published over MQTT (default: false)

    * **Publish control state changes**: the Miniserver control state changes are published over MQTT (default: false)

    * **Use control category and room as MQTT subtopic names**: Instead of using the control state `uuid`, use the control category and room names as subtopics (default: false)

    * **Retain published MQTT messages**: Published MQTT messages will be retained by the MQTT server (default: false)

    * **Subscribe to MQTT to control the Miniserver**: Control commands sent over MQTT will control the Miniserver (default: false)

  * **Miniserver username**: Miniserver username (if enabled, default: empty)

  * **Miniserver password**: Miniserver password (if enabled, default: empty)

When saving the configuration, the Lox2MQTT plugin will be restarted automatically. Updates to the general Miniserver settings or plugin logging level will also restart this plugin. The process status of the Lox2MQTT plugin is shown at the bottom of the configuration page. When the status is colored green, the process is running as expected. In case of issues, the text color is red and check the log file for more details.

**WARNING!** Publishing and subscribing to control state changes will increase the load on your Loxone Miniserver(s) and MQTT server!

## Broadcasting Miniserver state changes over MQTT

Each Miniserver state change is broadcasted over MQTT, using the following topic structure:

```
<mqttTopic>/<serialnr>/<uuid> <value>
```

Each MQTT message uses a topic name `<mqttTopic>` as is defined in the configuration, to identify messages send to or from a Loxone Miniserver. The next topic level specifies the serial number `serialnr` of the Miniserver, followed by a unique identifier `uuid` representing a control state, which can be found in the Loxone structure file `LoxAPP3.json` on your Miniserver.

If enabled, each last Miniserver control state broadcast is retained by the MQTT server. This enables MQTT clients to receive the latest state values immediately after subscribing to the topic.

**Example**

```
loxone/0123456789AB/01234567-abcd-0123-ffffeeeeddddcccc 0.8431345820426941
```

Where `loxone` is the MQTT topic indicating a Miniserver message, `0123456789AB` is the Miniserver serial nr., and `01234567-abcd-0123-ffffeeeeddddcccc` the uuid of the control state, and the value is `0.8431345820426941`.

In case the configuration option **Use control category and room as MQTT subtopic names** is enabled, the topic structure is:

```
<mqttTopic>/<serialnr>/<category>/<room>/<control>[/<subcontrol>]/<state> <value>
```

For each control, the `category` and `room` name will added as subtopic. In case the control has subcontrols, the name of the subcontrol is added as subtopic. The name of the control state can be found in the Loxone structure file `LoxAPP3.json`. The names for `category`, `room`, `control` and `subcontrol` are in *slug* format, which means text is converted to lowercase, whitespaces are replaced by dash symbols, and special characters are removed.

**Example**

```
loxone/0123456789AB/sensor/living-room/co2/value 3
```

In this example, `loxone` is the MQTT topic indicating a Miniserver message, `0123456789AB` is the Miniserver serial nr., the control with name `co2` is an analog sensor input (of type `InfoOnlyAnalog`), assigned to category `sensor` and room `living-room`. The published `value` for the analog input is 3.

## Broadcasting Miniserver structure over MQTT

Broadcasting the Miniserver structure might be relevant for MQTT subscribers such as mobile apps to receive information on the available controls, their properties, capabilties and states. If enabled, the Miniserver structure (`LoxAPP3.json`) is broadcasted over MQTT, but only once, at plugin startup. It uses the following topic structure:

```
<mqttTopic>/<serialnr>/structure <LoxAPP3.json>
```

If enabled, the Miniserver structure is retained by the MQTT server. This enables MQTT clients to receive the latest structure immediately after subscribing to the topic.

## Controling the Loxone Miniserver over MQTT

To control a Loxone Miniserver, a message should be send using the following topic structure:

```
<mqttTopic>/<serialnr>/<uuid>[/<subcontrol>]/cmd <command>
```

In case the control has subcontrols, the name of the subcontrol should added. Note that Loxone subcontrols share the same `uuid` inherited from the parent control, and therefore define an additional string `subcontrol`. The name for the `subcontrol` can be found in the Loxone Miniserver structure file `LoxAPP3.json` listed under the `uuid` of the parent control.

**Example**

```
loxone/0123456789AB/01234567-abcd-0123-ffffeeeeddddcccc/cmd Off
```

In this example, a switch on Miniserver `0123456789AB` with uuid `01234567-abcd-0123-ffffeeeeddddcccc` is switched `Off`.

In case the configuration option **Use control category and room as MQTT subtopic names** is enabled, the following topic structure can be used to control the Miniserver:

```
<mqttTopic>/<serialnr>/<category>/<room>/<control>[/<subcontrol>]/<state>/cmd <command>
```

For each control, the `category` and `room` and `control` name is added as subtopic. In case the control has subcontrols, the name of the subcontrol should be added.

**Example**

```
loxone/0123456789AB/lighting/living-room/ceiling/active/cmd On
```

In this example, the command is published for a Miniserver with serial nr `0123456789AB` and the control with name `ceiling` (of type `Switch`), assigned to category `lighting`, and room `living-room`. The state for the switch is called `active`. It can be activated sending the command `On`.

## FAQ

**Q: What is the difference between the LoxBerry MQTT Widget and Lox2MQTT?**

A: The LoxBerry MQTT Widget communicates to the Miniserver via HTTP Virtual Inputs or UDP messages, which require additional infrastructure in your Loxone Config program. The Lox2MQTT plugin connects to the Miniserver websocket and has direct access to the Miniserver controls and states. Therefore there are no changes required in your Loxone Config program to interact with your Miniserver.

**Q: I receive state information from my Miniserver over MQTT, but I do not recognize the format and identifiers**

A: A received MQTT message has the following format: `<mqttTopic>/<serialnr>/<uuid> <value>`. Each MQTT message uses the Miniserver topic name (`mqttTopic`) as defined in the plugin configuration to identify messages coming from a Loxone Miniserver. The next topic level specifies the serial number (`serialnr`) of your Miniserver, followed by the unique identifier (`uuid`) representing a control state as defined in the Loxone structure file `LoxAPP3.json` on your Miniserver. In case you prefer to see the the `category`, `room` and `control` name as subtopics, you can enable the option **Use control category and room as MQTT subtopic names** at the plugin configuration page. In this case, the MQTT message format becomes `<mqttTopic>/<serialnr>/<category>/<room>/<control>[/<subcontrol>]/<state> <value>`.

**Q: Can I change the Miniserver control states via MQTT?**

A: Yes, you can send MQTT messages which are converted to commands for the Loxone Miniserver. A transmited MQTT message should have the following format: `<mqttTopic>/<serialnr>/<uuid>/cmd <command>`. Note the command extension (`/cmd`) as subtopic, which has been added to the unique identifier of a control or subcontrol. The allowed values for `command` are defined in the [Loxone Structure File](https://www.loxone.com/wp-content/uploads/datasheets/StructureFile.pdf). In case the option **Use control category and room as MQTT subtopic names** is enabled, the control format becomes `<mqttTopic>/<serialnr>/<category>/<room>/<control>[/<subcontrol>]/<state>/cmd <command>`.

**Q: Where can I find my Loxone Miniserver structure file `LoxAPP3.json`?**

A: You can download your structure file via URL `http://<miniserverIPAddress>/data/LoxAPP3.json` or access it via FTP in directory `web/data/LoxAPP3.json`. In both cases, login credentials are required.

## Credits

This plugin uses portions of the [Node.js Loxone WebSocket API](https://github.com/alladdin/node-lox-ws-api) created by [Ladislav Dokulil](https://github.com/alladdin)

The logging capabilites are based on the [LoxBerry message-center plugin](https://github.com/LoxYourLife/message-center) developed by [LoxYourLife](https://github.com/LoxYourLife)

## Issues and questions

Please submit your issues and questions via the GitHub issue tracker: https://github.com/nufke/LoxBerry-Plugin-Lox2MQTT/issues or use https://www.loxforum.com

## Happy with the plugin and willing to support the development?

<a href="https://www.buymeacoffee.com/nufke" target="_blank"><img src="./icons/svg/bmc.svg" alt="Buy Me A Coffee"></a>
