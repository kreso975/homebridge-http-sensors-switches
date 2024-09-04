import { PlatformAccessory, Service  } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios, { AxiosError } from 'axios';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformSensors {
  public temperatureService!: Service;
  public humidityService!: Service;

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
    this.deviceModel = this.accessory.context.device.deviceModel || 'Switch';
    this.deviceSerialNumber = this.accessory.context.device.deviceSerialNumber || accessory.UUID;
    this.deviceFirmwareVersion = this.accessory.context.device.deviceFirmwareVersion || '0.0';
    
    // From Config
    this.sensorUrl = this.accessory.context.device.sensorUrl;
    this.temperatureName = this.accessory.context.device.temperatureName;
    this.humidityName = this.accessory.context.device.humidityName;
    this.airPressureName = this.accessory.context.device.airPressureName;
    this.updateInterval = accessory.context.device.updateInterval || 300000; // Default update interval is 300 seconds

    if ( !this.deviceType ) {
      return;
    }

    if ( this.deviceType === 'Sensor' && this.sensorUrl ) {

      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);

      // If we have Config setup for Temperature
      if ( this.temperatureName ) {
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
      if ( this.humidityName ) {
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
      //
      this.getSensorData();
      setInterval(this.getSensorData.bind(this), this.updateInterval);
      
    } 
  }

  
  async getSensorData() {
    try {
      const response = await axios.get(this.sensorUrl);
      const data = response.data;
      
      // If we have Config setup for Temperature
      if ( this.temperatureName ) {
        this.currentTemperature = Number(data[this.temperatureName]);
        this.temperatureService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.currentTemperature);
      }

      // If we have Config setup for Humidity
      if (this.humidityName) {
        this.currentHumidity = Number(data[this.humidityName]);
        this.humidityService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.currentHumidity);
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
  
  async getTemperature(callback: (arg0: null, arg1: number) => void) {
    callback(null, this.currentTemperature);
  }

  async getHumidity(callback: (arg0: null, arg1: number) => void) {
    callback(null, this.currentHumidity);
  }
}
