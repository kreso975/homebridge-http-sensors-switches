import { CharacteristicSetCallback, CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions } from 'mqtt';
import { discordWebHooks } from './lib/discordWebHooks.js';

export class platformOutlet {
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
  public inUseStateParam: string = '';
  public inUseOnCheck: string = '';
  public inUseOffCheck: string = '';

  public mqttReconnectInterval: string = '';
  public mqttBroker: string = '';
  public mqttPort: string = '';
  public mqttSwitch: string = '';
  public mqttInUse: string = '';
  public mqttUsername: string = '';
  public mqttPassword: string = '';

  public discordWebhook: string = '';
  public discordUsername: string = '';
  public discordAvatar: string = '';
  public discordMessage: string = '';

  public outletStates = {
    On: false,
    OutletInUse: false,
  };

  constructor(
      public readonly platform: HttpSensorsAndSwitchesHomebridgePlatform,
      public readonly accessory: PlatformAccessory,
  ) {

    this.deviceType = this.accessory.context.device.deviceType;
    this.deviceName = this.accessory.context.device.deviceName || 'NoName';
    this.deviceManufacturer = this.accessory.context.device.deviceManufacturer || 'Stergo';
    this.deviceModel = this.accessory.context.device.deviceModel || 'Outlet';
    this.deviceSerialNumber = this.accessory.context.device.deviceSerialNumber || accessory.UUID;
    this.deviceFirmwareVersion = this.accessory.context.device.deviceFirmwareVersion || '0.0';

    this.urlStatus = this.accessory.context.device.urlStatus;
    this.statusStateParam = this.accessory.context.device.stateName;
    this.statusOnCheck = this.accessory.context.device.onStatusValue;
    this.statusOffCheck = this.accessory.context.device.offStatusValue;
    this.urlON = this.accessory.context.device.urlON;
    this.urlOFF = this.accessory.context.device.urlOFF;
    this.inUseStateParam = this.accessory.context.device.inUseStateName;
    this.inUseOnCheck = this.accessory.context.device.inUseOnStatusValue;
    this.inUseOffCheck = this.accessory.context.device.inUseOffStatusValue;

    this.mqttReconnectInterval = this.accessory.context.device.mqttReconnectInterval || 60; // 60 sec default
    this.mqttBroker = this.accessory.context.device.mqttBroker;
    this.mqttPort = this.accessory.context.device.mqttPort;
    this.mqttSwitch = this.accessory.context.device.mqttSwitch;
    this.mqttInUse = this.accessory.context.device.mqttInUse;
    this.mqttUsername = this.accessory.context.device.mqttUsername;
    this.mqttPassword = this.accessory.context.device.mqttPassword;

    this.discordWebhook = this.accessory.context.device.discordWebhook;
    this.discordUsername = this.accessory.context.device.discordUsername || 'StergoSmart';
    this.discordAvatar = this.accessory.context.device.discordAvatar
         || 'https://raw.githubusercontent.com/homebridge/branding/latest/logos/homebridge-color-round-stylized.png';
    this.discordMessage = this.accessory.context.device.discordMessage;


    if (!this.deviceType) {
      this.platform.log.warn(this.deviceName, ': Ignoring accessory; No deviceType defined.');
      return;
    }

    if (this.deviceType === 'Outlet' && (this.urlON || this.mqttBroker)) {
         this.accessory.getService(this.platform.Service.AccessoryInformation)!
           .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
           .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
           .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
           .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);

         if (this.urlON || this.mqttBroker) {
           this.service = this.accessory.getService(this.platform.Service.Outlet) || this.accessory.addService(this.platform.Service.Outlet);
           this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);

           if (this.urlStatus) {
             this.getOn();
             setInterval(this.getOn.bind(this), 5000);
           }

           if (this.urlON) {
             this.service.getCharacteristic(this.platform.Characteristic.On)
               .on('set', this.setOn.bind(this))
               .on('get', (callback) => {
                 callback(null, this.outletStates.On);
               });
           }

           if (this.inUseOnCheck) {
             // Add OutletInUse characteristic
             this.service.getCharacteristic(this.platform.Characteristic.OutletInUse)
               .on('get', (callback) => {
                 callback(null, this.outletStates.OutletInUse);
               });
           }

           if (this.mqttBroker) {
             this.initMQTT();

             this.service.getCharacteristic(this.platform.Characteristic.On)
               .on('set', this.publishMQTTmessage.bind(this));
           }
         }
    }
  }

  private getStatus(isOn: boolean): string {
    return isOn ? 'ON' : 'OFF';
  }

  private async getOn() {
    if (!this.urlStatus) {
      this.platform.log.warn(this.deviceName, ': Ignoring request; No status url defined.');
      return;
    }
 
    try {
      const response = await axios({
        url: this.urlStatus,
        method: 'get',
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = response.data;
 
      if (this.statusStateParam in data) {
        const value = data[this.statusStateParam];
        const valueType = typeof value;
      
        let statusOnCheck: boolean | number | string;
        let statusOffCheck: boolean | number | string;
      
        if (valueType === 'boolean') {
          statusOnCheck = true;
          statusOffCheck = false;
        } else if (valueType === 'number') {
          statusOnCheck = parseFloat(this.statusOnCheck);
          statusOffCheck = parseFloat(this.statusOffCheck);
        } else {
          statusOnCheck = this.statusOnCheck;
          statusOffCheck = this.statusOffCheck;
        }
      
        if (value === statusOnCheck) {
          this.updateOutletState(true, this.deviceName);
          this.platform.log.info(this.deviceName, ': State set to: ', this.getStatus(true));
        } else if (value === statusOffCheck) {
          this.updateOutletState(false, this.deviceName);
          this.platform.log.info(this.deviceName, ': State set to: ', this.getStatus(false));
        } else {
          this.platform.log.warn(this.deviceName, `: The value of ${this.statusStateParam} does not match statusOnCheck or statusOffCheck.`);
        }
      }
      
      if ( this.inUseStateParam && this.inUseStateParam in data) {
        const value = data[this.inUseStateParam];
        const valueType = typeof value;
      
        let inUseOnCheck: boolean | number | string;
        let inUseOffCheck: boolean | number | string;
      
        if (valueType === 'boolean') {
          inUseOnCheck = true;
          inUseOffCheck = false;
        } else if (valueType === 'number') {
          inUseOnCheck = parseFloat(this.inUseOnCheck);
          inUseOffCheck = parseFloat(this.inUseOffCheck);
        } else {
          inUseOnCheck = this.inUseOnCheck;
          inUseOffCheck = this.inUseOffCheck;
        }
      
        // Update OutletInUse characteristic
        if (value === inUseOnCheck) {
          this.outletStates.OutletInUse = true;
          this.platform.log.info(this.deviceName, ': inUse set to: ', this.getStatus(true));
        } else if (value === inUseOffCheck) {
          this.outletStates.OutletInUse = false;
          this.platform.log.info(this.deviceName, ': inUse set to: ', this.getStatus(false));
        } else {
          this.platform.log.warn(this.deviceName, `: The value of ${this.inUseStateParam} does not match inUseOnCheck or inUseOffCheck.`);
        }
        this.service.updateCharacteristic(this.platform.Characteristic.OutletInUse, this.outletStates.OutletInUse);
 
      } else {
        if ( this.inUseStateParam ) {
          this.platform.log.warn(this.deviceName, ': Error: Cannot find KEY:', this.statusStateParam, 'in JSON');
        }
      }
    } catch (e) {
      const error = e as AxiosError;
      if (axios.isAxiosError(error)) {
        this.platform.log.warn(this.deviceName, ': Error: URL Status check:', error.message);
      }
    }
  }
 
  private async setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.outletStates.On = value as boolean;

    if (!this.urlON || !this.urlOFF) {
      this.platform.log.warn(this.deviceName, ': Ignoring request; No Outlet trigger url defined.');
      callback(new Error('No Outlet trigger url defined.'));
      return;
    }

    if (this.outletStates.On) {
      this.url = this.urlON;
      this.platform.log.debug(this.deviceName, ': Setting power state to ON');
      this.service.updateCharacteristic(this.platform.Characteristic.On, true);
    } else {
      this.url = this.urlOFF;
      this.platform.log.debug(this.deviceName, ': Setting power state to OFF');
      this.service.updateCharacteristic(this.platform.Characteristic.On, false);
    }

    axios.get(this.url)
      .then(() => {
        this.outletStates.OutletInUse = this.outletStates.On;
        this.service.updateCharacteristic(this.platform.Characteristic.OutletInUse, this.outletStates.OutletInUse);
        this.platform.log.info('Success: Outlet ', this.deviceName, ' is: ', this.getStatus(this.outletStates.On));
      })
      .catch((error) => {
        this.outletStates.On = !value;
        this.service.updateCharacteristic(this.platform.Characteristic.On, this.outletStates.On);
        this.platform.log.warn(this.deviceName, ': Setting power state to :', this.outletStates.On);

        this.platform.log.warn(this.deviceName, ': Error: ', error.message);
      });

    if (this.discordWebhook) {
      this.initDiscordWebhooks();
    }

    callback(null);
  }


  private updateOutletState(isOn: boolean, deviceName: string) {
    if (this.outletStates.On !== isOn) {
      this.outletStates.On = isOn;
      this.platform.log.info(deviceName, `: Outlet is ${isOn ? 'ON' : 'OFF'}`);
      this.service.updateCharacteristic(this.platform.Characteristic.On, isOn);
    }
  }

  //
  // Connect to MQTT and update Outlets
  private initMQTT() {
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

    if ( this.mqttSwitch ) {
      mqttSubscribedTopics.push(this.mqttSwitch);
    }
    if ( this.mqttInUse ) {
      mqttSubscribedTopics.push(this.mqttInUse);
    }

    this.mqttClient = mqtt.connect(mqttOptions);
    this.mqttClient.on('connect', () => {
      this.platform.log.info(this.deviceName, ': MQTT Connected');

      this.mqttClient.subscribe(mqttSubscribedTopics, (err) => {
        if (!err) {
          this.platform.log.info(this.deviceName, ': Subscribed to: ', mqttSubscribedTopics.toString());
        } else {
          // Need to insert error handler
          this.platform.log.warn(this.deviceName, err.toString());
        }
      });
    });

    this.mqttClient.on('message', (topic, message) => {
      if (topic === this.mqttSwitch) {
        this.platform.log.info(this.deviceName, ': Status set to: ', this.getStatus(Boolean(Number(message))));

        if ( message.toString() === '1' || message.toString() === 'true' ) {
          this.outletStates.On = true;
        }
        if ( message.toString() === '0' || message.toString() === 'false' ) {
          this.outletStates.On = false;
        }

        this.service.updateCharacteristic(this.platform.Characteristic.On, this.outletStates.On);
        // If discordWebhook is set
        if (this.discordWebhook) {
          this.initDiscordWebhooks();
        }
      }
      if (topic === this.mqttInUse) {
        this.platform.log.info(this.deviceName, ': inUse set to: ', this.getStatus(Boolean(Number(message))));

        if (message.toString() === '1' || message.toString() === 'true') {
          this.outletStates.OutletInUse = true;
        }
        if (message.toString() === '0' || message.toString() === 'false') {
          this.outletStates.OutletInUse = false;
        }

        this.service.updateCharacteristic(this.platform.Characteristic.OutletInUse, this.outletStates.OutletInUse);

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

    // Handle errors
    this.mqttClient.on('error', (err) => {
      this.platform.log.warn(this.deviceName, ': Connection error:', err);
      this.platform.log.warn(this.deviceName, ': Reconnecting in: ', this.mqttReconnectInterval, ' seconds.');
    });
  }

  // Function to publish a message
  private publishMQTTmessage(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    this.platform.log.debug(this.deviceName, ': Setting power state to:', this.getStatus(!this.outletStates.On));

    this.mqttClient.publish(this.mqttSwitch, String(Number(!this.outletStates.On)), { qos: 1, retain: true }, (err) => {
      if (err) {
        this.platform.log.debug(this.deviceName, ': Failed to publish message: ', err);
      } else {
        this.service.updateCharacteristic(this.platform.Characteristic.On, this.outletStates.On);
        this.platform.log.debug(this.deviceName, ': Message published successfully');
      }
    });

    callback(null);
  }


  private initDiscordWebhooks() {
    // Prepare message just to send On Off status
    const message = this.deviceName + ': ' + this.discordMessage + this.getStatus(this.outletStates.On);
    const discord = new discordWebHooks(this.discordWebhook, this.discordUsername, this.discordAvatar, message);

    discord.discordSimpleSend().then((result) => {
      this.platform.log.info(this.deviceName, ': ', result);
    });
  }
}