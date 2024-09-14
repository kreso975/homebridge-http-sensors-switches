import { CharacteristicSetCallback, CharacteristicValue, PlatformAccessory, Service  } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios, { AxiosError } from 'axios';
import * as mqtt from 'mqtt';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformSwitch {
  public service!: Service;

  public mqttClient!: mqtt.MqttClient;

  public deviceId: string = '';
  public deviceType: string = '';
  public deviceName: string = '';
  public deviceManufacturer: string = '';
  public deviceModel: string = '';
  public deviceSerialNumber: string = '';
  public deviceFirmwareVersion: string = '';

  public urlON: string = '';
  public urlOFF: string = '';
  public url = '';

  public urlStatus: string = '';
  public statusStateParam: string = '';
  public statusOnCheck: string = '';
  public statusOffCheck: string = '';

  public mqttBroker: string = '';
  public mqttPort: string = '';
  public mqttSwitch: string = '';
  public mqttUsername: string = '';
  public mqttPassword: string = '';

  public switchStates = {
    On: false,
  };
 
  
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
    this.urlStatus = this.accessory.context.device.urlStatus;
    this.statusStateParam = this.accessory.context.device.stateName;
    this.statusOnCheck = this.accessory.context.device.onStatusValue;
    this.statusOffCheck = this.accessory.context.device.offStatusValue;
    this.urlON = this.accessory.context.device.urlON;
    this.urlOFF = this.accessory.context.device.urlOFF;

    this.mqttBroker = accessory.context.device.mqttBroker;
    this.mqttPort = accessory.context.device.mqttPort;
    this.mqttSwitch = accessory.context.device.mqttSwitch;
    this.mqttUsername = accessory.context.device.mqttUsername;
    this.mqttPassword = accessory.context.device.mqttPassword;    
  
  
    if ( !this.deviceType) {
      this.platform.log.warn('Ignoring accessory; No deviceType defined.');
      return;
    }

    if ( this.deviceType === 'Switch' && ( this.urlON || this.mqttBroker )) {

      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);
      

      if ( this.urlON || this.mqttBroker ) {
        // get the Switch service if it exists, otherwise create a new Switch service
        this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);

        // set the service name, this is what is displayed as the default name on the Home app
        // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);

        // each service must implement at-minimum the "required characteristics" for the given service type
        // see https://developers.homebridge.io/#/service/Lightbulb

        // Try to fetch init power Status of device and check the status every 5 sec
        // We are checking status because if it's manualy changed/switched Homekit is not notified
        // If we do not have urlStatus defined in config we will skip reading Switch status
        
        if ( this.urlStatus ) {
          this.getOn();
          setInterval(this.getOn.bind(this), 5000);
        }

        if ( this.urlON ) {
          // register handlers for the On/Off Characteristic
          this.service.getCharacteristic(this.platform.Characteristic.On)
            .on('set', this.setOn.bind(this))
            .on('get', (callback) => {
              callback(null, this.switchStates.On);
            });
        }
        
        // We can now use MQTT
        if ( this.mqttBroker ) {
          this.initMQTT();

          this.service.getCharacteristic(this.platform.Characteristic.On)
            .on('set', this.publishMQTTmessage.bind(this));

        }
      }
    } 
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  
  async setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    // 
    this.switchStates.On = value as boolean;
    
    if (!this.urlON || !this.urlOFF) {
      this.platform.log.warn('Ignoring request; No Switch trigger url defined.');
      callback(new Error('No Switch trigger url defined.'));
      return;
    }

    if (this.switchStates.On) {
      this.url = this.urlON;
      this.platform.log.debug('Setting power state to ON');
      this.service.updateCharacteristic(this.platform.Characteristic.On, true);
    } else {
      this.url = this.urlOFF;
      this.platform.log.debug('Setting power state to OFF');
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
    }
  
    axios.get(this.url)
    //  .then((response) => {
    // handle success
    //    callback(response.data);
    //    this.platform.log.debug('Success: ', error);
    //  })
      .catch((error) => {
      // handle error
      // Let's reverse On value since we couldn't reach URL
        this.service.updateCharacteristic(this.platform.Characteristic.On, !this.switchStates.On);
        this.switchStates.On = !value;
        //this.platform.log.debug('Setting power state to :', this.switchStates.On  );
        this.platform.log.warn('Setting power state to :', this.switchStates.On  );
        //this.platform.log.debug('Error: ', error);
        this.platform.log.warn(this.deviceName,': Error: ', error.message);
        //callback(error);
      });

    callback(null);
    //this.platform.log.debug('Success: Switch ',this.deviceName,' is: ', value);
    this.platform.log.info('Success: Switch ',this.deviceName,' is: ', this.switchStates.On);
  }

  async getOn() {
    // Check if we have Status URL setup
    // this.platform.log.debug(this.accessory.context.device.urlStatus);
    if (!this.urlStatus) {
      this.platform.log.warn('Ignoring request; No status url defined.');
      return;
    }

    try {
      //this.platform.log.debug(this.accessory.context.device.urlStatus);
      const response = await axios({
        url: this.urlStatus,
        method: 'get',
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = response.data;

      if( data[this.statusStateParam] === this.statusOnCheck ) {
        
        if( this.switchStates.On !== true ) {
          this.switchStates.On = true;
          this.platform.log.info('Switch is ON');
          this.service.updateCharacteristic(this.platform.Characteristic.On, true);
        }
      } else if ( data[this.statusStateParam] === this.statusOffCheck ) {

        if( this.switchStates.On !== false ) {
          this.switchStates.On = false;
          this.platform.log.info('Switch is OFF');
          this.service.updateCharacteristic(this.platform.Characteristic.On, false);
        }
      } else {
        return;
      }
    } catch (e) {
      const error = e as AxiosError;
      if (axios.isAxiosError(error)) {
        this.platform.log.debug(this.deviceName,': Error: ', error.message );
      }
      
    }
  }

  getStatus(isOn: boolean): string {
    return isOn ? 'ON' : 'OFF';
  }
  //
  // Connect to MQTT and update Switches
  initMQTT() {
    const mqttSubscribedTopics: string | string[] | mqtt.ISubscriptionMap = [];

    const mqttOptions = {
      keepalive: 10,
      host: this.mqttBroker,
      port: Number(this.mqttPort),
      clientId: this.deviceName,
      clean: true,
      username: this.mqttUsername,
      password: this.mqttPassword,
      rejectUnauthorized: false,
    }; 

    if (this.mqttSwitch) {
      mqttSubscribedTopics.push( this.mqttSwitch );
    }
    
    this.mqttClient = mqtt.connect( mqttOptions );
    this.mqttClient.on('connect', () => {
      
      this.platform.log(this.deviceName,': MQTT Connected');

      this.mqttClient.subscribe(mqttSubscribedTopics, (err) => {
        if (!err) {
          this.platform.log(this.deviceName,': Subscribed to: ', mqttSubscribedTopics.toString());
        } else {
          // Need to insert error handler
          this.platform.log(err.toString());
        }
      });
    });
  
    this.mqttClient.on('message', (topic, message) => {
      //this.platform.log(`Received message: ${message.toString()}`);  
      if ( topic === this.mqttSwitch ) {
        this.platform.log(this.deviceName,': Status set to: ', this.getStatus(Boolean(message.toString())));
        
        if ( message.toString() === '1' ) {
          this.switchStates.On = true;
        }
        if ( message.toString() === '0' ) {
          this.switchStates.On = false;
        }
        
        this.service.updateCharacteristic(this.platform.Characteristic.On, this.switchStates.On);
      }
    });
  }

  // Function to publish a message
  publishMQTTmessage(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    
    this.platform.log.debug(this.deviceName, ': Setting power state to:', this.getStatus(!this.switchStates.On) );

    this.mqttClient.publish(this.mqttSwitch, String(Number(!this.switchStates.On)), { qos: 1, retain: true }, (err) => {
      if (err) {
        this.platform.log.debug(this.deviceName, ': Failed to publish message:', err);
      } else {
        this.service.updateCharacteristic(this.platform.Characteristic.On, this.switchStates.On);
        this.platform.log.debug(this.deviceName, ': Message published successfully');
      }
    });

    callback(null);
  }
}