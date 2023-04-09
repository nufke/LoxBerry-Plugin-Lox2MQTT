# LoxBerry-Plugin-Lox2MQTT

LoxBerry plugin to enable communication between the Loxone Miniserver and MQTT. This plugin connects to the Loxone Miniserver websocket and the LoxBerry MQTT Gategay and publishes Miniserver state changes over MQTT. In addition, control commands can be send over MQTT to control the Miniserver directly.

*NOTE: The current version is not production ready. Use it at your own risk.*

## Installation

Use the LoxBerry plugin installation procedure.

## Configuration

The default configuation file can be found in `/opt/loxberry/config/plugins/lox2mqtt/default.json`:

```json
{
    "logging": [{
        "File" : {
            "filename": "../../../log/plugins/lox2mqtt/lox2mqtt.log",
            "timestamp": true,
            "level": "info"
        }
    }],
    "app": {
        "mqtt_topic": "loxberry/app",
        "icon_path": "/assets/icons/svg"
    },
    "miniserver": {
        "1" : {
            "mqtt_topic": "loxone",
            "publish_structure": false,
            "subscribe": true
        }
    }
}
```

The `logging` section allows customization for the logging. The `app` section will be used for future communcation with a LoxBerry App. The `miniserver` section specifies the MQTT topic to publish Miniserver state changes and control structure. It also defines if the Miniserver subscribes to MQTT topics to enable changing control states. Registration of multiple Miniservers is supported. Make sure that the index of the specified Miniservers match with the IDs defined in `/opt/loxberry/config/system/general.json`.

*NOTE 1: As the LoxBerry and its MQTT server is used, the plugin configuration file does not specify the Miniserver and MQTT server settings such as IP and port address. Instead, the LoxBerry general settings are used.*

*NOTE 2: The current version of the plugin does not support configuration via the LoxBerry web interface. Instead, update the configuration file `/opt/loxberry/config/plugins/lox2mqtt/default.json` directly and restart Lox2MQTT:*

```bash
cd /opt/loxberry/bin/plugins/lox2mqtt
npm run restart
```

## Miniserver to MQTT Broadcast

Each Miniserver states change is broadcasted over MQTT, using the following topic structure:

```
<miniserver_mqtt_topic>/<serialnr>/<uuid>/states/<state> <value>
```

Each MQTT message uses the topic `<miniserver_mqtt_topic>` as is defined in the configuration file for each Miniserver, to identify messages send to or from a Loxone Miniserver. The next topic level specifies the serial number `serialnr` of the Miniserver, followed by a unique identifier `uuid`, and `state` representing a control state, which can be found in the Loxone structure file `LoxAPP3.json` on your Miniserver.

As MQTT topics are case sentitive, the `CamelCase` state names as defined in the Loxone structure file `LoxAPP3.json` are mapped to lowercase `snake_case` topic strings. For example, the state `activeMoodsNum` of a control of type `LightControllerV2` is translated into `active_moods_num`.

**Example**

```
loxone/0123456789AB/01234567-abcd-0123-ffffeeeeddddcccc/states/value 0.8431345820426941
```

Where `loxone` is the MQTT topic indicating a Miniserver message, `0123456789AB` is the Miniserver serial nr., and `01234567-abcd-0123-ffffeeeeddddcccc` the uuid of the control state, and the value is `0.8431345820426941`.

## Controling the Loxone Miniserver via MQTT

To control the Loxone Miniserver, a messages should be send using the following topic structure:

```
<miniserver_mqtt_topic>/<serialnr>/<uuid>/cmd <command>
or
<miniserver_mqtt_topic>/<serialnr>/<uuid>/<subcontrol>/cmd <command>
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

A: A received MQTT message has the following format: `<miniserver_mqtt_topic>/<serialnr>/<uuid>/states/<state> <value>`. Each MQTT message uses the topic `miniserver_mqtt_topic` to identify messages coming from a Loxone Miniserver. The next topic level specifies the serial number `serialnr` of your Miniserver, followed by the unique identifier `uuid` and `state` representing a control state, which can be found in the Loxone structure file `LoxAPP3.json` on your Miniserver.

**Q: Can I change the Miniserver control states via MQTT?**

A: Yes, you can send MQTT messages which are converted to commands for the Loxone Miniserver. A transmited MQTT message should have the following format: `<miniserver_mqtt_topic>/<serialnr>/<uuid>/cmd <command>`. Note the `/cmd` extension in this message, which is added to the unique identifier of a control or subcontrol. The allowed values for `command` are defined for each control, which can be found in the [Loxone Structure File](https://www.loxone.com/dede/wp-content/uploads/sites/2/2022/06/1300_Structure-File.pdf)

## Issues and questions

Please submit your issues and questions via the GitHub issue tracker: https://github.com/nufke/LoxBerry-Plugin-Lox2MQTT/issues or use https://www.loxforum.com
