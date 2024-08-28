import { CharacteristicValue, PlatformAccessory, Service  } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

//import { platformSemsors } from './platformSensorServices.js';
import axios from 'axios';

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

  public exampleStates = {
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
    
    if ( this.accessory.context.device.deviceType === 'Sensor') {
      
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
      
    } else {
      // get the Switch service if it exists, otherwise create a new Switch service
      // you can create multiple services for each accessory
      this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

      // set the service name, this is what is displayed as the default name on the Home app
      // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
      this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);

      // each service must implement at-minimum the "required characteristics" for the given service type
      // see https://developers.homebridge.io/#/service/Lightbulb

      // register handlers for the On/Off Characteristic
      this.service.getCharacteristic(this.platform.Characteristic.On)
        .onSet(this.setOn.bind(this)) // SET - bind to the `setOn` method below
        .onGet(this.getOn.bind(this)); // GET - bind to the `getOn` method below
    }
   


    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same subtype id.)
     */

    
    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    this.exampleStates.On = value as boolean;
    //this.platform.log(this.accessory.context.device.urlON);
    if (this.exampleStates.On) {
      this.url = this.accessory.context.device.urlON;
		  this.service.updateCharacteristic(this.platform.Characteristic.On, true);
    } else {
      this.url = this.accessory.context.device.urlOFF;
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
    }

    try {
      axios.get(this.url);
      
    } catch (error) {
      this.platform.log('Error fetching data: ', error);
      //this.platform.log('Error fetching data, errno: ' + error.errno + ', code: ' + error.code + ', syscall: ' + error.syscall);
    }
    
    /*
    axios(this.url)
      .catch((error) => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          this.platform.log(error.response.data);
          this.platform.log(error.response.status);
          this.platform.log(error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          this.platform.log(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          this.platform.log('Error', error.message);
        }
        this.platform.log(error.config);
      });
    */
    this.platform.log('Set Characteristic On ->', value);  
    //this.platform.log.debug('Set Characteristic On ->', value);
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
