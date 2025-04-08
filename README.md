<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

<span align="center">

### Homebridge Platform Plugin
# HTTP Sensors and Switches

</span>

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) &nbsp;
<img src="https://img.shields.io/badge/node-^18.20.4%20%7C%7C%20^20.18.0%20%7C%7C%20^22.10.0-brightgreen"> &nbsp;
<img src="https://img.shields.io/badge/homebridge-^1.8.0%20%7C%7C%20^2.0.0.beta.0-brightgreen"> &nbsp;
[![Donate](https://img.shields.io/badge/donate-PayPal-blue.svg)](https://paypal.me/kreso975)

This plugin communicates with your devices over HTTP or MQTT. Currently it supports Light Bulb, Switches, Outlets, Fan, Temperature/Humidity and Motion sensor.  
Simple Discord Webhooks available in Light Bulb, Switches and Outlets.   

<br><br>

## 🕺 Motion Sensor 
> [!NOTE]  
> HTTP - Read status (true or 1 /false or 0) from JSON - {"Motion": true}  
> MQTT - Read status (true or 1/false)  
```json
{
    "Motion": false
}
```
  
## 💡 Light Bulb  
> [!NOTE]  
> HTTP:  
> - Read Status (On/Off), Turn ON (url), Turn OFF (url)  
> - Control RGB or HSV on device  
> - Brightness  
> - Color Temperature: Mired (153-500) OR Kelvin (2000-6500)
>  
> MQTT:  
> - Turn ON/OFF | Values: On = true || 1, Off = false || 0  
> - RGB in format #FFAA22 or without #     
>  
> SET only Parameters you intend to use  
```json
{
    "Light": true,
    "Brightness": 100,
    "RGB": "FF00AA",
    "Hue": 120,
    "Saturation": 20,
    "ColorTemperature": 500
}
```
  
> [!TIP]  
> Use RGB will Send and Receive values in RGB format  
> If use RGB is set, Saturation and Hue will not be sent or read.  
> Use Brightness 0-255 will Send and Receive converted Brightness value in range 0-255  
>  
> Parameters for services you do not need, leave BLANK  
  
> [!IMPORTANT]  
> Use HTTP or MQTT not both for same accessory.  

## <img src="https://github.com/kreso975/homebridge-http-sensors-switches/blob/latest/img/switch.png?raw=true" height=32 width=32> <img src="https://github.com/kreso975/homebridge-http-sensors-switches/blob/latest/img/outlet.png?raw=true" height=28 width=28 alt="Publish" title="Publish"> &nbsp;&nbsp;Switch & Outlet  
> [!NOTE]  
> HTTP:
> - Read Status (On/Off), Turn ON (url), Turn OFF (url)  
> - Outlet read Status: Outlet In Use( true/false)  
>   
> MQTT:
> - Turn ON/OFF ( Values: On = 1 || true, Off = 0 || false )  
> - Outlet In Use ( Values: true/false or 1/0)  
>  
> Discord Webhook publishes switch status to your Discord channel    
  
> [!TIP]  
> If you don't have Manual switch and you don't mind when Homebridge is rebooted, your device is going to be set as OFF  
> then you don't have to use Parameter urlStatus. 
>  
> How to setup Discord Webhooks: [link](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)  

> [!IMPORTANT]  
> Use HTTP or MQTT not both for same accessory.  
>   
> Parameters required in Config:  
> 
> deviceType = 'Switch',  
> deviceName = 'Name your Accessory',  
> deviceID = 'Put something unique / chars and numbers',  
> urlON = 'URL that triggers your device to change state to ON',  
> urlOFF = 'URL that triggers your device to change state to OFF'

> [!CAUTION]  
> Parameter:
> urlStatus = 'url points to JSON with device status' when is set it will bind Accessory to 5 sec check status interval
```json
{
    "POWER": "ON", "inUSE": false
}
```
<br><br>  
  

## 🌡️ Temperature and Humidity sensor
> [!NOTE]  
> Sensor - Read JSON Or MQTT for Temperature, Humidity  
>  
> Nested JSON  
> Support for Nested JSON structure: sensor2.tCelsius  
>    

> [!TIP]  
> Parameters required in Config:
> 
> deviceType = 'Sensor',  
> deviceName = 'Name your Accessory',  
> deviceID = 'Put something unique / chars and numbers',  
>   
> For JSON read use param sensorUrl:  
> sensorUrl = 'JSON file containing sensor readings (temperature, humidity)',
>    
> For MQTT use param mqttBroker:  
> mqttBroker = 'URL of MQTT Broker'  
>   

> [!IMPORTANT]  
> MQTT is just an basic implementation, no encription etc.  
>  


Sensor JSON file example
```json
{
   "t": 25.25,
   "h": 33.54,
   "p": 1025.04,
   "sensor2": {
     "tCelsius": 22.2
   }
}
```
<br>

## <img src="https://github.com/kreso975/homebridge-http-sensors-switches/blob/latest/img/fan.svg?raw=true" alt="Fan plugin" height=26 width=26 /> Fan  
  
| **Param** 	| **Description** 	| **Values** 	|  
|---	|---	|:---:	|  
| Active 	| Turn Fan On / Off 	| 0 (Inactive), 1 (Active) 	|  
| RotationSpeed 	| Rotation Speed 	| Valid range: 0 to 100 	| 
| RotationDirection 	| Fan turn direction 	| 0 (Clockwise), 1 (Counterclockwise) 	| 
| SwingMode 	| Swing Mode On / Off 	| 0 (Disabled), 1 (Enabled) 	| 
| TargetFanState 	| Automatione mode 	|0 (Manual), 1 (Automatic) 	| 
| CurrentFanState 	| Read Status of Fan 	| 0 (Inactive), 1 (Idle), 2 (Blowing Air) 	| 


> [!NOTE]  
>
>
> HTTP  
> Read interval 5 sec  
> Select HTTP Method - GET / POST  
> 
> MQTT  
> param for ACIVE is mqttSwitch  
>   
> Parameters for SERVICES you do NOT NEED, leave BLANK  
>  
> Discord Webhook publishes Fan status to your Discord channel (On/Off)   
  

> [!IMPORTANT]  
> Use HTTP or MQTT not both for same accessory.  
>   
> Parameters required in Config:  
> HTTP  
> urlFanControl, urlStatus
> MQTT  
> mqttBroker
>  

> [!CAUTION]  
> Parameter:
> urlStatus = 'url points to JSON with device status' when is set it will bind Accessory to 5 sec check status interval
Fan JSON file example
```json
{
    "Active": 0,
    "RotationSpeed": 100,
    "RotationDirection": 0,
    "SwingMode": 1,
    "CurrentFanState": 1,
    "TargetFanState": 1
}
```
<br>
  
<details>
<summary>⚙️ Config example</summary>
<pre>
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
                },
                {
                    "deviceType": "Switch",
                    "deviceID": "21wqwweqwee65432258",
                    "deviceName": "Relay",
                    "mqttBroker": "192.168.1.200",
                    "mqttPort": "1883",
                    "mqttSwitch": "iot/things/StergoTestSwitch/switch1",
                    "mqttUsername": "testuser",
                    "mqttPassword": "testuser",
                    "discordWebhook": "https://discordapp.com/api/webhooks/XXXXX",
                    "discordUsername": "SmartHome",
                    "discordAvatar": "",
                    "discordMessage": " is "
                },
                {
                    "deviceType": "Sensor",
                    "deviceID": "65432258",
                    "deviceName": "Balcony",
                    "mqttBroker": "192.168.1.200",
                    "mqttPort": "1883",
                    "mqttTemperature": "qiot/things/Attic/Temperature",
                    "mqttHumidity": "qiot/things/Attic/Humidity",
                    "mqttUsername": "testuser",
                    "mqttPassword": "testuser"
                }
            ]
        }
    ]
}
</pre>
</details>
<br>

