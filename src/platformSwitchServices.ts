import { CharacteristicValue, PlatformAccessory, Service  } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios from 'axios';
import { error } from 'console';


/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformSwitch {
  public service!: Service;

  public deviceId: string = '';
  public deviceType: string = '';
  public isOn: boolean = false;
  public url = '';
  public body = '';


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
      .setCharacteristic(this.platform.Characteristic.Model, 'Switch')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.UUID);

    
    this.deviceType = this.accessory.context.device.deviceType;
    
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
}
