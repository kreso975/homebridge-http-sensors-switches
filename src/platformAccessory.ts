import { CharacteristicValue, PlatformAccessory, Service  } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios from 'axios';
import { error } from 'console';


/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class HttpSensorsAndSwitchesHomebridgePlatformAccessory {
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
    
    if ( this.deviceType === 'Switch') {
      // this.deviceType === 'LightBulb'
      // get the Switch service if it exists, otherwise create a new Switch service
      // you can create multiple services for each accessory
      if ( !this.deviceType ) {
        return;
      }

      this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

      // set the service name, this is what is displayed as the default name on the Home app
      // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
      this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);

      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Lightbulb

      // register handlers for the On/Off Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .on('set', this.setOn.bind(this))
        .on('get', (callback) => {
          callback(null, this.switchStates.On);
        });
    }
    if ( !this.deviceType ) {
      return;
    }
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  
  async setOn(value: CharacteristicValue, callback: (arg0: Error) => void) {
    // 
    this.switchStates.On = value as boolean;
    
    if (!this.accessory.context.device.urlON || !this.accessory.context.device.urlOFF) {
      this.platform.log.warn('Ignoring request; No power url defined.');
      callback(new Error('No power url defined.'));
      return;
    }

    if (this.switchStates.On) {
      this.url = this.accessory.context.device.urlON;
      this.platform.log.debug('Setting power state to ON');
      this.service.updateCharacteristic(this.platform.Characteristic.On, true);
    } else {
      this.url = this.accessory.context.device.urlOFF;
      this.platform.log.debug('Setting power state to OFF');
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
    }
  
    axios.get(this.url)
      .then((response) => {
        // handle success
        callback(response.data);
        this.platform.log.debug('Success: ', error);
      })
      .catch((error) => {
      // handle error
      // Let's reverse On value since we couldnt reach URL
        this.service.updateCharacteristic(this.platform.Characteristic.On, !value);
        this.switchStates.On = !value;
        this.platform.log.debug('Setting power state to :', !value  );
        this.platform.log.debug('Error: ', error);
        callback(error);
      });
  }

  
  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possible. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  /*
  async getOn(): Promise<CharacteristicValue> {
    // Check if we have Status URL setup
    // this.platform.log(this.accessory.context.device.urlStatus);
    if (!this.accessory.context.device.urlStatus) {
      this.platform.log.warn('Ignoring request; No status url defined.');
      return this.isOn;
    }  
    
    try {
      //this.platform.log(this.accessory.context.device.urlStatus);
      const response = await axios.get(this.accessory.context.device.urlStatus);
      const data = response.data;
      
      // eslint-disable-next-line eqeqeq
      if( data.POWER == 'ON' ) {
        this.isOn = true;
        this.service.updateCharacteristic(this.platform.Characteristic.On, true);
      } else {
        this.isOn = false;
        this.service.updateCharacteristic(this.platform.Characteristic.On, false);
      }
    } catch (error) {
      this.platform.log('Error fetching data: ', error);
      //this.platform.log('Error fetching data, errno: ' + error.errno + ', code: ' + error.code + ', syscall: ' + error.syscall);
    }
    
    //this.platform.log.debug('Get Characteristic On ->', isOn);
    //this.platform.log('Get Characteristic On ->' + this.isOn);
    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    
    return this.isOn;
  }
  */
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
  /*
  async getOn2(callback: CharacteristicGetCallback) {
    // Check if we have Status URL setup
    // this.platform.log(this.accessory.context.device.urlStatus);
    if (!this.accessory.context.device.urlStatus) {
      this.platform.log.warn('Ignoring request; No status url defined.');
      return this.isOn;
    }  
    
    try {
      //this.platform.log(this.accessory.context.device.urlStatus);
      const response = await axios.get(this.accessory.context.device.urlStatus);
      const data = response.data;
      
      // eslint-disable-next-line eqeqeq
      if( data.POWER == 'ON' ) {
        this.isOn = true;
        this.service.updateCharacteristic(this.platform.Characteristic.On, true);
      } else {
        this.isOn = false;
        this.service.updateCharacteristic(this.platform.Characteristic.On, false);
      }
    } catch (error) {
      this.platform.log('Error fetching data: ', error);
      //this.platform.log('Error fetching data, errno: ' + error.errno + ', code: ' + error.code + ', syscall: ' + error.syscall);
    }
    
    callback(undefined, this.isOn);
    //return this.isOn;
  }
    */
}
