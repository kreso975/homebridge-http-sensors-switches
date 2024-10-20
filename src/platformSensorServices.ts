import { PlatformAccessory, Service  } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions }  from 'mqtt';


/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformSensors {
  public temperatureService!: Service;
  public humidityService!: Service;

  public mqttClient!: mqtt.MqttClient;

  public deviceId: string = '';
  public deviceType: string = '';
  public deviceName: string = '';
  public deviceManufacturer: string = '';
  public deviceModel: string = '';
  public deviceSerialNumber: string = '';
  public deviceFirmwareVersion: string = '';
  
  public sensorUrl: string = '';
  public temperatureName: string = '';
  public humidityName: string = '';
  public airPressureName: string = '';

  public mqttReconnectInterval: string = '';
  public mqttBroker: string = '';
  public mqttPort: string = '';
  public mqttTemperature: string = '';
  public mqttHumidity: string = '';
  public mqttUsername: string = '';
  public mqttPassword: string = '';
 
  public currentTemperature: number = 20;
  public currentHumidity: number = 50;
  public updateInterval = 300000;
  

  constructor(
    public readonly platform: HttpSensorsAndSwitchesHomebridgePlatform,
    public readonly accessory: PlatformAccessory,
  ) {

    this.deviceType = this.accessory.context.device.deviceType;
    this.deviceName = this.accessory.context.device.deviceName || 'NoName';
    this.deviceManufacturer = this.accessory.context.device.deviceManufacturer || 'Stergo';
    this.deviceModel = this.accessory.context.device.deviceModel || 'Sensor';
    this.deviceSerialNumber = this.accessory.context.device.deviceSerialNumber || accessory.UUID;
    this.deviceFirmwareVersion = this.accessory.context.device.deviceFirmwareVersion || '0.0';
    
    // From Config
    this.sensorUrl = this.accessory.context.device.sensorUrl;
    this.temperatureName = this.accessory.context.device.temperatureName;
    this.humidityName = this.accessory.context.device.humidityName;
    this.airPressureName = this.accessory.context.device.airPressureName;
    this.updateInterval = accessory.context.device.updateInterval || 300000; // Default update interval is 300 seconds

    this.mqttReconnectInterval = this.accessory.context.device.mqttReconnectInterval || 60; // 60 sec default
    this.mqttBroker = accessory.context.device.mqttBroker;
    this.mqttPort = accessory.context.device.mqttPort;
    this.mqttTemperature = accessory.context.device.mqttTemperature;
    this.mqttHumidity = accessory.context.device.mqttHumidity;
    this.mqttUsername = accessory.context.device.mqttUsername;
    this.mqttPassword = accessory.context.device.mqttPassword;

    if ( !this.deviceType ) {
      return;
    }

    if ( this.deviceType === 'Sensor' && ( this.sensorUrl || this.mqttBroker ) ) {

      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);

      // If we have Config setup for Temperature
      if ( this.temperatureName || this.mqttTemperature ) {
        // get the TemperatureSensor service if it exists, otherwise create a new TemperatureSensor service
        this.temperatureService = this.accessory.getService(this.platform.Service.TemperatureSensor)
          || this.accessory.addService(this.platform.Service.TemperatureSensor);

        // set the service name, this is what is displayed as the default name on the Home app
        // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
        this.temperatureService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);

        //this.service = this.service.addCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity);
        // register handlers for the CurrentTemperature Characteristic
        this.temperatureService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
          .on('get', this.getTemperature.bind(this));
      }

      // If we have Config setup for Humidity
      if ( this.humidityName || this.mqttHumidity ) {
        // get the HumiditySensor service if it exists, otherwise create a new HumiditySensor service
        this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
          || this.accessory.addService(this.platform.Service.HumiditySensor);

        this.humidityService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);

        // register handlers for the CurrentRelativeHumidity Characteristic
        this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
          .on('get', this.getHumidity.bind(this));
      }

      // If we have Config setup for Air Pressure
      // Not implementd yet
      if ( this.airPressureName ) {
        this.platform.log.info(this.deviceName,': ',this.airPressureName);
      }
      
      // We can now use MQTT
      if ( this.mqttBroker ) {
        this.getSensorDataMQTT();
      }
      
      // IF we are going with JSON over HTTP
      if ( this.sensorUrl ) {
        this.getSensorData();
        setInterval(this.getSensorData.bind(this), this.updateInterval);
      }
      
    } 
  }

  
  private async getSensorData() {
    try {
      const response = await axios.get(this.sensorUrl);
      const data = response.data;

      // If we have Config setup for Temperature
      if ( this.temperatureName && this.temperatureName in data ) {
        this.currentTemperature = Number(data[this.temperatureName]);
        this.temperatureService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.currentTemperature);
      } else {
        this.platform.log.warn(this.deviceName,': Error: Cannot find: ', this.temperatureName, ' in JSON' );
      }

      // If we have Config setup for Humidity
      if (this.humidityName && this.humidityName in data ) {
        this.currentHumidity = Number(data[this.humidityName]);
        this.humidityService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.currentHumidity);
      } else {
        this.platform.log.warn(this.deviceName,': Error: Cannot find: ', this.humidityName, ' in JSON' );
      }
      
      // If we have Config setup for Air Pressure
      if ( this.airPressureName ) {
        this.platform.log.info(this.deviceName,': ',this.airPressureName);
      }

      this.platform.log.info(this.deviceName,': ',JSON.stringify(data));
      //this.platform.log.debug(JSON.stringify(data));

    } catch (e) {
      const error = e as AxiosError;
      if (axios.isAxiosError(error)) {
        this.platform.log.warn(this.deviceName,': Error: ', error.message );
      }
    }
  }
  
  private async getTemperature(callback: (arg0: null, arg1: number) => void) {
    callback(null, this.currentTemperature);
  }

  private async getHumidity(callback: (arg0: null, arg1: number) => void) {
    callback(null, this.currentHumidity);
  }
  
  
  //
  // Connect to MQTT and update Temperature and Humidity
  private getSensorDataMQTT() {
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
      reconnectPeriod: Number(this.mqttReconnectInterval)*1000,
    };  

    if (this.mqttTemperature) {
      mqttSubscribedTopics.push(this.mqttTemperature);
    }
    if (this.mqttHumidity) {
      mqttSubscribedTopics.push(this.mqttHumidity);
    }

    this.mqttClient = mqtt.connect( mqttOptions);
    
    this.mqttClient.on('connect', () => {
    
      this.platform.log.info(this.deviceName,': MQTT Connected');  
      this.mqttClient.subscribe(mqttSubscribedTopics, (err) => {
        if (!err) {
          this.platform.log.info(this.deviceName,': Subscribed to: ', mqttSubscribedTopics.toString());
        } else {
          // Need to insert error handler
          this.platform.log.warn(this.deviceName, err.toString());
        }
      });
    });
  
    this.mqttClient.on('message', (topic, message) => {
      //this.platform.log(this.deviceName,': Received message: ${message.toString()}');
      
      if ( topic === this.mqttTemperature ) {
        this.platform.log.info(this.deviceName,': Temperature = ',message.toString());
        this.currentTemperature = Number(message.toString());
        this.temperatureService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.currentTemperature);
      }

      if ( topic === this.mqttHumidity ) {
        this.platform.log.info(this.deviceName,': Humidity = ',message.toString());
        this.currentHumidity = Number(message.toString());
        this.humidityService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.currentHumidity);
      }
    });

    this.mqttClient.on('offline', () => {
      this.platform.log.debug(this.deviceName,': Client is offline');
    });

    this.mqttClient.on('reconnect', () => {
      this.platform.log.debug(this.deviceName,': Reconnecting...');
    });
    
    this.mqttClient.on('close', () => {
      this.platform.log.debug(this.deviceName,': Connection closed');
    });
    
    // Handle errors
    this.mqttClient.on('error', (err) => {
      this.platform.log.warn(this.deviceName,': Connection error:', err);
      this.platform.log.warn(this.deviceName, ': Reconnecting in: ', this.mqttReconnectInterval, ' seconds.');
      //this.mqttClient.end();
    });
    
  }
}