<details>
<summary>⚙️ Config params</summary>

| **Param** 	| **Description** 	| **Param needed** 	|
|---	|---	|:---:	|
| deviceType 	| Sensor or Switch 	| true 	|
| deviceName 	| Name for Your Accessory 	| true 	|
| deviceID 	| Uniqe ID for this Accessory 	| true 	|
| deviceManufacturer 	| Name for Manufacturer of this Accessory 	| false 	|
| deviceModel 	| Name of model for this Accessory 	| false 	|
| deviceSerialNumber 	| Unique serial number 	| false 	|
| deviceFirmwareVersion 	| Firmware running on device 	| false 	|
| enableLogging 	| Dafault is enabled (1)	| true 	|
| urlON 	| URL to Turn ON the Switch 	| true 	|
| urlOFF 	| URL to Turn OFF the Switch 	| true 	|
| urlStatus 	| URL to retrieve JSON with all Data 	| true 	|
| stateName 	| JSON Parameter Name for Reading ON/OFF 	| true 	|
| onStatusValue 	| JSON return Value for status ON  	| true 	|
| offStatusValue 	| JSON return Value for status OFF 	| true 	|
| inUseStateName 	| JSON status param in Use	| false 	|
| inUseOnStatusValue 	| JSON return Value for inUSE ON 	| false 	|
| inUseOffStatusValue 	| JSON return Value for inUSE OFF 	| false 	|
| sensorUrl 	| JSON file containing sensor readings (temperature, humidity) 	| true 	|
| temperatureName 	| JSON param name for Temperature reading 	| true 	|
| humidityName 	| JSON param name for Humidity reading 	| true 	|
| useRGB 	| Use RGB instead of HSV (true/false) 	| true 	|
| useBrightness255 	| Use Brightness 0 - 255 not 0 - 100 (true/false) 	| true 	|
| useColorTKelvin 	| Color Temperature in Mired (153-500), Kelvin (2000-6500) 	| true 	|
| rgbParamName 	| JSON Parameter Name for RGB color 	| false 	|
| urlLightBulbControl 	| HTTP address where to send Device control commands (POST) 	| false 	|
| brightnessParamName 	| JSON Parameter Name for Brightness 	| false 	|
| saturationParamName 	| JSON Parameter Name for Saturation 	| false 	|
| hueParamName 	| JSON Parameter Name for HUE 	| false 	|
| colorTemperatureParamName 	| JSON Parameter Name for Color Temperature 	| false 	|
| paramNameActive 	| JSON Parameter Name for On / Off 	| true 	|
| paramNameRotationSpeed 	| JSON Parameter Name for Rotation speed 	| false 	|
| paramNameRotationDirection 	| JSON Parameter Name for Rotation Direction 	| false 	|
| paramNameSwingMode 	| JSON Parameter Name for Swing Mode 	| false 	|
| paramNameCurrentFanState 	| JSON Parameter Name for Current Fans Status 	| false 	|
| paramNameTargetFanState 	| JSON Parameter Name for Automation 	| false 	|
| updateInterval 	| update interval for reading Sensors, default is 60000 = 60 seconds = 1 minute 	| false 	|
| mqttBroker 	| URL of MQTT Broker 	| true/false 	|
| mqttReconnectInterval 	| reconnect interval when no connection to MQTT Broker, default is 60 seconds 	| true/false 	|
| mqttPort 	| MQTT port 	| false 	|
| mqttTemperature 	| Temperature Topic 	| true 	|
| mqttHumidity 	| Humidity Topic 	| true 	|
| mqttUsername 	| MQTT Broker username 	| false 	|
| mqttPassword 	| MQTT Broker password 	| false 	|
| mqttSwitch 	| Switch Topic 	| true 	|
| mqttInUse 	| Outlet in Use Topic 	| false 	|
| mqttMotionSensor 	| Motion Sensor Topic 	| true 	|
| mqttRGB 	| MQTT Topic for RGB	| false 	|
| mqttBrightness 	| MQTT Topic for Brightness	| false 	|
| mqttHue 	| MQTT Topic for Hue	| false 	|
| mqttSaturation 	| MQTT Topic for Saturation	| false 	|
| mqttColorTemperature 	| MQTT Topic for Color Temperature	| false 	|
| mqttRotationSpeed 	| MQTT Topic for Rotation Speed	| false 	|
| mqttRotationDirection 	| MQTT Topic for Rotation Direction	| false 	|
| mqttSwingMode 	| MQTT Topic for Swing Mode	| false 	|
| mqttCurrentFanState 	| MQTT Topic for Current Fan State	| false 	|
| mqttTargetFanState 	| MQTT Topic for Automation	| false 	|
| motionSensorName 	| JSON param name for Motion Sensor reading 	| true 	|
| motionSensorUrl 	| JSON file containing Motion Sensor readings 	| true 	|
| updateIntervalMotionSensor 	| update interval for reading Motion Sensor, default is 60000 = 60 seconds = 1 minute 	| true 	|
| discordWebhook 	| URL to Discord WebHook 	| false 	|
| discordUsername 	| Name for message publisher 	| false 	|
| discordAvatar 	| URL to Online Avatar image 	| false 	|
| discordMessage 	| Message 	| false 	|
</details>
<br><br>  
  

Compromise: Switch accessory, in order to work properly getStatus is bind in 5 sec interval. This is for passive devices not pushing their 
status.
I have several devices built by my self like ESP8266 with relay and I'm just switching state. I have JSON file showing status:
```json
{
    "POWER": "ON"
}
```
<br><br>  
  

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
> - `package.json -> engines.node` value of `"^18.20.4 || ^20.18.0 || ^22.10.0"`
> 