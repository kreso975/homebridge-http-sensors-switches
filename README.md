<p align="center">

<img src="https://github.com/kreso975/homebridge-http-sensors-switches/blob/latest/img/homebridge-http-sensors-switches.png?raw=true" width="100">

</p>

<span align="center">

### Homebridge Platform Plugin
# HTTP Sensors and Switches

</span>

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) &nbsp;
<img src="https://img.shields.io/badge/node-^20.18.0%20%7C%7C%20^22.10.0%20%7C%7C%20^24.0.0-brightgreen"> &nbsp;
<img src="https://img.shields.io/badge/homebridge-^1.8.0%20%7C%7C%20^2.0.0-brightgreen"> &nbsp;
[![Donate](https://img.shields.io/badge/donate-PayPal-blue.svg)](https://paypal.me/kreso975)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-donate-gray?logo=ko-fi&logoColor=white&labelColor=blue)](https://ko-fi.com/kreso975)

This plugin communicates with your devices using HTTP or MQTT. Currently it supports Light Bulb, Switches, Outlets, Fan, Valve, Sprinkler / Irrigation, Shower, Tap, Door, Garage Door, Shades / Blinds, Temperature/Humidity, Motion, Contact and Occupancy sensor, Air Quality, Smoke, Carbon Dioxide and Light Sensor.  
    
Simple Discord Webhooks available in Light Bulb, Switches and Outlets and sensors.   

<br>

## <img src="https://github.com/kreso975/homebridge-http-sensors-switches/blob/latest/img/share.svg?raw=true" alt="Shared Polling" height=26 width=26 /> Shared Polling
> [!NOTE]  
> Multiple accessories can use same data source http://url/source.json  
> Enable Shared Polling under HTTP. Set Group name, Data Source URL and Update Interval for each.  
>  
> Supported Nested JSON data structure: 'switches.switch2'
```json
{
    "switches": {
        "switch1": 1,
        "switch2": 0
        },
    "temperature1": 12.23,
    "temperature2": 24.43
}
```  
<details>
<summary>⚙️ Parameters</summary>

```json
{
    "sharedPolling": true,
    "sharedPollingId": "Switches",
    "sharedPollingInterval": 5000, // Miliseconds - 5sec
    "urlStatus": "THIS MUST BE INSERTED FOR ALL IN SHARED POLL",
}
```  

</details>  
<br>

## 🕺 Motion, Contact & Occupancy Sensor 
> [!NOTE]  
> HTTP - Read status (true or 1 /false or 0) from JSON  
> MQTT - Read status (true or 1/false or 0)   
>  
> Parameters for services you do NOT need, should be left BLANK  
  

<details>
<summary>⚙️ Parameters</summary>
    
| **Param** 	| **Description** 	| **Values** 	|  
|---	|---	|:---:	|  
| paramNameOccupancyDetected <br> mqttOccupancyDetected 	| Occupancy Status 	| 0 (Not detected), 1 (Detected) 	|  
| paramNameMotionDetected <br> mqttMotionDetected 	| Motion Status 	| 0 (Not detected), 1 (Detected) 	|   
| paramNameContactSensorState <br> mqttContactSensorState 	| Contact status	|  0: Contact detected (closed), 1: Contact not detected (open) 	|   
| paramNameStatusActive <br> mqttStatusActive 	| Status of Sensor 	| 0 (Inactive), 1 (Active) 	|   
| paramNameStatusFault <br> mqttStatusFault 	| Fault status	| 0 (No Fault), 1 (Fault Detected) 	|  
| paramNameStatusLowBattery <br> mqttStatusLowBattery 	| Battery status 	| 0 (Battery OK), 1 (Low Battery) 	|  
| paramNameStatusTampered <br> mqttStatusTampered 	| Tempered Status 	|0 (No Tampering), 1 (Tampered) 	|  
  
</details>
<br>  
  
```json
{
   "MotionSensor": {
      "MotionDetected": 1,
      "Active": 1,
      "Fault": 0,
      "BatteryLevel": 0,
      "LowBattery": 0,
      "Tampered": 0
   },
   "OccupancyDetected": 0,
   "Active" : 1,
   "Fault" : 0,
   "BatteryLevel": 0,
   "LowBattery" : 1,
   "Tampered" : 0
 }
```
<br>

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
> Parameters for services you do NOT need, should be left BLANK   
  
<details>
<summary>⚙️ Parameters</summary>
    
| **Param** 	| **Description** 	| **Values** 	|  
|---	|---	|:---:	|  
| urlON 	| URL to Turn ON Device 	| URL 	|  
| urlOFF 	| URL to Turn OFF Device 	| URL 	|   
| urlStatus 	| URL to retrieve JSON with all Data	|  URL 	|   
| urlLightBulbControl 	| HTTP address where to send Device control commands (POST) 	|URL 	|  
| stateName 	| JSON Parameter Name for Reading ON/OFF 	| Key 	|   
| onStatusValue 	| JSON return Value for status ON	| ON, true, 1  	|  
| offStatusValue 	| JSON return Value for status ON 	| Off, false, 0 	|  
| useRGB 	| Use RGB instead of HSV 	| true / false 	|  
| useBrightness255 	| Use Brightness 0 - 255 not 0 - 100 	| true / false 	|  
| useColorTKelvin  	| Color Temperature in Mired (153-500), Kelvin (2000-6500) 	| true / false 	|  
| rgbParamName <br> mqttRGB	| JSON Parameter Name for RGB color / mqtt Topic 	|String 	|  
| brightnessParamName <br> mqttBrightness 	| JSON Parameter Name for Brightness / mqtt Topic 	| String 	|  
| saturationParamName <br> mqttSaturation 	| JSON Parameter Name for Saturation / mqtt Topic 	|String 	|  
| hueParamName <br> mqttHue 	| JSON Parameter Name for HUE / mqtt Topic 	| String 	|  
| colorTemperatureParamName <br> mqttColorTemperature 	| JSON Parameter Name for Color Temperature / mqtt Topic 	| String 	|  
  
</details>
<br>  

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
> useRGB will Send and Receive values in RGB format  
> If useRGB is set, Saturation and Hue will not be sent or read.  Brightness will be calculated from RGB value.
>   
> useBrightness 0-255 will Send and Receive converted Brightness value in range 0-255  
>  
> Parameters for services you do NOT NEED, should be left BLANK  
  
> [!IMPORTANT]  
> Use HTTP or MQTT not both for same accessory.  
  
<br>

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


> [!CAUTION]  
> Parameter:
> urlStatus = 'url points to JSON with device status' when is set it will bind Accessory into 5 sec check status interval
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
> Added support for Battery  

> [!IMPORTANT]  
> MQTT is just an basic implementation, no encription etc.  
>  

<details>
<summary>⚙️ Parameters</summary>
    
| **Param** 	| **Description** 	| **Values** 	|  
|---	|---	|:---:	|  
| temperatureName <br> mqttTemperature	| param name for Temperature reading 	| paramName or topic 	|  
| humidityName <br> mqttHumidity	| param name for Humidity reading 	| paramName or topic 	|   
| sensorUrl 	| JSON file containing sensor readings (temperature, humidity)	|  URL 	|   
| updateInterval 	| Update interval for reading Sensors	|  miliseconds 	|   
| paramNameBatteryLevel <br> mqttBatteryLevel	| Current battery percentage (0–100%) 	| 0 (Empty), 100 (Full) 	|  
| paramNameStatusLowBattery <br> mqttRotationSpeed 	| Low Battery Indicator 	| 0: Battery level is OK, 1: Battery level is LOW 	| 
| paramNameStatusChargingBattery <br> mqttLowBattery	| Charging Status 	| 0: Not charging, 1: Charging, 2: Not chargeable 	| 
  
</details>
<br>

Sensor JSON file example
```json
{
   "t": 25.25,
   "h": 33.54,
   "p": 1025.04,
   "sensor2": {
     "t": 32.2,
     "h": 57.14,
     "BatteryLevel": 99,
     "BatteryCharging": 0,
     "BatteryLow": 0
   }
}
```
<br>

## 🔋 Battery

> [!NOTE]  
> You can use the Discord Webhook to receive notifications in your Discord channel whenever **Status Low Battery** changes.
>
> HomeKit does **not support standalone battery accessories**.  
> If a battery service is exposed as its own accessory, it will appear in the Home app but show a *"Not Supported"* message and **cannot be used in automations**.
> 
> To ensure compatibility with HomeKit, battery status must be added as a **secondary service** to a supported primary accessory (e.g., sensors, switches, outlets).  
> This allows the battery status to be displayed properly in the Home app, even though it still cannot be used as a trigger in HomeKit automations.
> 
> Standalone battery services are fully functional in the Homebridge UI and can be monitored or used with external integrations like Discord notifications.

<details>
<summary>⚙️ Parameters</summary>
    
| **Param** 	| **Description** 	| **Values** 	|  
|---	|---	|:---:	|  
| paramNameBatteryLevel <br> mqttBatteryLevel	| Current battery percentage (0–100%) 	| 0 (Empty), 100 (Full) 	|  
| paramNameStatusLowBattery <br> mqttRotationSpeed 	| Low Battery Indicator 	| 0: Battery level is OK, 1: Battery level is LOW 	| 
| paramNameStatusChargingBattery <br> mqttLowBattery	| Charging Status 	| 0: Not charging, 1: Charging, 2: Not chargeable 	| 
  
</details>
<br>  

<details>
<summary>⚙️ Fan JSON Example</summary>

```json
{
    "Level": 100,
    "LowBattery": 0,
    "Charging": 0
}
```

</details>

<br>

## <img src="https://github.com/kreso975/homebridge-http-sensors-switches/blob/latest/img/fan.svg?raw=true" alt="Fan plugin" height=26 width=26 /> Fan  

> [!NOTE]  
>  
> HTTP  
> Read interval 5 sec  
> Select HTTP Method - GET / POST  
> 
> MQTT  
> param for ACTIVE is mqttSwitch  
>   
> Parameters for SERVICES you do NOT NEED, should be left BLANK  
>  
> Discord Webhook publishes Fan status to your Discord channel (On/Off)   
  

> [!CAUTION]  
> Parameter:
> urlStatus = 'url points to JSON with device status' when is set it will bind Accessory to 5 sec check status interval  

<details>
<summary>⚙️ Parameters</summary>
    
| **Param** 	| **Description** 	| **Values** 	|  
|---	|---	|:---:	|  
| paramNameStatusActive <br> mqttSwitch	| Turn Fan On / Off 	| 0 (Inactive), 1 (Active) 	|  
| paramNameRotationSpeed <br> mqttRotationSpeed 	| Rotation Speed 	| Valid range: 0 to 100 	| 
| paramNameRotationDirection <br> mqttRotationDirection	| Fan turn direction 	| 0 (Clockwise), 1 (Counterclockwise) 	| 
| paramNameSwingMode <br> mqttSwingMode	| Swing Mode On / Off 	| 0 (Disabled), 1 (Enabled) 	| 
| paramNameTargetFanState <br> mqttTargetFanState	| Automatione mode 	|0 (Manual), 1 (Automatic) 	| 
| paramNameCurrentFanState <br> mqttCurrentFanState	| Read Status of Fan 	| 0 (Inactive), 1 (Idle), 2 (Blowing Air) 	| 
  
</details>
<br>  

<details>
<summary>⚙️ Fan JSON Example</summary>

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

</details>
<br>

## 💧💦 🚿  Valve, Sprinkler / Irrigation, Tap, Shower  

> [!NOTE]  
>  
> HTTP  
> Read interval 5 sec  
> 
> If param InUse is not in use SET it with the same value as StatusActive so that can be triggered with same value, enabling it to set On/Off    
>   
>  Param ValveType is set in Config so it does not need to be set in JSON. Dynamic change is not supported in current plugin version
>  

<details>
<summary>⚙️ Parameters</summary>
    
| **Param** 	| **Description** 	| **Values** 	|  
|---	|---	|:---:	|  
| paramNameStatusActive <br> mqttSwitch	| Set Valve Status 	| 0 (Inactive), 1 (Active) 	|  
| paramNameInUse <br> mqttInUse 	| In Use Status 	| 0 (Not in Use), 1 (In Use) 	| 
| paramNameValveType	| Valve Type 	| 0: Generic valve, 1: Irrigation, 2: Shower head, 3: Tap 	| 
  
</details>
<br>  

<details>
<summary>⚙️ Valve JSON Example</summary>

```json
{
    "StatusActive": 0,
    "InUse": 0,
    "ValveType": 1
}
```

</details>

<br>

## <img src="https://github.com/kreso975/homebridge-http-sensors-switches/blob/latest/img/garage.svg?raw=true" alt="Garage Door plugin" height=26 width=26 />  Door, Garage Door, Window, <img src="https://github.com/kreso975/homebridge-http-sensors-switches/blob/latest/img/blinds.svg?raw=true" alt=", Blinds / Shades plugin" height=26 width=26 /> Blinds / Shades  

> [!NOTE]   
>   
> Parameters for SERVICES you do NOT NEED, should be left BLANK  
>  
> Discord Webhook publishes status to your Discord channel (On/Off) 
  
<details>
<summary>⚙️ Parameters</summary>
    
| **Param** 	| **Description** 	| **Values** 	|  
|---	|---	|:---:	|  
| paramNameTargetDoorState <br> mqttTargetDoorState	| SET Door position 	| 0 (Open), 1 (Closed) 	|  
| paramNamePositionState <br> mqttPositionState	| Door state 	| 0 (Closing), 1 (Opening), 2 (stopped) 	|  
| paramNameCurrentDoorState <br> mqttCurrentDoorState 	| Door state 	| 0: Open, 1: Closed, 2: Opening, 3: Closing, 4: Stopped 	| 
| paramNameObstructionDetected <br> mqttObstructionDetected 	| Read Obstruction 	| 0: false, 1: true 	| 
| paramNameStatusJammed <br> mqttStatusJammed 	| Is Jammed 	| 0 (not jammed), 1 (Jammed) 	| 
| paramNameTargetPosition <br> mqttTargetPosition 	| Set Position 	| Range: 0 (Fully Closed) to 100 (Fully Open) 	| 
| paramNameCurrentPosition <br> mqttCurrentPosition 	| Read Current Possition 	| Range: 0 (Fully Closed) to 100 (Fully Open) 	| 
| paramNamePositionState <br> mqttPositionState 	| Read position state 	| 0: Closing, 1: Opening, 2: Stopped 	| 
| paramNameHoldPosition <br> mqttHoldPosition 	| Enables holding a specific position 	| 0, 1 	| 
   
</details>
<br>  

<details>
<summary>⚙️ JSON Example</summary>

```json
{
    "door": {
        "TargetPosition": 0,  // 0 - 100 %
        "CurrentPosition": 0, // 0 - 100 %
        "PositionState": 2,
        "ObstructionDetected": 0,
        "DeviceJammed": 0,
    },
    "garage": {
        "TargetDoorState": 0,
        "CurrentDoorState": 1,
        "ObstructionDetected": 0,
        "StatusJammed": 0
    },
    "Window": {
        "TargetPosition": 0,
        "CurrentPosition": 0,
        "PositionState": 0
    },
    "WindowCovering": {
        "TargetPosition": 0,
        "CurrentPosition": 0,
        "PositionState": 2,
        "HoldPosition": 0,
        "StatusJammed": 0
    }
}
```

</details>
<br>

## <img src="https://github.com/kreso975/homebridge-http-sensors-switches/blob/latest/img/detector.svg?raw=true" alt="Smoke, Carbon Dioxide, Air Quality" height=26 width=26 />  Smoke, Carbon Dioxide & Air Quality Detector

> [!NOTE]  
>   
> Parameters for SERVICES you do NOT NEED, leave BLANK  
>  
> Discord Webhook publishes change in Carbon Dioxide Detected, Smoke Detected and Status Low Battery to your Discord channel   
  
<details>
<summary>⚙️ Parameters</summary>
    
| **Param**                                   | **Description**                     | **Values**                                    |
|---------------------------------------------|-------------------------------------|-----------------------------------------------|
| paramNameCarbonDioxideDetected <br> mqttCarbonDioxideDetected | Read Detection                     | 0: no Detection, 1: Detected                 |
| paramNameCarbonDioxideLevel <br> mqttCarbonDioxideLevel       | CO2 Concentration                  | Range: 0 to 5000 ppm                          |
| paramNameCarbonDioxidePeakLevel <br> mqttCarbonDioxidePeakLevel | Peak CO2 Concentration            | Range: 0 to 5000 ppm                          |
| paramNameStatusActive <br> mqttStatusActive                   | Is Active                          | 0: Inactive, 1: Active                        |
| paramNameStatusFault <br> mqttStatusFault                     | Fault Status                       | 0: No Fault, 1: Fault                         |
| paramNameStatusLowBattery <br> mqttStatusLowBattery           | Battery Status                     | 0: Normal, 1: Low                             |
| paramNameStatusTampered <br> mqttStatusTampered               | Tampered Status                    | 0: Not Tampered, 1: Tampered                  |
| paramNameSmokeDetected <br> mqttSmokeDetected                 | Read Smoke Detection               | 0: No Smoke, 1: Smoke Detected                |
| paramNameAirQuality <br> mqttAirQuality                       | Air Quality Index                  | Range: 1 (Excellent) to 5 (Very Poor)         |
| paramNamePM2_5Density <br> mqttPM2_5Density                   | PM2.5 Particle Density             | Range: 0 to 500 µg/m³                         |
| paramNamePM10Density <br> mqttPM10Density                     | PM10 Particle Density              | Range: 0 to 500 µg/m³                         |
| paramNameOzoneDensity <br> mqttOzoneDensity                   | Ozone Concentration                | Range: 0 to 1000 µg/m³                         |
| paramNameNitrogenDioxideDensity <br> mqttNitrogenDioxideDensity | NO₂ Concentration                | Range: 0 to 1000 µg/m³                         |
| paramNameSulphurDioxideDensity <br> mqttSulphurDioxideDensity | SO₂ Concentration                | Range: 0 to 1000 µg/m³                         |
| paramNameCarbonMonoxideLevel <br> mqttCarbonMonoxideLevel     | CO Concentration                   | Range: 0 to 1000 ppm                           |
| paramNameVOCDensity <br> mqttVOCDensity     | Volatile Organic Compounds Level                   | Range: 0 to 1000 µg/m³                           |

   
</details>
<br>  

<details>
<summary>⚙️ JSON Example</summary>

```json
{
   "CO2Sensor2": {
      "CO2Detected": false,
      "CO2Level": 700,
      "CO2PeakLevel": 1400,
      "Active": 1,
      "Fault": 0,
      "LowBattery": 0,
      "Tampered": 0
   },
   "AirQualitySensor": {
    "AirQuality": 3,
    "PM2_5Density": 12.5,
    "PM10Density": 25.0,
    "OzoneDensity": 75.0,
    "NitrogenDioxideDensity": 40.0,
    "SulphurDioxideDensity": 20.0,
    "CarbonMonoxideLevel": 0.9,
    "VOXDensity": 350.0,
    "StatusActive": true,
    "StatusFault": false,
    "StatusLowBattery": false,
    "StatusTampered": false
   },
   "SmokeDetected": 0,
   "StatusActive" : true,
   "StatusFault" : 0,
   "LowBattery" : false,
   "StatusTampered" : 0
 }
 
```

</details>
<br>
  
## 🌟 Ambient Light Sensor

> [!NOTE]  
>  
> Discord Webhook publishes change in Carbon Dioxide Detected, Smoke Detected and Status Low Battery to your Discord channel   
  
<details>
<summary>⚙️ Parameters</summary>
    
| **Param**                                   | **Description**               | **Values**                            |
|---------------------------------------------|-------------------------------|---------------------------------------|
| paramNameCurrentAmbientLightLevel <br> mqttCurrentAmbientLightLevel | Ambient Light Level          | Range: 0.0001 to 100,000 lux          |
| paramNameStatusActive <br> mqttStatusActive                   | Is Active                    | 0: Inactive, 1: Active                |
| paramNameStatusFault <br> mqttStatusFault                     | Fault Status                 | 0: No Fault, 1: Fault                 |
| paramNameStatusLowBattery <br> mqttStatusLowBattery           | Battery Status               | 0: Normal, 1: Low                     |
| paramNameStatusTampered <br> mqttStatusTampered               | Tampered Status              | 0: Not Tampered, 1: Tampered          |

   
</details>
<br>  

<details>
<summary>⚙️ JSON Example</summary>

```json
{
   "AmbientLightSensor": {
      "CurrentAmbientLightLevel": 4500,
      "Active": true,
      "Fault": 0,
      "LowBattery": false,
      "Tampered": 0
   }
} 
```

</details>
<br>

## 🔐 HTTPS Certificate Handling

Version `2.2.0` introduces support for self-signed certificates and optional certificate validation skipping.

#### Configuration Options

| Key                  | Type    | Description                                                                 |
|----------------------|---------|-----------------------------------------------------------------------------|
| `ignoreHttpsCertErrors` | `boolean` | If `true`, HTTPS requests will skip certificate validation (use with caution). |
| `trustedCert`        | `string` | Inline PEM certificate content for trusted HTTPS connections.              |

#### Example

```json
{
  "urlStatus": "https://my.local.device/status",
  "ignoreHttpsCertErrors": false,
  "trustedCert": "-----BEGIN CERTIFICATE-----\\nMIIBIjANBgkqh...\\n-----END CERTIFICATE-----"
}
```
<br>

## 🖥️ Configurable Console Logs
Version 1.4.0 introduces a configuration option to control console logging for each accessory individually.
This provides better control over log verbosity and can improve performance by reducing unnecessary log entries.

#### ⚙️ Configuration Option

| Key             | Type     | Default | Description                                                                 |
|-----------------|----------|---------|-----------------------------------------------------------------------------|
| `enableLogging` | `boolean` | `true`  | Controls console output for the accessory. If `true`, logs all events. If `false`, only warnings and errors are shown. |

## Other

Compromise: Switch accessory, in order to work properly getStatus is bind in 5 sec interval. This is for passive devices not pushing their 
status.
I have several devices built by my self like ESP8266 with relay and I'm just switching state. I have JSON file showing status:
```json
{
    "POWER": "ON"
}
```
<br>

<details>
<summary>⚙️ Plugin Config example</summary>

```json
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
                    "enableLogging": true,
                    "deviceID": "896543287",
                    "deviceName": "Attic",
                    "deviceManufacturer": "NameTheManufacturer",
                    "deviceModel": "DHT",
                    "deviceSerialNumber": "203ab773-d5cd-42ww-b531-a98bba0e4444",
                    "deviceFirmwareVersion": "v1.4.0",
                    "sensorUrl": "http://192.168.1.74/mesures.json",
                    "temperatureName": "t",
                    "humidityName": "h",
                    "ignoreHttpsCertErrors": false,
                    "sharedPolling": true,
                    "sharedPollingId": "tempBatt",
                    "sharedPollingInterval": 60000,
                    "paramNameBatteryLevel": "sensor2.BatteryLevel",
                    "paramNameStatusLowBattery": "sensor2.BatteryLow",
                    "paramNameStatusChargingBattery": "sensor2.BatteryCharging",
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
                },
                {
                    "deviceType": "Fan",
                    "enableLogging": true,
                    "deviceID": "sssert45-58aaaa7f-689",
                    "deviceName": "Fan test",
                    "deviceManufacturer": "Stergo",
                    "deviceModel": "Stergo-Fan",
                    "deviceSerialNumber": "www2s5587-6s598-6s58",
                    "deviceFirmwareVersion": "v1",
                    "urlStatus": "http://192.168.1.101/test/Fanv2/fanv2.json",
                    "urlFanControl": "http://192.168.1.101/test/Fanv2/fanv2.php",
                    "paramNameStatusActive": "Fan2.Active",
                    "paramNameRotationSpeed": "Fan2.RotationSpeed",
                    "paramNameRotationDirection": "Fan2.RotationDirection",
                    "paramNameSwingMode": "Fan2.SwingMode",
                    "paramNameCurrentFanState": "Fan2.CurrentFanState",
                    "paramNameTargetFanState": "Fan2.TargetFanState"
                },
                {
                    "deviceType": "CarbonDioxideSensor",
                    "enableLogging": true,
                    "deviceID": "sssda3-23fdaf-sdadf-sdfsdf",
                    "deviceName": "CO2",
                    "deviceManufacturer": "Stergo",
                    "deviceModel": "vvdd",
                    "deviceSerialNumber": "33-2-2ds3-ss3-2223-323-w",
                    "deviceFirmwareVersion": "v1",
                    "sharedPolling": true,
                    "sharedPollingId": "CarbonDioxide",
                    "urlStatus": "http://192.168.1.101/test/co2.json",
                    "paramNameStatusActive": "Active",
                    "paramNameCO2Detected": "CO2Detected",
                    "paramNameCO2Level": "CO2Level",
                    "paramNameCO2PeakLevel": "CO2PeakLevel",
                    "paramNameStatusFault": "Fault",
                    "paramNameBatteryLevel": "BatteryLevel",
                    "paramNameStatusLowBattery": "LowBattery",
                    "paramNameStatusTampered": "Tampered",
                    "sensorUrl": "http://192.168.1.101/test/co2.json",
                    "sharedPollingInterval": 30000,
                    "discordWebhook": "https://discordapp.com/api/webhooks/",
                    "discordUsername": "Stergo",
                    "discordAvatar": ""
                },
                {
                    "deviceType": "OccupancySensor",
                    "enableLogging": true,
                    "deviceID": "sdadddd3-23fdddssdaf-sadf-sdfsdf",
                    "deviceName": "Occupancy",
                    "deviceManufacturer": "Stergo",
                    "deviceModel": "vvdd",
                    "deviceSerialNumber": "ddd33-2-2ss3-3-22dds23-323-w",
                    "deviceFirmwareVersion": "v1",
                    "sharedPolling": true,
                    "sharedPollingId": "CarbonDioxide",
                    "urlStatus": "http://192.168.1.101/test/co2.json",
                    "paramNameStatusActive": "CO2Sensor2.Active",
                    "paramNameOccupancyDetected": "CO2Sensor2.CO2Detected",
                    "paramNameStatusFault": "CO2Sensor2.Fault",
                    "paramNameBatteryLevel": "CO2Sensor2.BatteryLevel",
                    "paramNameStatusLowBattery": "CO2Sensor2.LowBattery",
                    "paramNameStatusTampered": "CO2Sensor2.Tampered",
                    "sensorUrl": "http://192.168.1.101/test/co2.json",
                    "sharedPollingInterval": 30000,
                    "mqttOccupancyDetected": "test/detect",
                    "mqttActive": "test/Active",
                    "discordWebhook": "https://discordapp.com/api/webhooks/",
                    "discordUsername": "Stergo",
                    "discordAvatar": ""
                },
                {
                    "deviceType": "LightBulb",
                    "enableLogging": true,
                    "deviceID": "12399ASdhz1244s9yt-2345-98g",
                    "deviceName": "Attic Clock",
                    "deviceManufacturer": "Stergo",
                    "deviceModel": "Test",
                    "deviceSerialNumber": "12399a-234sdf-34saf-234sdf",
                    "deviceFirmwareVersion": "000.06.002",
                    "useRGB": true,
                    "useBrightness255": true,
                    "useColorTKelvin": false,
                    "mqttBroker": "192.168.1.XXX",
                    "mqttPort": 1883,
                    "mqttUsername": "testuser",
                    "mqttPassword": "testuser",
                    "mqttSwitch": "iot/things/Attic/AtticClock/displayON",
                    "mqttRGB": "iot/things/Attic/AtticClock/Color"
                }
            ]
        }
    ]
}
```

</details>
<br>

<details>
<summary>⚙️ Config params</summary>

| **Param**                                   | **Description**                     | **Param needed**  |
|---------------------------------------------|-------------------------------------|-------------------|
| brightnessParamName                         | JSON Parameter Name for Brightness  | false             |
| colorTemperatureParamName                   | JSON Parameter Name for Color Temperature | false        |
| deviceFirmwareVersion                       | Firmware running on device          | false             |
| deviceID                                    | Unique ID for this Accessory        | true              |
| deviceManufacturer                          | Name for Manufacturer of this Accessory | false         |
| deviceModel                                 | Name of model for this Accessory    | false             |
| deviceName                                  | Name for Your Accessory             | true              |
| deviceSerialNumber                          | Unique serial number                | false             |
| deviceType                                  | Sensor or Switch                    | true              |
| discordAvatar                               | URL to Online Avatar image          | false             |
| discordMessage                              | Message                             | false             |
| discordUsername                             | Name for message publisher          | false             |
| discordWebhook                              | URL to Discord WebHook              | false             |
| enableLogging                               | Default is enabled (1)              | true              |
| hueParamName                                | JSON Parameter Name for HUE         | false             |
| humidityName                                | JSON param name for Humidity reading | true             |
| inUseOffStatusValue                         | JSON return Value for inUSE OFF     | false             |
| inUseOnStatusValue                          | JSON return Value for inUSE ON      | false             |
| inUseStateName                              | JSON status param in Use            | false             |
| motionSensorName                            | JSON param name for Motion Sensor reading | true        |
| motionSensorUrl                             | JSON file containing Motion Sensor readings | true     |
| mqttActive                                  | MQTT Topic for Active Status        | true              |
| mqttBrightness                              | MQTT Topic for Brightness           | false             |
| mqttBroker                                  | URL of MQTT Broker                  | true/false        |
| mqttCarbonDioxideDetected                   | MQTT Topic for CO2 Detection        | true              |
| mqttCarbonDioxideLevel                      | MQTT Topic for CO2 Level            | true              |
| mqttColorTemperature                        | MQTT Topic for Color Temperature    | false             |
| mqttContactSensorState                      | MQTT Topic for Contact Sensor State | false             |
| mqttCurrentDoorState                        | MQTT Topic for Current Door State   | true              |
| mqttCurrentFanState                         | MQTT Topic for Current Fan State    | false             |
| mqttCurrentPosition                         | MQTT Topic for Current Position     | true              |
| mqttHue                                     | MQTT Topic for Hue                  | false             |
| mqttInUse                                   | Outlet in Use Topic                 | false             |
| mqttMotionDetected                          | MQTT Topic for Motion Detection     | true              |
| mqttObstructionDetected                     | MQTT Topic for Obstruction Detection | false           |
| mqttOccupancyDetected                       | MQTT Topic for Occupancy Detection  | false             |
| mqttPassword                                | MQTT Broker password                | false             |
| mqttPort                                    | MQTT port                           | false             |
| mqttPositionState                           | MQTT Topic for Position State       | false             |
| mqttReconnectInterval                       | Reconnect interval to MQTT Broker   | true/false        |
| mqttRGB                                     | MQTT Topic for RGB                  | false             |
| mqttRotationDirection                       | MQTT Topic for Rotation Direction   | false             |
| mqttRotationSpeed                           | MQTT Topic for Rotation Speed       | false             |
| mqttSaturation                              | MQTT Topic for Saturation           | false             |
| mqttSmokeDetected                           | MQTT Topic for Smoke Detection      | true              |
| mqttStatusActive                            | MQTT Topic for Active Status        | true              |
| mqttStatusFault                             | MQTT Topic for Fault Status         | false             |
| mqttStatusJammed                            | MQTT Topic for Jammed Status        | false             |
| mqttStatusLowBattery                        | MQTT Topic for Low Battery Status   | false             |
| mqttStatusTampered                          | MQTT Topic for Tampered Status      | false             |
| mqttSwitch                                  | Switch Topic                        | true              |
| mqttSwingMode                               | MQTT Topic for Swing Mode           | false             |
| mqttTargetDoorState                         | MQTT Topic for Target Door State    | true              |
| mqttTargetFanState                          | MQTT Topic for Automation           | false             |
| mqttTargetPosition                          | MQTT Topic for Target Position      | true              |
| paramNameActive                             | JSON Parameter Name for On/Off      | true              |
| paramNameAmbientLightLevel                  | JSON Parameter Name for Ambient Light Level | true      |
| paramNameBatteryLevel <br> mqttBatteryLevel	| Current battery percentage (0–100%) 	| 0 (Empty), 100 (Full) 	|  
| paramNameStatusLowBattery <br> mqttRotationSpeed 	| Low Battery Indicator 	| 0: Battery level is OK, 1: Battery level is LOW 	| 
| paramNameStatusChargingBattery <br> mqttLowBattery	| Charging Status 	| 0: Not charging, 1: Charging, 2: Not chargeable 	| 
| paramNameCarbonDioxideDetected              | JSON Parameter Name for CO2 Detection | true          |
| paramNameCarbonDioxideLevel                 | JSON Parameter Name for CO2 Level   | true              |
| paramNameCarbonDioxidePeakLevel             | JSON Parameter Name for Peak CO2 Level | false        |
| paramNameContactSensorState                 | JSON Parameter Name for Contact Sensor State | false       |
| paramNameCurrentDoorState                   | JSON Parameter Name for Current Door State | true          |
| paramNameCurrentFanState                    | JSON Parameter Name for Current Fan State | false       |
| paramNameCurrentPosition                    | JSON Parameter Name for Current Position | true          |
| paramNameHoldPosition                       | JSON Parameter Name for Hold Position | false            |
| paramNameMotionDetected                     | JSON Parameter Name for Motion Detection | true        |
| paramNameObstructionDetected                | JSON Parameter Name for Obstruction Detection | false     |
| paramNameOccupancyDetected                  | JSON Parameter Name for Occupancy Detection | false       |
| paramNamePositionState                      | JSON Parameter Name for Position State | false            |
| paramNameRotationDirection                  | JSON Parameter Name for Rotation Direction | false     |
| paramNameRotationSpeed                      | JSON Parameter Name for Rotation Speed | false        |
| paramNameSmokeDetected                      | JSON Parameter Name for Smoke Detection | true        |
| paramNameStatusActive                       | JSON Parameter Name for Active Status | true          |
| paramNameStatusFault                        | JSON Parameter Name for Fault Status | false          |
| paramNameStatusJammed                       | JSON Parameter Name for Jammed Status | false            |
| paramNameStatusLowBattery                   | JSON Parameter Name for Low Battery Status | false     |
| paramNameStatusTampered                     | JSON Parameter Name for Tampered Status | false       |
| paramNameSwingMode                          | JSON Parameter Name for Swing Mode  | false             |
| paramNameTargetDoorState                    | JSON Parameter Name for Target Door State | true          |
| paramNameTargetFanState                     | JSON Parameter Name for Automation  | false             |
| paramNameTargetPosition                     | JSON Parameter Name for Target Position | true          |
| paramNameValveType                          | JSON Parameter Name for Valve Type - 0: Generic valve, 1: Irrigation, 2: Shower head, 3: Tap | true          |
| rgbParamName                                | JSON Parameter Name for RGB color   | false             |
| saturationParamName                         | JSON Parameter Name for Saturation  | false             |
| sensorUrl                                   | JSON file containing sensor readings (temperature, humidity) | true |
| stateName                                   | JSON Parameter Name for Reading ON/OFF | true          |
| temperatureName                             | JSON param name for Temperature reading | true         |
| updateInterval                              | Update interval for reading Sensors | false             |
| updateIntervalMotionSensor                  | Update interval for reading Motion Sensor | true      |
| urlLightBulbControl                         | HTTP address for sending Device control commands | false |
| urlOFF                                      | URL to Turn OFF the Switch          | true              |
| urlON                                       | URL to Turn ON the Switch           | true              |
| urlStatus                                   | URL to retrieve JSON with all Data  | true              |
| useBrightness255                            | Use Brightness 0-255 instead of 0-100 | true          |
| useColorTKelvin                             | Color Temperature in Mired (153-500), Kelvin (2000-6500) | true |
| useRGB                                      | Use RGB instead of HSV (true/false) | true              |


</details>
<br><br>  

> [!IMPORTANT]  
> **Homebridge v2.0 Information**
>
> This plugin currently supports
> - `package.json -> engines.homebridge` value of `"^1.8.0 || ^2.0.0-beta.0"`
> - `package.json -> devDependencies.homebridge` value of `"^2.0.0-beta.0"`
>
> This is to ensure that this plugin will build and run on both Homebridge v1 and v2.
>

> [!IMPORTANT]  
> **Node v18 Information**  
> Node.js version 18 (LTS) is scheduled to reach its end-of-life on April 30, 2025. After this date, it will no longer receive security updates or maintenance releases. If you're using Node.js 18, it's recommended to upgrade to a newer version, such as Node.js 20 or 22, to ensure continued security and stability.
>  
> Latest version of plugin supporting Node.js v18 is v2.2.x
>
> This template currently has set
> - `package.json -> engines.node` value of `"^20.18.0 || ^22.10.0 || ^24.0.0"`
> 
<br>

## Development Setup

If you want to work on this plugin locally instead of just using it via npm, follow these steps:

### 1. Clone the Repository
```bash
git clone https://github.com/kreso975/homebridge-http-sensors-switches.git
cd homebridge-http-sensors-switches
```

### 2. Install Dependencies
Make sure you have Node.js (LTS recommended) and Homebridge installed globally.

```bash
npm install
```

### 3. VS Code Environment
This project includes a `.vscode` folder with recommended settings and tasks:
- Debugging configurations for running Homebridge with the plugin.
- Preconfigured linting and formatting.
- Launch tasks to simplify development.

Open the project in VS Code:
```bash
code .
```

### 4. Link Plugin for Local Testing
To test changes in your Homebridge setup without publishing to npm:

```bash
npm run build   # if a build step exists
```
