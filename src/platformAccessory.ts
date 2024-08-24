import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';
import axios from 'axios';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class HttpSensorsAndSwitchesHomebridgePlatformAccessory {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;

    this.temperature = 20;
    this.humidity = 50;

    this.log.info('HttpTemperatureHumidity Plugin Loaded');

    this.url = config.url;
	  this.temperatureName = config.temperature_name;
	  this.humidityName = config.humidity_name;
    this.updateInterval = config.updateInterval || 60000; // Default update interval is 60 seconds

    this.temperatureService = new Service.TemperatureSensor(this.name);
    this.temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getTemperature.bind(this));

    this.humidityService = new Service.HumiditySensor(this.name);
    this.humidityService
      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', this.getHumidity.bind(this));

    // Fetch initial values and schedule periodic updates
    this.fetchData();
    setInterval(this.fetchData.bind(this), this.updateInterval);
  }

  async fetchData() {
    try {
      const response = await axios.get(this.url);
      const data = response.data;
      this.temperature = Number(data[this.temperatureName]);
      this.humidity = Number(data[this.humidityName]);

      this.temperatureService
        .getCharacteristic(Characteristic.CurrentTemperature)
        .updateValue(this.temperature);

      this.humidityService
        .getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .updateValue(this.humidity);

      this.log(JSON.stringify(data));

    } catch (error) {
      //this.log('Error fetching data: ', error);
	  this.log('Error fetching data, errno: ' + error.errno + ', code: ' + error.code + ', syscall: ' + error.syscall);
    }
  }

  getTemperature(callback) {
    callback(null, this.temperature);
  }

  getHumidity(callback) {
    callback(null, this.humidity);
  }


  getServices() {
    return [
      this.temperatureService,
      this.humidityService,
    ];
  }

}
