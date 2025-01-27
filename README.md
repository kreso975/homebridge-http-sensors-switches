<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

<span align="center">

### Homebridge Platform Plugin
# HTTP Sensors and Switches

</span>

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) &nbsp;
<img src="https://img.shields.io/badge/node-^18.20.4%20%7C%7C%20^20.16.0%20%7C%7C%20^22.5.1-brightgreen"> &nbsp;
<img src="https://img.shields.io/badge/homebridge-^1.8.0%20%7C%7C%20^2.0.0.beta.0-brightgreen"> &nbsp;
[![Donate](https://img.shields.io/badge/donate-PayPal-blue.svg)](https://paypal.me/kreso975)

This plugin communicates with your devices over HTTP or MQTT. Currently it supports Switches, Temperature/Humidity and Motion sensor.  
Simple Discord Webhooks available in Switches  

<br><br>

## 🕺 Motion Sensor 
> [!NOTE]  
> HTTP - Read status (true/false) from JSON - {"Motion": true}  
> MQTT - Read status (true/false)  
```
{
    "Motion": false
}
```
  
## <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" width="64px" height="42px" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path style="fill:#CCC3A8;" d="M412.983,134.233v356.656c0,7.176-5.817,12.992-12.992,12.992H112.008 c-7.176,0-12.992-5.816-12.992-12.992V21.111c0-7.176,5.816-12.992,12.992-12.992h287.982c7.175,0,12.992,5.816,12.992,12.992v86.42 "></path> <rect x="158.758" y="69.255" style="fill:#D64330;" width="194.485" height="373.488"></rect> <polyline style="fill:#E35F46;" points="317.734,109.257 353.243,109.257 353.243,442.745 158.756,442.745 158.756,109.257 288.504,109.257 "></polyline> <rect x="158.758" y="276.007" style="fill:#F26E5C;" width="194.485" height="166.748"></rect> <path style="fill:#C9B585;" d="M129.671,490.889V21.111c0-7.176,5.816-12.992,12.992-12.992h-22.661 c-7.176,0-12.992,5.816-12.992,12.992v469.777c0,7.176,5.816,12.992,12.992,12.992h22.661 C135.486,503.88,129.671,498.064,129.671,490.889z"></path> <g style="opacity:0.1;"> <path style="fill:#F5F5F5;" d="M407.985,8.12H240.153c-18.346,41.13-28.559,86.688-28.559,134.633 c0,139.839,86.757,259.415,209.382,307.842V134.233v-26.701v-86.42C420.976,13.936,415.158,8.12,407.985,8.12z"></path> </g> <g> <circle style="fill:#231F20;" cx="380.027" cy="39.688" r="10.826"></circle> <circle style="fill:#231F20;" cx="380.027" cy="471.661" r="10.826"></circle> <path style="fill:#231F20;" d="M256,152.824c-4.484,0-8.12,3.634-8.12,8.12v61.044c0,4.485,3.635,8.12,8.12,8.12 c4.485,0,8.12-3.634,8.12-8.12v-61.044C264.12,156.459,260.484,152.824,256,152.824z"></path> <path style="fill:#231F20;" d="M256,403.995c23.58,0,42.764-19.184,42.764-42.764S279.58,318.467,256,318.467 s-42.764,19.184-42.764,42.764S232.419,403.995,256,403.995z M256,334.707c14.626,0,26.525,11.898,26.525,26.525 c0,14.626-11.898,26.525-26.525,26.525c-14.625,0-26.525-11.898-26.525-26.525C229.475,346.605,241.374,334.707,256,334.707z"></path> <path style="fill:#231F20;" d="M412.983,115.651c4.484,0,8.12-3.634,8.12-8.12v-86.42C421.103,9.471,411.632,0,399.992,0H112.008 c-11.642,0-21.111,9.471-21.111,21.111v469.777c0,11.641,9.47,21.111,21.111,21.111h287.983c11.641,0,21.111-9.471,21.111-21.111 V134.233c0-4.485-3.635-8.12-8.12-8.12c-4.485,0-8.12,3.634-8.12,8.12v356.656c0,2.686-2.186,4.872-4.872,4.872H112.008 c-2.687,0-4.872-2.186-4.872-4.872V21.111c0-2.686,2.185-4.872,4.872-4.872h287.983c2.686,0,4.872,2.186,4.872,4.872v86.42 C404.863,112.017,408.498,115.651,412.983,115.651z"></path> <path style="fill:#231F20;" d="M158.756,61.135c-4.484,0-8.12,3.634-8.12,8.12v40.002v166.745v166.743 c0,4.485,3.635,8.12,8.12,8.12h194.488c4.485,0,8.12-3.634,8.12-8.12V276.003V109.257V69.255c0-4.485-3.634-8.12-8.12-8.12H158.756 z M345.124,77.375v23.763h-27.39c-4.484,0-8.12,3.634-8.12,8.12c0,4.485,3.635,8.12,8.12,8.12h27.39v150.506H166.875V117.377 h121.629c4.485,0,8.12-3.634,8.12-8.12c0-4.485-3.634-8.12-8.12-8.12H166.875V77.375H345.124z M345.124,434.625H166.875V284.123 h178.248V434.625z"></path> <circle style="fill:#231F20;" cx="131.519" cy="39.688" r="10.826"></circle> <circle style="fill:#231F20;" cx="131.519" cy="471.661" r="10.826"></circle> </g> </g></svg><svg version="1.1" id="_x35_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve" width="32px" height="32px" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <path style="fill:#E3E2E2;" d="M460.208,35.205v441.589c0,19.38-15.826,35.206-35.205,35.206H35.206 C15.825,512,0,496.175,0,476.794V35.205C0,15.825,15.825,0,35.206,0h389.797c0.508,0,1.016,0,1.439,0.085 c18.28,0.677,33.005,15.487,33.682,33.682C460.208,34.274,460.208,34.697,460.208,35.205z"></path> <path style="fill:#F7F7F7;" d="M425.04,14.827H35.168c-11.218,0-20.344,9.127-20.344,20.344v441.658 c0,11.217,9.127,20.344,20.344,20.344H425.04c11.218,0,20.344-9.127,20.344-20.344V35.171 C445.384,23.954,436.258,14.827,425.04,14.827z"></path> <g> <g> <circle style="fill:#E3E2E2;" cx="230.104" cy="256" r="147.027"></circle> <path style="fill:#FFFFFF;" d="M227.527,392.645c-75.347-1.421-135.49-63.876-134.069-139.222 c1.421-75.347,63.876-135.49,139.223-134.069c75.347,1.421,135.49,63.876,134.069,139.222 C365.329,333.923,302.874,394.066,227.527,392.645z"></path> </g> <g> <rect x="170.369" y="196.265" style="fill:#FFFFFF;" width="32.18" height="77.675"></rect> <rect x="268.017" y="196.265" style="fill:#FFFFFF;" width="32.18" height="77.675"></rect> </g> <g> <rect x="165.19" y="191.086" style="fill:#656668;" width="32.179" height="77.675"></rect> <rect x="262.838" y="191.086" style="fill:#656668;" width="32.18" height="77.675"></rect> </g> <path style="fill:#FFFFFF;" d="M235.761,295.886h-0.957c-15.257,0-27.741,12.483-27.741,27.741v27.741h56.438v-27.742 C263.502,308.369,251.019,295.886,235.761,295.886z"></path> <path style="fill:#656668;" d="M230.583,290.954h-0.957c-15.257,0-27.741,12.483-27.741,27.741v27.741h56.438v-27.742 C258.323,303.437,245.84,290.954,230.583,290.954z"></path> </g> <g style="opacity:0.5;"> <g> <circle style="fill:#E3E2E2;" cx="62.576" cy="61.132" r="31.071"></circle> <circle style="fill:#E3E2E2;" cx="399.922" cy="61.132" r="31.071"></circle> </g> <g> <circle style="fill:#E3E2E2;" cx="62.576" cy="452.484" r="31.071"></circle> <circle style="fill:#E3E2E2;" cx="399.922" cy="452.484" r="31.071"></circle> </g> </g> </g> <path style="opacity:0.02;fill:#040000;" d="M460.208,35.205v441.589c0,19.38-15.826,35.206-35.205,35.206H230.104V0h194.899 c0.508,0,1.016,0,1.439,0.085c18.28,0.677,33.005,15.487,33.682,33.682C460.208,34.274,460.208,34.697,460.208,35.205z"></path> </g> </g></svg> &nbsp;&nbsp;Switch & Outlet  
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
```
{
    "POWER": "ON", "inUSE": false
}
```
<br><br>  
  

## 🌡️ Temperature and Humidity sensor
> [!NOTE]
> Sensor - Read JSON Or MQTT for Temperature, Humidity  
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
```
{
    "t": "29.37",
    "h": "48.26",
    "p": "1001.33"
}
```
<br>

## ⚙️ Config example

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
```
<br><br>

## ⚙️ Config params

| **Param** 	| **Description** 	| **Param needed** 	|
|---	|---	|:---:	|
| deviceType 	| Sensor or Switch 	| true 	|
| deviceName 	| Name for Your Accessory 	| true 	|
| deviceID 	| Uniqe ID for this Accessory 	| true 	|
| deviceManufacturer 	| Name for Manufacturer of this Accessory 	| false 	|
| deviceModel 	| Name of model for this Accessory 	| false 	|
| deviceSerialNumber 	| Unique serial number 	| false 	|
| deviceFirmwareVersion 	| Firmware running on device 	| false 	|
| urlON 	| URL to Turn ON the Switch 	| true 	|
| urlOFF 	| URL to Turn OFF the Switch 	| true 	|
| urlStatus 	| URL to retrieve the switch status (on/off) 	| true 	|
| stateName 	| JSON status param 	| true 	|
| onStatusValue 	| JSON return Value for status ON 	| true 	|
| offStatusValue 	| JSON return Value for status OFF 	| true 	|
| inUseStateName 	| JSON status param in Use	| false 	|
| inUseOnStatusValue 	| JSON return Value for inUSE ON 	| false 	|
| inUseOffStatusValue 	| JSON return Value for inUSE OFF 	| false 	|
| sensorUrl 	| JSON file containing sensor readings (temperature, humidity) 	| true 	|
| temperatureName 	| JSON param name for Temperature reading 	| true 	|
| humidityName 	| JSON param name for Humidity reading 	| true 	|
| updateInterval 	| update interval for reading Sensors, default is 60000 = 60 seconds = 1 minute 	| false 	|
| mqttBroker 	| URL of MQTT Broker 	| true/fale 	|
| mqttReconnectInterval 	| reconnect interval when no connection to MQTT Broker, default is 60 seconds 	| true/fale 	|
| mqttPort 	| MQTT port 	| false 	|
| mqttTemperature 	| Temperature Topic 	| true 	|
| mqttHumidity 	| Humidity Topic 	| true 	|
| mqttUsername 	| MQTT Broker username 	| false 	|
| mqttPassword 	| MQTT Broker password 	| false 	|
| mqttSwitch 	| Switch Topic 	| true 	|
| mqttInUse 	| Outlet in Use Topic 	| false 	|
| mqttMotionSensor 	| Motion Sensor Topic 	| true 	|
| motionSensorName 	| JSON param name for Motion Sensor reading 	| true 	|
| motionSensorUrl 	| SON file containing Motion Sensor readings 	| true 	|
| updateIntervalMotionSensor 	| update interval for reading Motion Sensor, default is 60000 = 60 seconds = 1 minute 	| true 	|
| discordWebhook 	| URL to Discord WebHook 	| false 	|
| discordUsername 	| Name for message publisher 	| false 	|
| discordAvatar 	| URL to Online Avatar image 	| false 	|
| discordMessage 	| Message 	| false 	|

<br><br>  
  

Compromise: Switch accessory, in order to work properly getStatus is bind in 5 sec interval. This is for passive devices not pushing their 
status.
I have several devices built by my self like ESP8266 with relay and I'm just switching state. I have JSON file showing status:
```
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
> - `package.json -> engines.node` value of `"^18.20.4 || ^20.16.0 || ^22.5.1"`
> 