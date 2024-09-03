import { PlatformAccessory, Service  } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios from 'axios';

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
  public statusStateParam: string = '';
  public statusOnCheck: string = '';
  public statusOffCheck: string = '';
  public deviceManufacturer: string = '';
  public deviceModel: string = '';
  public deviceSerialNumber: string = '';
  public deviceFirmwareVersion: string = '';
  public url = '';
  
  public temperature = 20;
  public humidity = 50;
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
    this.updateInterval = accessory.context.device.updateInterval || 300000; // Default update interval is 300 seconds


    if ( !this.deviceType ) {
      return;
    }

    if ( this.deviceType === 'Sensor' ) {
      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);
      
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

      // get the HumiditySensor service if it exists, otherwise create a new HumiditySensor service
      this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
      || this.accessory.addService(this.platform.Service.HumiditySensor);
      
      this.humidityService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);
      
      // register handlers for the CurrentRelativeHumidity Characteristic
      this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
        .on('get', this.getHumidity.bind(this));
      

      this.getSensorData();
      setInterval(this.getSensorData.bind(this), this.updateInterval);
      
    } 
  }

  
  async getSensorData() {
    try {
      const response = await axios.get(this.accessory.context.device.sensorUrl);
      const data = response.data;
      
      this.temperature = Number(data[this.accessory.context.device.temperatureName]);
      this.humidity = Number(data[this.accessory.context.device.humidityName]);

      this.temperatureService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.temperature);
      this.humidityService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.humidity);

      this.platform.log(this.deviceName,': ',JSON.stringify(data));
      //this.platform.log.debug(JSON.stringify(data));

    } catch (error) {
      //this.log('Error fetching data: ', error);
      this.platform.log.debug('Error fetching data: ', error);
    }
  }
  
  async getTemperature(callback: (arg0: null, arg1: number) => void) {
    callback(null, this.temperature);
  }

  async getHumidity(callback: (arg0: null, arg1: number) => void) {
    callback(null, this.humidity);
  }
}
