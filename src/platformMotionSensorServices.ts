import { PlatformAccessory, Service } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions } from 'mqtt';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformMotionSensor {
  public motionService!: Service;
  public mqttClient!: mqtt.MqttClient;

  public deviceId: string = '';
  public deviceType: string = '';
  public deviceName: string = '';
  public deviceManufacturer: string = '';
  public deviceModel: string = '';
  public deviceSerialNumber: string = '';
  public deviceFirmwareVersion: string = '';
  
  public motionSensorUrl: string = '';
  public motionSensorName: string = '';

  public mqttReconnectInterval: string = '';
  public mqttBroker: string = '';
  public mqttPort: string = '';
  public mqttMotionSensor: string = '';
  public mqttUsername: string = '';
  public mqttPassword: string = '';
 
  public motionDetected: boolean = false;
  public updateIntervalMotionSensor = 300000;
  

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
    this.motionSensorUrl = this.accessory.context.device.motionSensorUrl;
    this.motionSensorName = this.accessory.context.device.motionSensorName;
    this.updateIntervalMotionSensor = accessory.context.device.updateIntervalMotionSensor || 300000; // Default update interval is 300 seconds

    this.mqttReconnectInterval = this.accessory.context.device.mqttReconnectInterval || 60; // 60 sec default
    this.mqttBroker = this.accessory.context.device.mqttBroker;
    this.mqttPort = this.accessory.context.device.mqttPort;
    this.mqttMotionSensor = this.accessory.context.device.mqttMotionSensor;
    this.mqttUsername = this.accessory.context.device.mqttUsername;
    this.mqttPassword = this.accessory.context.device.mqttPassword;

    if (!this.deviceType) {
      return;
    }

    if (this.deviceType === 'MotionSensor' && (this.motionSensorUrl || this.mqttBroker)) {

      // Set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);

      // If we have Config setup for Motion
      if (this.motionSensorName || this.mqttMotionSensor) {
        // Get the MotionSensor service if it exists, otherwise create a new MotionSensor service
        this.motionService = this.accessory.getService(this.platform.Service.MotionSensor)
          || this.accessory.addService(this.platform.Service.MotionSensor);

        this.motionService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);

        // Register handlers for the MotionDetected Characteristic
        this.motionService.getCharacteristic(this.platform.Characteristic.MotionDetected)
          .on('get', this.getMotion.bind(this));
      }
      
      // We can now use MQTT
      if (this.mqttBroker) {
        this.getSensorDataMQTT();
      }
      
      // If we are going with JSON over HTTP
      if (this.motionSensorUrl) {
        this.getSensorData();
        setInterval(this.getSensorData.bind(this), this.updateIntervalMotionSensor);
      }
      
    } 
  }

  // Add getMotion method
  getMotion(callback: (error: Error | null, value?: boolean) => void) {
    callback(null, this.motionDetected);
  }

  // Add getSensorDataMQTT method
  getSensorDataMQTT() {
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

    if (this.mqttMotionSensor) {
      mqttSubscribedTopics.push(this.mqttMotionSensor);
    }

    this.mqttClient = mqtt.connect(mqttOptions);
    
    this.mqttClient.on('connect', () => {
      this.platform.log.info(this.deviceName, ': MQTT Connected');  
      this.mqttClient.subscribe(mqttSubscribedTopics, (err) => {
        if (!err) {
          this.platform.log.info(this.deviceName, ': Subscribed to: ', mqttSubscribedTopics.toString());
        } else {
          this.platform.log.warn(this.deviceName, err.toString());
        }
      });
    });
  
    this.mqttClient.on('message', (topic, message) => {
      if (topic === this.mqttMotionSensor) {
        this.platform.log.info(this.deviceName, ': Motion = ', message.toString());
        this.motionDetected = message.toString() === 'true';
        this.motionService.updateCharacteristic(this.platform.Characteristic.MotionDetected, this.motionDetected);
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
    
    this.mqttClient.on('error', (err) => {
      this.platform.log.warn(this.deviceName, ': Connection error:', err);
      this.platform.log.warn(this.deviceName, ': Reconnecting in: ', this.mqttReconnectInterval, ' seconds.');
    });
  }

  // Add getSensorData method
  async getSensorData() {
    try {
      const response = await axios.get(this.motionSensorUrl);
      const data = response.data;

      // If we have Config setup for Motion
      if (this.motionSensorName && this.motionSensorName in data) {
        this.motionDetected = data[this.motionSensorName] === true;
        this.motionService.updateCharacteristic(this.platform.Characteristic.MotionDetected, this.motionDetected);
      } else {
        this.platform.log.warn(this.deviceName, ': Error: Cannot find: ', this.motionSensorName, ' in JSON');
      }

      //this.platform.log.info(this.deviceName, ': ', JSON.stringify(data));

    } catch (e) {
      const error = e as AxiosError;
      if (axios.isAxiosError(error)) {
        this.platform.log.warn(this.deviceName, ': Error: ', error.message);
      }
    }
  }
}
