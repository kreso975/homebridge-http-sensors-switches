import { CharacteristicSetCallback, CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions } from 'mqtt';
import { discordWebHooks } from './lib/discordWebHooks.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformLightBulb {
  public service!: Service;
  public mqttClient!: mqtt.MqttClient;

  public enableLogging: boolean = true;
  public deviceId: string = '';
  public deviceType: string = '';
  public deviceName: string = '';
  public deviceManufacturer: string = '';
  public deviceModel: string = '';
  public deviceSerialNumber: string = '';
  public deviceFirmwareVersion: string = '';

  public urlON: string = '';
  public urlOFF: string = '';
  public url: string = '';

  public urlStatus: string = '';
  public statusStateParam: string = '';
  public statusOnCheck: string = '';
  public statusOffCheck: string = '';

  public useRGB: boolean = false;
  public useBrightness255: boolean = false;
  public useColorTKelvin: boolean = false;
  public rgbParamName: string = '';
  public urlLightBulbControl: string = '';
  public brightnessParamName: string = '';
  public saturationParamName: string = '';
  public hueParamName: string = '';
  public colorTemperatureParamName: string = '';

  public mqttReconnectInterval: number = 60; // Default to 60 seconds
  public mqttBroker: string = '';
  public mqttPort: string = '';
  public mqttUsername: string = '';
  public mqttPassword: string = '';
  public mqttSwitch: string = '';
  public mqttRGB: string = '';
  public mqttBrightness: string = '';
  public mqttHue: string = '';
  public mqttSaturation: string = '';
  public mqttColorTemperature: string = '';

  public discordWebhook: string = '';
  public discordUsername: string = '';
  public discordAvatar: string = '';
  public discordMessage: string = '';

  public lightBulbStates = {
    On: false,
    Brightness: 100,
    Hue: 360,
    Saturation: 100,
    ColorTemperature: 500,
    RGB: 'FFFFFF',
  };

  private lightBulbRanges = new Map<string, { min: number; max: number }>([
    ['brightness', { min: 0, max: 100 }],
    ['hue', { min: 0, max: 360 }],
    ['saturation', { min: 0, max: 100 }],
    ['colorTemperature', { min: 153, max: 500 }], // HomeKit range in mired
  ]);

  constructor(
    public readonly platform: HttpSensorsAndSwitchesHomebridgePlatform,
    public readonly accessory: PlatformAccessory,
  ) {

    this.deviceType = this.accessory.context.device.deviceType;
    this.deviceName = this.accessory.context.device.deviceName || 'NoName';
    this.deviceManufacturer = this.accessory.context.device.deviceManufacturer || 'Stergo';
    this.deviceModel = this.accessory.context.device.deviceModel || 'LightBulb';
    this.deviceSerialNumber = this.accessory.context.device.deviceSerialNumber || accessory.UUID;
    this.deviceFirmwareVersion = this.accessory.context.device.deviceFirmwareVersion || '0.0';

    // From Config
    this.enableLogging = this.accessory.context.device.enableLogging;

    this.urlStatus = this.accessory.context.device.urlStatus;
    this.statusStateParam = this.accessory.context.device.stateName;
    this.statusOnCheck = this.accessory.context.device.onStatusValue;
    this.statusOffCheck = this.accessory.context.device.offStatusValue;
    this.urlON = this.accessory.context.device.urlON;
    this.urlOFF = this.accessory.context.device.urlOFF;

    this.useRGB = this.accessory.context.device.useRGB;
    this.useBrightness255 = this.accessory.context.device.useBrightness255;
    this.useColorTKelvin = this.accessory.context.device.useColorTKelvin;
    this.rgbParamName = this.accessory.context.device.rgbParamName;
    this.urlLightBulbControl = this.accessory.context.device.urlLightBulbControl;
    this.brightnessParamName = this.accessory.context.device.brightnessParamName;
    this.saturationParamName = this.accessory.context.device.saturationParamName;
    this.hueParamName = this.accessory.context.device.hueParamName;
    this.colorTemperatureParamName = this.accessory.context.device.colorTemperatureParamName;

    this.mqttReconnectInterval = this.accessory.context.device.mqttReconnectInterval || 60; // 60 sec default
    this.mqttBroker = this.accessory.context.device.mqttBroker;
    this.mqttPort = this.accessory.context.device.mqttPort;
    this.mqttUsername = this.accessory.context.device.mqttUsername;
    this.mqttPassword = this.accessory.context.device.mqttPassword;
    this.mqttSwitch = this.accessory.context.device.mqttSwitch;
    this.mqttRGB = this.accessory.context.device.mqttRGB;
    this.mqttBrightness = this.accessory.context.device.mqttBrightness;
    this.mqttHue = this.accessory.context.device.mqttHue;
    this.mqttSaturation = this.accessory.context.device.mqttSaturation;
    this.mqttColorTemperature = this.accessory.context.device.mqttColorTemperature;


    if (!this.deviceType) {
      this.platform.log.warn(this.deviceName, ': Ignoring accessory; No deviceType defined.');
      return;
    }

    if (this.deviceType === 'LightBulb' && (this.urlON || this.mqttBroker)) {

      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);


      if (this.urlON || this.mqttBroker || this.urlLightBulbControl) {
        // get the Lightbulb service if it exists, otherwise create a new Lightbulb service
        this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);
        
        // set the service name, this is what is displayed as the default name on the Home app
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);
        
        // Try to fetch initial Status of the device and check the status every 5 seconds
        if (this.urlStatus) {
          this.getData();
          setInterval(this.getData.bind(this), 5000);
        }
        
        if (this.urlON) {
          // register handlers for the On/Off Characteristic
          this.service.getCharacteristic(this.platform.Characteristic.On)
            .on('set', this.setOn.bind(this))
            .on('get', (callback) => {
              callback(null, this.lightBulbStates.On);
            });
        }
        
        // Handle LightBulb characteristics if urlLightBulbControl is set
        if (this.urlLightBulbControl) {

          // register handlers for the Brightness Characteristic
          if (this.useRGB || this.brightnessParamName) {
            this.service.getCharacteristic(this.platform.Characteristic.Brightness)
              .on('set', (value, callback) => {
                this.setBrightness(value, callback);
                if (this.useRGB) {
                  this.updateAndSendRGB();
                }
              })
              .on('get', (callback) => {
                callback(null, this.lightBulbStates.Brightness);
              });
          }
        
          // register handlers for the Hue Characteristic
          if (this.useRGB || this.hueParamName) {
            this.service.getCharacteristic(this.platform.Characteristic.Hue)
              .on('set', (value, callback) => {
                this.setHue(value, callback);
                if (this.useRGB) {
                  this.updateAndSendRGB();
                }
              })
              .on('get', (callback) => {
                callback(null, this.lightBulbStates.Hue);
              });
          }

          // register handlers for the Saturation Characteristic
          if (this.useRGB || this.saturationParamName) {
            this.service.getCharacteristic(this.platform.Characteristic.Saturation)
              .on('set', (value, callback) => {
                this.setSaturation(value, callback);
                if (this.useRGB) {
                  this.updateAndSendRGB();
                }
              })
              .on('get', (callback) => {
                callback(null, this.lightBulbStates.Saturation);
              });
          }

          // register handlers for the Color Temperature Characteristic
          if(this.colorTemperatureParamName) {
            this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
              .on('set', this.setColorTemperature.bind(this))
              .on('get', (callback) => {
                callback(null, this.lightBulbStates.ColorTemperature);
              });
          }
        }

        // We can now use MQTT
        if (this.mqttBroker) {
          this.initMQTT();
          if (this.mqttSwitch) {
            this.service.getCharacteristic(this.platform.Characteristic.On)
              .on('set', this.publishMQTTmessage.bind(this, 'On'));
          }
          if (this.useRGB || this.mqttBrightness) {
            this.service.getCharacteristic(this.platform.Characteristic.Brightness)
              .on('set', this.publishMQTTmessage.bind(this, 'Brightness'));
          }

          if (this.useRGB || this.mqttHue) {
            this.service.getCharacteristic(this.platform.Characteristic.Hue)
              .on('set', this.publishMQTTmessage.bind(this, 'Hue'));
          }
          
          if (this.useRGB || this.mqttSaturation) {
            this.service.getCharacteristic(this.platform.Characteristic.Saturation)
              .on('set', this.publishMQTTmessage.bind(this, 'Saturation'));
          }
          
          if (this.mqttColorTemperature) {
            this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
              .on('set', this.publishMQTTmessage.bind(this, 'ColorTemperature'));
          }
        }
      }          
    }
  }

  // Silly function :)
  private getStatus(isOn: boolean): string {
    return isOn ? 'ON' : 'OFF';
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  private async setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    // 
    this.lightBulbStates.On = value as boolean;

    if (!this.urlON || !this.urlOFF) {
      this.platform.log.warn(this.deviceName, ': Ignoring request; No Switch trigger url defined.');
      callback(new Error('No Switch trigger url defined.'));
      return;
    }

    if (this.lightBulbStates.On) {
      this.url = this.urlON;
      this.platform.log.debug(this.deviceName, ': Setting power state to ON');
      this.service.updateCharacteristic(this.platform.Characteristic.On, true);
    } else {
      this.url = this.urlOFF;
      this.platform.log.debug(this.deviceName, ': Setting power state to OFF');
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
    }

    axios.get(this.url)
      // We are not going to wait, we will presume everything is OK and if it's not Error handler will handle it
      //  .then((response) => {
      // handle success
      //    callback(response.data);
      //    this.platform.log.debug('Success: ', error);
      //  })
      .catch((error) => {
        // handle error
        // Let's reverse On value since we couldn't reach URL
        this.lightBulbStates.On = !value;
        this.service.updateCharacteristic(this.platform.Characteristic.On, this.lightBulbStates.On);
        this.platform.log.warn(this.deviceName, ': Setting power state to :', this.lightBulbStates.On);

        this.platform.log.warn(this.deviceName, ': Error: ', error.message);
        //callback(error);
      });

    // If is set dicordWebhook address
    if (this.discordWebhook) {
      this.initDiscordWebhooks();
    }

    callback(null);
    if ( this.enableLogging) {
      this.platform.log.info('Success: Switch ', this.deviceName, ' is: ', this.getStatus(this.lightBulbStates.On));
    }
    
  }

  private updateSwitchState(isOn: boolean, deviceName: string) {
    if (this.lightBulbStates.On !== isOn) {
      this.lightBulbStates.On = isOn;
      
      if ( this.enableLogging) {
        this.platform.log.info(deviceName, `: Light is ${isOn ? 'ON' : 'OFF'}`);
      }
      
      this.service.updateCharacteristic(this.platform.Characteristic.On, isOn);
    }
  }

  private async getData() {
    // Check if we have Status URL setup
    if (!this.urlStatus) {
      this.platform.log.warn(this.deviceName, ': Ignoring request; No status url defined.');
      return;
    }

    try {
      const response = await axios({
        url: this.urlStatus,
        method: 'get',
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = response.data;

      // Check if provided For On/Off KEY EXIST in JSON
      if (this.statusStateParam && this.statusStateParam in data) {
        const value = data[this.statusStateParam];
        const valueType = typeof value;

        // Convert statusOnCheck and statusOffCheck to the appropriate type
        let statusOnCheck: boolean | number | string;
        let statusOffCheck: boolean | number | string;

        if (valueType === 'boolean') {
          statusOnCheck = true;
          statusOffCheck = false;
        } else if (valueType === 'number') {
          statusOnCheck = parseFloat(this.statusOnCheck);
          statusOffCheck = parseFloat(this.statusOffCheck);
        } else {
          statusOnCheck = this.statusOnCheck;
          statusOffCheck = this.statusOffCheck;
        }

        // Check and update switch state
        if (value === statusOnCheck) {
          this.updateSwitchState(true, this.deviceName);
        } else if (value === statusOffCheck) {
          this.updateSwitchState(false, this.deviceName);
        } else {
          this.platform.log.warn(this.deviceName, `: The value of ${this.statusStateParam} does not match statusOnCheck or statusOffCheck.`);
        }
      } else if (this.statusStateParam && !(this.statusStateParam in data)) {
        this.platform.log.warn(this.deviceName, ': Error: Cannot find KEY:', this.statusStateParam, 'in JSON');
      }  
      
      if (this.useRGB && this.rgbParamName && this.rgbParamName in data) {
        // Update RGB and remove # if present
        let value = data[this.rgbParamName];
        if (value.startsWith('#')) {
          value = value.slice(1);
        }
        this.lightBulbStates.RGB = value as string;
        this.convertToHSV();
      
        // Update all needed characteristics
        if (!this.brightnessParamName) {
          this.service.updateCharacteristic(this.platform.Characteristic.Brightness, this.lightBulbStates.Brightness);
        }
        this.service.updateCharacteristic(this.platform.Characteristic.Hue, this.lightBulbStates.Hue);
        this.service.updateCharacteristic(this.platform.Characteristic.Saturation, this.lightBulbStates.Saturation);
      } else if (this.rgbParamName && !(this.rgbParamName in data)) {
        this.platform.log.warn(this.deviceName, ': Error: Cannot find KEY:', this.rgbParamName, 'in JSON');
      }  
      
      if (this.brightnessParamName && this.brightnessParamName in data) {
        // Update Brightness
        let value = data[this.brightnessParamName];
        if (this.useBrightness255) {
          const convertedValue = this.convertBrightness(Number(value), 1); // convert back to 0-100
          if (convertedValue !== undefined) {
            value = convertedValue;
          } else {
            this.platform.log.warn(this.deviceName, ': Error: Invalid brightness value');
          }
        }
        
        const fixedBrightnessValue = this.checkAndFixValue('brightness', Number(value));
      
        if (this.lightBulbStates.Brightness !== fixedBrightnessValue) {
          this.lightBulbStates.Brightness = fixedBrightnessValue;
          this.service.updateCharacteristic(this.platform.Characteristic.Brightness, fixedBrightnessValue);
          if ( this.enableLogging) {
            this.platform.log.info(this.deviceName, `: Brightness SET to: ${fixedBrightnessValue}`);
          }
        }
      } else if (this.brightnessParamName && !(this.brightnessParamName in data)) {
        this.platform.log.warn(this.deviceName, ': Error: Cannot find KEY:', this.brightnessParamName, 'in JSON');
      }
      
      if(!this.useRGB && this.saturationParamName && this.saturationParamName in data) {
        // Update Saturation
        const value = data[this.saturationParamName];
        const fixedSaturationValue = this.checkAndFixValue('saturation', Number(value));
        
        if (this.lightBulbStates.Saturation !== fixedSaturationValue) {
          this.lightBulbStates.Saturation = fixedSaturationValue;
          this.service.updateCharacteristic(this.platform.Characteristic.Saturation, fixedSaturationValue);
          if ( this.enableLogging) {
            this.platform.log.info(this.deviceName, `: Saturation SET to: ${fixedSaturationValue}`);
          }
        }
      } else if (this.saturationParamName && !(this.saturationParamName in data)) {
        this.platform.log.warn(this.deviceName, ': Error: Cannot find KEY:', this.saturationParamName, 'in JSON');
      }
      
      if(!this.useRGB && this.hueParamName && this.hueParamName in data) {
        // Update Hue
        const value = data[this.hueParamName];
        const fixedHueValue = this.checkAndFixValue('hue', Number(value));
        
        if (this.lightBulbStates.Hue !== fixedHueValue) {
          this.lightBulbStates.Hue = fixedHueValue;
          this.service.updateCharacteristic(this.platform.Characteristic.Hue, fixedHueValue);
          if ( this.enableLogging) {
            this.platform.log.info(this.deviceName, `: Hue SET to: ${fixedHueValue}`);
          }
        }
      } else if (this.hueParamName && !(this.hueParamName in data)) {
        this.platform.log.warn(this.deviceName, ': Error: Cannot find KEY:', this.hueParamName, 'in JSON');
      }
      
      if (this.colorTemperatureParamName && this.colorTemperatureParamName in data) {
        // Update Color Temperature
        let value = data[this.colorTemperatureParamName];
        
        if (this.useColorTKelvin) {
          value = this.convertColorTemperature(Number(value), 0); // Convert from Kelvin to mired
        }
        
        const fixedColorTemperatureValue = this.checkAndFixValue('colorTemperature', Number(value));
      
        if (this.lightBulbStates.ColorTemperature !== fixedColorTemperatureValue) {
          this.lightBulbStates.ColorTemperature = fixedColorTemperatureValue;
          this.service.updateCharacteristic(this.platform.Characteristic.ColorTemperature, fixedColorTemperatureValue);
          if ( this.enableLogging) {
            this.platform.log.info(this.deviceName, `: Light Color Temperature SET to: ${fixedColorTemperatureValue}`);
          }
        }
      } else if (this.colorTemperatureParamName && !(this.colorTemperatureParamName in data)) {
        this.platform.log.warn(this.deviceName, ': Error: Cannot find KEY:', this.colorTemperatureParamName, 'in JSON');
      }
    } catch (e) {
      const error = e as AxiosError;
      if (axios.isAxiosError(error)) {
        this.platform.log.warn(this.deviceName, ': Error: URL Status check:', error.message);
      }
    }
  }
  
  private async setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    try {
      let brightnessValue = value;
  
      // Check if useBrightness255 is true and convert the brightness value
      if (this.useBrightness255) {
        const convertedValue = this.convertBrightness(value as number, 0);
        if (convertedValue !== undefined) {
          brightnessValue = convertedValue;
        } else {
          this.platform.log.warn(this.deviceName, ': Error: Invalid brightness value');
        }
      }
  
      // Construct the URL without the brightness parameter
      const url = `${this.urlLightBulbControl}`;
  
      const response = await axios({
        method: 'POST',
        url: url,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          [this.brightnessParamName]: brightnessValue,
        },
      });
  
      if (response.status === 200) {
        this.service.updateCharacteristic(this.platform.Characteristic.Brightness, value);
        this.lightBulbStates.Brightness = value as number;
  
        if ( this.enableLogging) {
          this.platform.log.info('Success: Brightness', this.deviceName, 'is set to:', value);
        }
        callback(null);
      } else {
        callback(new Error('Failed to set brightness'));
      }
    } catch (e) {
      const error = e as AxiosError;
      if (axios.isAxiosError(error)) {
        this.platform.log.warn(this.deviceName, ': Error: URL Status check:', error.message);
      }
      callback(e as Error);
    }
  }
  
  private async setHue(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    if (!this.useRGB && this.hueParamName) {
      try {
      // Construct the URL with the hue parameter
        const url = `${this.urlLightBulbControl}`;
  
        const response = await axios({
          method: 'POST',
          url: url,
          headers: {
            'Content-Type': 'application/json',
          },
          data: {
            [this.hueParamName]: value,
          },
        });
        if (response.status === 200) {
          this.service.updateCharacteristic(this.platform.Characteristic.Hue, value);
          this.lightBulbStates.Hue = value as number;

          if ( this.enableLogging) {
            this.platform.log.info('Success: Hue', this.deviceName, 'is set to:', value);
          }
          callback(null);
        } else {
          callback(new Error('Failed to set hue'));
        }
      } catch (e) {
        const error = e as AxiosError;
        if (axios.isAxiosError(error)) {
          this.platform.log.warn(this.deviceName, ': Error: URL Status check:', error.message);
        }
        callback(e as Error);
      }
    }

    if( ( this.useRGB && !this.hueParamName ) || ( this.useRGB && this.hueParamName ) ) {
      this.service.updateCharacteristic(this.platform.Characteristic.Hue, value);
      this.lightBulbStates.Hue = value as number;

      if ( this.enableLogging) {
        this.platform.log.info('Success but not sent: Hue', this.deviceName, 'is SET to:', value);
      }
    }
  }
  
  private async setSaturation(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    if (!this.useRGB && this.saturationParamName) {
      try {
  
        // Construct the URL with the saturation parameter
        const url = `${this.urlLightBulbControl}`;
  
        const response = await axios({
          method: 'POST',
          url: url,
          headers: {
            'Content-Type': 'application/json',
          },
          data: {
            [this.saturationParamName]: value,
          },
        });
        if (response.status === 200) {
          this.service.updateCharacteristic(this.platform.Characteristic.Saturation, value);
          this.lightBulbStates.Saturation = value as number;
  
          if ( this.enableLogging) {
            this.platform.log.info('Success: Saturation', this.deviceName, 'is set to:', value);
          }
          callback(null);
        } else {
          callback(new Error('Failed to set saturation'));
        }
      } catch (e) {
        const error = e as AxiosError;
        if (axios.isAxiosError(error)) {
          this.platform.log.warn(this.deviceName, ': Error: URL Status check:', error.message);
        }
        callback(e as Error);
      }
    }

    if( ( this.useRGB && !this.saturationParamName ) || ( this.useRGB && this.saturationParamName ) ) {
      this.service.updateCharacteristic(this.platform.Characteristic.Saturation, value);
      this.lightBulbStates.Saturation = value as number;
  
      if ( this.enableLogging) {
        this.platform.log.info('Success but not sent: Saturation', this.deviceName, 'is SET to:', value);
      }
      callback(null);
    }
  }
  
  private async setColorTemperature(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    try {
      // Convert from mired to Kelvin if useColorTKelvin is set
      let colorTemperature = value as number;
      if (this.useColorTKelvin) {
        colorTemperature = this.convertColorTemperature(colorTemperature, 1); // Convert from mired to Kelvin
      }
  
      // Construct the URL with the color temperature parameter
      const url = `${this.urlLightBulbControl}`;
  
      const response = await axios({
        method: 'POST',
        url: url,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          [this.colorTemperatureParamName]: colorTemperature,
        },
      });
  
      if (response.status === 200) {
        this.service.updateCharacteristic(this.platform.Characteristic.ColorTemperature, value);
        this.lightBulbStates.ColorTemperature = value as number;
  
        if ( this.enableLogging) {
          this.platform.log.info('Success: Color Temperature', this.deviceName, 'is SET to:', value);
        }
        callback(null);
      } else {
        callback(new Error('Failed to set Color Temperature'));
      }
    } catch (e) {
      const error = e as AxiosError;
      if (axios.isAxiosError(error)) {
        this.platform.log.warn(this.deviceName, ': Error: URL Status check:', error.message);
      }
      callback(e as Error);
    }
  }  

  // Connect to MQTT and update Lights
  private initMQTT() {
    const mqttSubscribedTopics: string | string[] | mqtt.ISubscriptionMap = [];

    const mqttOptions: IClientOptions = {
      keepalive: 10,
      protocol: 'mqtt',
      host: this.mqttBroker,
      port: Number(this.mqttPort),
      clientId: this.deviceName,
      clean: true,
      username: this.mqttUsername,
      password: this.mqttPassword,
      rejectUnauthorized: false,
      reconnectPeriod: Number(this.mqttReconnectInterval) * 1000,
    };

    // Subscribe to all MQTT Topics
    if (this.mqttSwitch) {
      mqttSubscribedTopics.push(this.mqttSwitch);
    }

    if (this.mqttBrightness) {
      mqttSubscribedTopics.push(this.mqttBrightness);
    }

    if (this.mqttColorTemperature) {
      mqttSubscribedTopics.push(this.mqttColorTemperature);
    }
    
    if ( !this.useRGB ) {
      if (this.mqttBrightness) {
        mqttSubscribedTopics.push(this.mqttBrightness);
      }
    
      if (this.mqttHue) {
        mqttSubscribedTopics.push(this.mqttHue);
      }
    
      if (this.mqttSaturation) {
        mqttSubscribedTopics.push(this.mqttSaturation);
      }
    } else {
      if (this.mqttRGB) {
        mqttSubscribedTopics.push(this.mqttRGB);
      }
    }
    
    this.mqttClient = mqtt.connect(mqttOptions);
    this.mqttClient.on('connect', () => {

      if ( this.enableLogging) {
        this.platform.log.info(this.deviceName, ': MQTT Connected');
      }

      this.mqttClient.subscribe(mqttSubscribedTopics, (err) => {
        if (!err) {
          if ( this.enableLogging) {
            this.platform.log.info(this.deviceName, ': Subscribed to: ', mqttSubscribedTopics.toString());
          }
        } else {
          // Need to insert error handler
          this.platform.log.warn(this.deviceName, err.toString());
        }
      });
    });

    this.mqttClient.on('message', (topic, message) => {
      //this.platform.log(this.deviceName,': Received message: ', Number(message));  
      if (topic === this.mqttSwitch) {
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName, ': Status set to: ', this.getStatus(Boolean(Number(message))));
        }

        if (message.toString() === '1'  || message.toString() === 'true') {
          this.lightBulbStates.On = true;
        }
        if (message.toString() === '0'  || message.toString() === 'false') {
          this.lightBulbStates.On = false;
        }

        this.service.updateCharacteristic(this.platform.Characteristic.On, this.lightBulbStates.On);
        // If is set dicordWebhook address
        if (this.discordWebhook) {
          this.initDiscordWebhooks();
        }
      }

      if (topic === this.mqttBrightness) {
        let brightness = Number(message);
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName, ': Brightness before convert is : ', brightness);
        }
        if (this.useBrightness255) {
          const convertedValue = this.convertBrightness(brightness, 1);
          if (convertedValue !== undefined) {
            brightness = convertedValue;
          } else {
            this.platform.log.warn(this.deviceName, ': Error: Invalid brightness value');
          }
        }
        const fixedBrightness = this.checkAndFixValue('brightness', brightness);
        this.lightBulbStates.Brightness = fixedBrightness;
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName, ': Brightness after convert is : ', fixedBrightness);
        }
        if (this.useRGB) {
          this.convertToHSV();
        }
      
        this.service.updateCharacteristic(this.platform.Characteristic.Brightness, this.lightBulbStates.Brightness);
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName, ': Brightness SET to: ', this.lightBulbStates.Brightness);
        }
      }      

      if (topic === this.mqttHue) {
        const hue = Number(message);
        const fixedHue = this.checkAndFixValue('hue', hue);
        this.lightBulbStates.Hue = fixedHue;

        if ( this.useRGB ) {
          this.convertToHSV();
        } 

        this.service.updateCharacteristic(this.platform.Characteristic.Hue, this.lightBulbStates.Hue);
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName, ': Hue SET to: ', this.lightBulbStates.Hue);
        }
      }

      if (topic === this.mqttSaturation) {
        const saturation = Number(message);
        const fixedSaturation = this.checkAndFixValue('saturation', saturation);
        this.lightBulbStates.Saturation = fixedSaturation;

        if ( this.useRGB ) {
          this.convertToHSV();
        } 

        this.service.updateCharacteristic(this.platform.Characteristic.Saturation, this.lightBulbStates.Saturation);
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName, ': Saturation SET to: ', this.lightBulbStates.Saturation);
        }
      }

      if (topic === this.mqttColorTemperature) {
        let colorTemperature = Number(message);
        
        if (this.useColorTKelvin) {
          colorTemperature = this.convertColorTemperature(colorTemperature, 0); // Convert from Kelvin to mired
        }
        
        const fixedColorTemperature = this.checkAndFixValue('colorTemperature', colorTemperature);
        this.lightBulbStates.ColorTemperature = fixedColorTemperature;
      
        this.service.updateCharacteristic(this.platform.Characteristic.ColorTemperature, this.lightBulbStates.ColorTemperature);
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName, ': Color Temperature SET to: ', this.lightBulbStates.ColorTemperature);
        }
      }
      

      if (topic === this.mqttRGB) {
        let rgb = String(message);
        if (rgb.startsWith('#')) {
          rgb = rgb.slice(1);
        }

        this.lightBulbStates.RGB = rgb; // Here should be a check if value is in proper range
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName, ': RGB SET to: ', rgb);
        }
        if ( this.useRGB ) {
          this.convertToHSV();
        } 
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName, ': RGB IS: ', this.lightBulbStates.RGB);
        }
        this.service.updateCharacteristic(this.platform.Characteristic.Brightness, this.lightBulbStates.Brightness);
        this.service.updateCharacteristic(this.platform.Characteristic.Hue, this.lightBulbStates.Hue);
        this.service.updateCharacteristic(this.platform.Characteristic.Saturation, this.lightBulbStates.Saturation);

        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName, ': Brightness SET to: ', this.lightBulbStates.Brightness);
          this.platform.log.info(this.deviceName, ': Hue SET to: ', this.lightBulbStates.Hue);
          this.platform.log.info(this.deviceName, ': Saturation SET to: ', this.lightBulbStates.Saturation);
        }
      }
    });

    this.mqttClient.on('offline', () => {
      this.platform.log.debug(this.deviceName, ': Client is offline');
    });

    this.mqttClient.on('reconnect', () => {
      this.platform.log.debug(this.deviceName, ': Reconnecting...');
    });

    this.mqttClient.on('close', () => {
      this.platform.log.debug(this.deviceName, ': Connection closed');
    });

    // Handle errors
    this.mqttClient.on('error', (err) => {
      this.platform.log.warn(this.deviceName, ': Connection error:', err);
      this.platform.log.warn(this.deviceName, ': Reconnecting in: ', this.mqttReconnectInterval, ' seconds.');
      //this.mqttClient.end();
    });

  }

  // Function to publish a message
  private publishMQTTmessage(what: string, value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    if (this.enableLogging) {
      this.platform.log.info(this.deviceName, `: Setting ${what} to:`, value);
    }

    let topic: string | undefined;
    let message: string | undefined;
  
    // Always publish the On state
    if (what === 'On') {
      message = String(Number(!this.lightBulbStates.On));
      topic = this.mqttSwitch;
    }
  
    // Always publish the ColorTemperature if mqttColorTemperature is set
    if (what === 'ColorTemperature' && this.mqttColorTemperature) {
      const colorTemperature = this.checkAndFixValue('colorTemperature', Number(value));
      this.lightBulbStates.ColorTemperature = colorTemperature;
      message = String(colorTemperature);
      topic = this.mqttColorTemperature;
    }
  
    // Always publish the Brightness if mqttBrightness is set
    if (what === 'Brightness') {
      let brightness = this.checkAndFixValue('brightness', Number(value));
      this.lightBulbStates.Brightness = brightness;
  
      if (this.useBrightness255) {
        const convertedValue = this.convertBrightness(brightness, 0);
        if (convertedValue !== undefined) {
          brightness = convertedValue;
        } else {
          this.platform.log.warn(this.deviceName, ': Error: Invalid brightness value');
        }
      }

      // This needs better Logic also i have redundant code in Brightnes, Hue and Saturation regarding RGB
      if ( this.mqttBrightness) {
        message = String(brightness);
        topic = this.mqttBrightness;
      } else {
        const { Hue, Saturation, Brightness } = this.lightBulbStates;
        const { red, green, blue } = this.convertToRGB(Hue, Saturation, Brightness);
        const rgbValue = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
    
        this.lightBulbStates.RGB = rgbValue;
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName, 'Updated lightBulbStates.RGB:', this.lightBulbStates.RGB);
        }
        message = String(rgbValue);
        topic = this.mqttRGB;
      }
      if ( this.enableLogging) {
        this.platform.log.info(this.deviceName, 'Updated lightBulbStates.Brightness:', brightness);
      }
    }
  
    if ( what === 'Hue' ) {
      const hue = this.checkAndFixValue('hue', Number(value));
      this.lightBulbStates.Hue = hue;

      if ( this.useRGB ) {
        const { Hue, Saturation, Brightness } = this.lightBulbStates;
        const { red, green, blue } = this.convertToRGB(Hue, Saturation, Brightness);
        const rgbValue = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
    
        this.lightBulbStates.RGB = rgbValue;
        this.platform.log.info(this.deviceName, 'Updated lightBulbStates.RGB:', this.lightBulbStates.RGB);
    
        message = String(rgbValue);
        topic = this.mqttRGB;
      } else {
        message = String(hue);
        topic = this.mqttHue;
      }
      
      if ( this.enableLogging) {
        this.platform.log.info(this.deviceName, 'Updated lightBulbStates.Hue:', hue);
      }
    }

    if ( what === 'Saturation' ) {
      const saturation = this.checkAndFixValue('saturation', Number(value));
      this.lightBulbStates.Saturation = saturation;

      if ( this.useRGB ) {
        const { Hue, Saturation, Brightness } = this.lightBulbStates;
        const { red, green, blue } = this.convertToRGB(Hue, Saturation, Brightness);
        
        const rgbValue = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;  
        this.lightBulbStates.RGB = rgbValue;
        this.platform.log.info(this.deviceName, 'Updated lightBulbStates.RGB:', this.lightBulbStates.RGB);
    
        message = String(rgbValue);
        topic = this.mqttRGB;
      } else {
        message = String(saturation);
        topic = this.mqttSaturation;
      }

      if ( this.enableLogging) {
        this.platform.log.info(this.deviceName, 'Updated lightBulbStates.Saturation:', saturation);
      }
    }
  
    if (topic && message) {
      this.mqttClient.publish(topic, message, { qos: 1, retain: true }, (err) => {
        if (err) {
          this.platform.log.debug(this.deviceName, ': Failed to publish message: ', err);
        } else {
          this.platform.log.debug(this.deviceName, ': Message published successfully');
        }
      });
    }
  
    callback(null);
  }  
  
  private initDiscordWebhooks() {
    // Prepare message just to send On Off status
    const message = this.deviceName + ': ' + this.discordMessage + this.getStatus(this.lightBulbStates.On);
    const discord = new discordWebHooks(this.discordWebhook, this.discordUsername, this.discordAvatar, message);

    discord.discordSimpleSend().then((result) => {
      if ( this.enableLogging) {
        this.platform.log.info(this.deviceName, ': ', result);
      }
    });

  }

  // Helper function to convert RGB to HSV and update lightBulbStates
  private convertToHSV(): void {
    // Parse the RGB values
    const r = parseInt(this.lightBulbStates.RGB.substring(0, 2), 16);
    const g = parseInt(this.lightBulbStates.RGB.substring(2, 4), 16);
    const b = parseInt(this.lightBulbStates.RGB.substring(4, 6), 16);

    // Convert RGB to HSV
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;

    let hue = 0;
    let saturation = 0;
    const value = max;

    if (delta !== 0) {
      saturation = delta / max;

      switch (max) {
      case rNorm:
        hue = (gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        hue = (bNorm - rNorm) / delta + 2;
        break;
      case bNorm:
        hue = (rNorm - gNorm) / delta + 4;
        break;
      }

      hue /= 6;
    }

    // Update lightBulbStates
    this.lightBulbStates.Hue = this.checkAndFixValue('hue', hue * 360);
    this.lightBulbStates.Saturation = this.checkAndFixValue('saturation', saturation * 100);
    if (!this.brightnessParamName) {
      this.lightBulbStates.Brightness = this.checkAndFixValue('brightness', value * 100);
    }
  }

  // Helper function to convert HSV to RGB
  private convertToRGB(h: number, s: number, v: number): { red: number, green: number, blue: number } {
    s /= 100;
    v /= 100;

    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (60 <= h && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (120 <= h && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (180 <= h && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (240 <= h && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (300 <= h && h < 360) {
      r = c;
      g = 0;
      b = x;
    }

    return {
      red: Math.round((r + m) * 255),
      green: Math.round((g + m) * 255),
      blue: Math.round((b + m) * 255),
    };
  }

  // Function to update RGB value and send it via HTTP or MQTT
  private async updateAndSendRGB() {
    const { Hue, Saturation, Brightness } = this.lightBulbStates;
    //this.platform.log.debug('Current lightBulbStates - Hue:', Hue, ', Saturation:', Saturation, ', Brightness:', Brightness);
    const { red, green, blue } = this.convertToRGB(Hue, Saturation, Brightness);
    //this.platform.log.debug('Converted RGB values - Red:', red, ', Green:', green, ', Blue:', blue);
    const rgbValue = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
    //this.platform.log.debug('Formatted RGB value:', rgbValue);
  
    this.lightBulbStates.RGB = rgbValue;
  
    // Send the RGB value via HTTP
    const url = `${this.urlLightBulbControl}`;
    const postData = new URLSearchParams();
    postData.append(this.rgbParamName, rgbValue);
    //this.platform.log.debug('Sending RGB value to URL:', url);
    //this.platform.log.debug('POST data:', postData.toString());
  
    try {
      const response = await axios({
        method: 'POST',
        url: url,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: postData,
      });
  
      //this.platform.log.debug('HTTP POST response status:', response.status);
      //this.platform.log.debug('HTTP POST response data:', JSON.stringify(response.data));
      if (response.status === 200) {
        if ( this.enableLogging) {
          this.platform.log.info('Success: RGB value sent:', rgbValue);
        }
      } else {
        this.platform.log.error('Failed to send RGB value');
      }
    } catch (e) {
      const error = e as AxiosError;
      if (axios.isAxiosError(error)) {
        this.platform.log.error('Error sending RGB value:', error.message);
      }
    }
  
    //this.platform.log.debug('Finished updateAndSendRGB function');
  }  

  // Helper function to check and fix the value when converting from RGB to HSV
  // also to ensure the value is within the range
  private checkAndFixValue(type: string, value: number): number {
    const range = this.lightBulbRanges.get(type);
    if (!range) {
      throw new Error(`Invalid type: ${type}`);
    }

    let fixedValue = Math.round(value); // Ensure the value is an integer
    fixedValue = Math.max(range.min, Math.min(range.max, fixedValue)); // Ensure the value is within the range

    return fixedValue;
  }

  // Helper function to convert brightness value from 0-100 to 0-255 and vice versa
  // type 0: convert from 0-100 to 0-255
  // type 1: convert from 0-255 to 0-100
  private convertBrightness(value: number, type: number): number | undefined {
    //this.platform.log.debug(this.deviceName, `convertBrightness - Input: ${value}, Type: ${type}`);
    let result;
    if (type === 0) {
      // Convert from 0-100 to 0-255
      result = Math.round((value * 255) / 100);
    } else if (type === 1) {
      // Convert from 0-255 to 0-100
      result = Math.round((value / 255) * 100);
    } else {
      result = undefined;
    }
    //this.platform.log.debug(this.deviceName, `convertBrightness - Output: ${result}`);
    return result;
  }
  
  // Helper function to convert Color Temperature from Mired to Kelvin and vice versa
  private convertColorTemperature(value: number, type: number): number{
    if (type === 0) {
      // Convert from Kelvin to mired
      let mired = Math.round(1000000 / value);
      mired = this.checkAndFixValue('colorTemperature', mired);
      return mired;
    } else if (type === 1) {
      // Convert from mired to Kelvin without checking the range
      return Math.round(1000000 / value);
    }
    return 4000; // Random number - just to have something to return
  }
  
}