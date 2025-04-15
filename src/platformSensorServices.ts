import { PlatformAccessory, Service  } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions }  from 'mqtt';

import { SharedPolling, SharedData } from './lib/SharedPolling.js';       // Include shared polling library
import { getNestedValue } from './lib/utilities.js';


/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformSensors {
  public temperatureService!: Service;
  public humidityService!: Service;
  public mqttClient!: mqtt.MqttClient;
  private sharedPollingInstance?: SharedPolling;

  public enableLogging: boolean = true;
  // Ensure backward compatibility for shared polling
  public sharedPolling = false; // Default to false
  public sharedPollingId = ''; // Default to empty
  public sharedPollingInterval = 60000; // Default to 60 seconds

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
    const device = this.accessory.context.device;

    this.deviceType = device.deviceType;
    this.deviceName = device.deviceName || 'NoName';
    this.deviceManufacturer = device.deviceManufacturer || 'Stergo';
    this.deviceModel = device.deviceModel || 'Sensor';
    this.deviceSerialNumber = device.deviceSerialNumber || accessory.UUID;
    this.deviceFirmwareVersion = device.deviceFirmwareVersion || '0.0';
    
    // From Config
    this.enableLogging = device.enableLogging;

    this.sensorUrl = device.sensorUrl;
    this.temperatureName = device.temperatureName;
    this.humidityName = device.humidityName;
    this.airPressureName = device.airPressureName;
    this.updateInterval = device.updateInterval || 60000; // Default update interval is 300 seconds

    this.mqttReconnectInterval = device.mqttReconnectInterval || 60; // 60 sec default
    this.mqttBroker = device.mqttBroker;
    this.mqttPort = device.mqttPort;
    this.mqttTemperature = device.mqttTemperature;
    this.mqttHumidity = device.mqttHumidity;
    this.mqttUsername = device.mqttUsername;
    this.mqttPassword = device.mqttPassword;

    // Ensure backward compatibility for shared polling
    this.sharedPolling = device.sharedPolling ?? false; // Default shared polling to false
    this.sharedPollingId = device.sharedPollingId ?? ''; // Default shared polling group ID to an empty string
    this.sharedPollingInterval = device.sharedPollingInterval ?? 60000; // Set the polling interval to 60 sec or from config value

    if (this.sharedPolling && this.sharedPollingId) {
      const sharedPollingInstance = SharedPolling.registerPolling(
        this.sharedPollingId,
        this.sensorUrl,
        this.platform,
        this.sharedPollingInterval, // Set the polling interval to 60 sec or from config value
      );
    
      // Subscribe to data updates
      sharedPollingInstance.on('dataUpdated', (data: SharedData) => {
        this.updateSensorStatusFromSharedData(data);
      });
    } else if (this.sensorUrl) {
      this.getSensorData();
      setInterval(this.getSensorData.bind(this), this.updateInterval);
    }  

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
          .on('get', (callback) => {
            callback(null, this.currentTemperature);
          });
      }

      // If we have Config setup for Humidity
      if ( this.humidityName || this.mqttHumidity ) {
        // get the HumiditySensor service if it exists, otherwise create a new HumiditySensor service
        this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
          || this.accessory.addService(this.platform.Service.HumiditySensor);

        this.humidityService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);

        // register handlers for the CurrentRelativeHumidity Characteristic
        this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
          .on('get', (callback) => {
            callback(null, this.currentHumidity);
          });
      }

      // If we have Config setup for Air Pressure
      // Not implementd yet
      if ( this.airPressureName ) {
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName,': ',this.airPressureName);
        }
      }
      
      // We can now use MQTT
      if ( this.mqttBroker ) {
        this.getSensorDataMQTT();
      }
      
    } 
  }

  private updateSensorStatusFromSharedData(data?: Record<string, unknown>): void {
    if (!data) {
      this.platform.log.warn(`${this.deviceName}: No data available for updating switch status.`);
      return;
    }
  
    // If Temperature Service is available
    if (this.temperatureService) {
      if (this.temperatureName) {
        const tmpTemperature = getNestedValue(data, this.temperatureName, 'number');
        
        if (typeof tmpTemperature === 'number') {
          this.currentTemperature = tmpTemperature;
          this.temperatureService.updateCharacteristic(
            this.platform.Characteristic.CurrentTemperature,
            this.currentTemperature,
          );
        } else {
          this.platform.log.warn(
            this.deviceName,
            ': Error: Cannot find or convert: ',
            this.temperatureName,
            ' in JSON',
          );
        }
      } else {
        this.platform.log.warn(this.deviceName, ': Error: Temperature name is not defined');
      }
    }

    // If Humidity Service is available
    if (this.humidityService) {
      if (this.humidityName) {
        const tmpHumidity = getNestedValue(data, this.humidityName, 'number');
    
        if (typeof tmpHumidity === 'number') {
          this.currentHumidity = tmpHumidity;
          this.humidityService.updateCharacteristic(
            this.platform.Characteristic.CurrentRelativeHumidity,
            this.currentHumidity,
          );
        } else {
          this.platform.log.warn( this.deviceName, ': Error: Cannot find or convert: ', this.humidityName, ' in JSON' );
        }
      } else {
        this.platform.log.warn(this.deviceName, ': Error: Humidity name is not defined');
      }
    }
    
    // If we have Config setup for Air Pressure
    if ( this.airPressureName ) {
      if ( this.enableLogging) {
        this.platform.log.info(this.deviceName,': ',this.airPressureName);
      }
    }

    if ( this.enableLogging) {
      this.platform.log.info(this.deviceName,': ',JSON.stringify(data));
    }
  }
  
  private async getSensorData() {
    try {
      const response = await axios.get(this.sensorUrl);
      const data = response.data;

      // If Temperature Service is available
      if (this.temperatureService) {
        if (this.temperatureName) {
          const tmpTemperature = getNestedValue(data, this.temperatureName, 'number');
          
          if (typeof tmpTemperature === 'number') {
            this.currentTemperature = tmpTemperature;
            this.temperatureService.updateCharacteristic(
              this.platform.Characteristic.CurrentTemperature,
              this.currentTemperature,
            );
          } else {
            this.platform.log.warn( this.deviceName, ': Error: Cannot find or convert: ',this.temperatureName,' in JSON' );
          }
        } else {
          this.platform.log.warn(this.deviceName, ': Error: Temperature name is not defined');
        }
      }

      // If Humidity Service is available
      if (this.humidityService) {
        if (this.humidityName) {
          const tmpHumidity = getNestedValue(data, this.humidityName, 'number');
      
          if (typeof tmpHumidity === 'number') {
            this.currentHumidity = tmpHumidity;
            this.humidityService.updateCharacteristic(
              this.platform.Characteristic.CurrentRelativeHumidity,
              this.currentHumidity,
            );
          } else {
            this.platform.log.warn( this.deviceName, ': Error: Cannot find or convert: ',this.temperatureName,' in JSON' );
          }
        } else {
          this.platform.log.warn(this.deviceName, ': Error: Humidity name is not defined');
        }
      }
      
      // If we have Config setup for Air Pressure
      if ( this.airPressureName ) {
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName,': ',this.airPressureName);
        }
      }
      
      if ( this.enableLogging) {
        this.platform.log.info(this.deviceName,': ',JSON.stringify(data));
      }

    } catch (e) {
      const error = e as AxiosError;
      if (axios.isAxiosError(error)) {
        this.platform.log.warn(this.deviceName,': Error: ', error.message );
      }
    }
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
      if ( this.enableLogging) {
        this.platform.log.info(this.deviceName,': MQTT Connected');  
      }
      this.mqttClient.subscribe(mqttSubscribedTopics, (err) => {
        if (!err) {
          if ( this.enableLogging) {
            this.platform.log.info(this.deviceName,': Subscribed to: ', mqttSubscribedTopics.toString());
          }
        } else {
          // Need to insert error handler
          this.platform.log.warn(this.deviceName, err.toString());
        }
      });
    });
  
    this.mqttClient.on('message', (topic, message) => {
      //this.platform.log(this.deviceName,': Received message: ${message.toString()}');
      
      if ( topic === this.mqttTemperature ) {
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName,': Temperature = ',message.toString());
        }
        this.currentTemperature = Number(message.toString());
        this.temperatureService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.currentTemperature);
      }

      if ( topic === this.mqttHumidity ) {
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName,': Humidity = ',message.toString());
        }
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
