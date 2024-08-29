import { PlatformAccessory, Service  } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios from 'axios';


/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformSensors {
  public service!: Service;
  public temperatureService!: Service;
  public humidityService!: Service;

  public deviceId: string = '';
  public deviceType: string = '';
  public isOn: boolean = false;
  public url = '';
  public body = '';
  public temperature = 20;
  public humidity = 50;
  public updateInterval = 60000;

  public switchStates = {
    On: false ,
  };
  
  constructor(
    public readonly platform: HttpSensorsAndSwitchesHomebridgePlatform,
    public readonly accessory: PlatformAccessory,
  ) {
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Stergo')
      .setCharacteristic(this.platform.Characteristic.Model, 'Model')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.UUID);

    this.updateInterval = accessory.context.device.updateInterval || 60000; // Default update interval is 60 seconds
    
    this.deviceType = this.accessory.context.device.deviceType;

    if ( this.deviceType === 'Sensor' ) {
      if ( !this.deviceType ) {
        return;
      }
      //new platformSensors(this.platform, accessory);
      
      // get the TemperatureSensor service if it exists, otherwise create a new TemperatureSensor service
      // you can create multiple services for each accessory
      //this.temperatureService = new this.platform.Service.TemperatureSensor(accessory.context.device.deviceName);

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
      // you can create multiple services for each accessory
      //this.humidityService = new this.platform.Service.TemperatureSensor(accessory.context.device.deviceName);
      this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
      || this.accessory.addService(this.platform.Service.HumiditySensor);
      this.humidityService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);
      
      // register handlers for the CurrentRelativeHumidity Characteristic
      this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
        .on('get', this.getHumidity.bind(this));
      

      this.getSensorData();
      setInterval(this.getSensorData.bind(this), this.updateInterval);
      
    } 
    
    
    if ( !this.deviceType ) {
      return;
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

      //this.platform.log(JSON.stringify(data));
      this.platform.log.debug(JSON.stringify(data));

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
