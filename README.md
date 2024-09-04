<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

<span align="center">

## Homebridge Platform Plugin\ # HTTP Sensors and Switches

</span>

**_Requirements:_**<br>
<img src="https://img.shields.io/badge/node-^18.20.4%20%7C%7C%20^20.16.0%20%7C%7C%20^22.5.1-brightgreen"> &nbsp;
<img src="https://img.shields.io/badge/homebridge-^1.8.0%20%7C%7C%20^2.0.0.beta.0-brightgreen">


This plugin communicate with your devices over HTTP. Currently it supports Switches and Temperature/Humidity sensor.


### Switch
> [!NOTE]
> Read Status (On/Of), Turn ON (url), Turn OFF (url)

> [!TIP]
> If you don't have Manual switch and you don't mind when Homebridge is rebooted, your device is going to be set as OFF
> then you don't have to use Parameter urlStatus. 

> [!IMPORTANT]
> Parameters required in Config:
> 
> deviceType = 'Switch',
> deviceName = 'Name your Accessory',
> deviceID = 'Put something unique / chars and numbers',
> urlON = 'URL that triggers your device to change state to ON',
> urlOFF = 'URL that triggers your device to change state to OFF'

> [!CAUTION]
> Parameters:
> urlStatus = 'url points to JSON with device status' when is set it will bind Accessory to 5 sec check status interval
```
{
    "POWER": "ON"
}
```

\
\

### Temperature and Humidity sensor
> [!NOTE]
> Sensor - Read JSON for Temperature, Humidity

Sensor JSON file example
```
{
    "t": "29.37",
    "h": "48.26",
    "p": "1001.33"
}
```

> [!IMPORTANT]
> **Homebridge v2.0 Information**
>
> This template currently has a
> - `package.json -> engines.homebridge` value of `"^1.8.0 || ^2.0.0-beta.0"`
> - `package.json -> devDependencies.homebridge` value of `"^2.0.0-beta.0"`
>
> This is to ensure that this plugin will build and run on both Homebridge v1 and v2.
>

> [!IMPORTANT]
> **Node v22 Information**
>
> This template currently has a
> - `package.json -> engines.node` value of `"^18.20.4 || ^20.16.0 || ^22.5.1"`
>
> This plugin should be supporting Node v22 from October 2024.

### ⚙️ Config example

```
{
    "bridge": {
        "name": "Homebridge xxxx",
        "username": "xx:xx:xx:xx:xx:xx",
        "port": 51576,
        "pin": "xxx-xx-xxx",
        "advertiser": "bonjour-hap"
    },
    "platforms": [
        {
            "name": "Config",
            "port": 8581,
            "auth": "form",
            "theme": "auto",
            "tempUnits": "c",
            "lang": "auto",
            "noFork": true,
            "standalone": true,
            "platform": "config"
        },
        {
            "platform": "HttpSensorsAndSwitches",
            "name": "Stergo",
            "description": "Http all in one place",
            "devices": [
                {
                    "deviceType": "Sensor",
                    "deviceID": "896543287",
                    "deviceName": "Attic",
                    "deviceManufacturer": "NameTheManufacturer",
                    "deviceModel": "DHT",
                    "deviceSerialNumber": "203ab773-d5cd-42ww-b531-a98bba0e4444",
                    "deviceFirmwareVersion": "v1.4.0",
                    "sensorUrl": "http://192.168.1.74/mesures.json",
                    "temperatureName": "t",
                    "humidityName": "h",
                    "updateInterval": 60000
                },
                {
                    "deviceType": "Switch",
                    "deviceID": "1234578",
                    "deviceName": "Night Light",
                    "deviceManufacturer": "Stergo",
                    "deviceModel": "Switch",
                    "deviceSerialNumber": "203ab773-d5cd-42a2-b531-a98bba0e4444",
                    "deviceFirmwareVersion": "0.4.0",
                    "urlON": "http://192.168.1.77/POWER?state=ON",
                    "urlOFF": "http://192.168.1.77/POWER?state=OFF",
                    "urlStatus": "http://192.168.1.77/POWER",
                    "stateName": "POWER",
                    "onStatusValue": "ON",
                    "offStatusValue": "OFF"
                },
                {
                    "deviceType": "Sensor",
                    "deviceID": "65432258",
                    "deviceName": "Balcony",
                    "sensorUrl": "http://192.168.1.72/mesures.json",
                    "temperatureName": "t",
                    "updateInterval": 300000
                }
            ]
        }
    ]
}
```
### ⚙️ Config params

| **Param** 	| **Description** 	| **Param needed** 	|
|---	|---	|:---:	|
| deviceType 	| Sensor or Switch 	| true 	|
| deviceName 	| Name for Your Accessory 	| true 	|
| deviceID 	| Uniqe ID for this Accessory 	| true 	|
| deviceManufacturer 	| Name for Manufacturer of this Accessory 	| false 	|
| deviceModel 	| Name of model for this Accessory 	| false 	|
| deviceSerialNumber 	| Unique serial number 	| false 	|
| deviceFirmwareVersion 	| Firmware running on device 	| false 	|
| urlON 	| URL for Switch turn ON 	| true 	|
| urlOFF 	| URL for Switch turn OFF 	| true 	|
| urlStatus 	| URL for reading status of Switch (on/off) 	| true 	|
| stateName 	| JSON status param 	| true 	|
| onStatusValue 	| JSON return Value for status ON 	| true 	|
| offStatusValue 	| JSON return Value for status OFF 	| true 	|
| sensorUrl 	| JSON file containing sensor readings (temperature, humidity) 	| true 	|
| temperatureName 	| JSON param name for Temperature reading 	| true 	|
| humidityName 	| JSON param name for Humidity reading 	| true 	|
| updateInterval 	| update interval for reading Sensors, default is 60000 = 60 seconds = 1 minute 	| false 	|




Compromise: Switch accessory, in order to work properly getStatus is bind in 5 sec interval. This is for passive devices not pushing their 
status.
I have several devices built by my self like ESP8266 with relay and I'm just switching state. I have JSON file showing status:
```
{
    "POWER": "ON"
}
```