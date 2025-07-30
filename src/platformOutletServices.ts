import { CharacteristicSetCallback, CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions } from 'mqtt';

import { SharedPolling, SharedData } from './lib/SharedPolling.js';     // Include shared polling library
import { MQTTManager } from './lib/MQTTManager.js';                     // Include MQTTManager
import { getNestedValue, hasNestedKey } from './lib/utilities.js';      // Include utility function for nested value retrieval
import { discordWebHooks } from './lib/discordWebHooks.js';             // Include Discord webhook library

export class platformOutlet {
  public service!: Service;
  public mqttClient!: mqtt.MqttClient;
  private sharedPollingInstance?: SharedPolling;

  private isReachable: boolean = true; // Track if the device is reachable
  // Device and configuration properties
  public enableLogging: boolean = true;
  // Ensure backward compatibility for shared polling
  public sharedPolling = false; // Default to false
  public sharedPollingId = ''; // Default to empty
  public sharedPollingInterval = 5000;

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
      private readonly platform: HttpSensorsAndSwitchesHomebridgePlatform,
      private readonly accessory: PlatformAccessory,
      private mqttManager: MQTTManager,
  ) {
    const device = this.accessory.context.device;

    this.deviceType = device.deviceType;
    this.deviceName = device.deviceName || 'NoName';
    this.deviceManufacturer = device.deviceManufacturer || 'Stergo';
    this.deviceModel = device.deviceModel || 'Outlet';
    this.deviceSerialNumber = device.deviceSerialNumber || accessory.UUID;
    this.deviceFirmwareVersion = device.deviceFirmwareVersion || '0.0';

    // From config
    this.enableLogging = device.enableLogging;

    this.urlStatus = device.urlStatus;
    this.statusStateParam = device.stateName;
    this.statusOnCheck = device.onStatusValue;
    this.statusOffCheck = device.offStatusValue;
    this.urlON = device.urlON;
    this.urlOFF = device.urlOFF;
    this.inUseStateParam = device.inUseStateName;
    this.inUseOnCheck = device.inUseOnStatusValue;
    this.inUseOffCheck = device.inUseOffStatusValue;

    this.mqttReconnectInterval = device.mqttReconnectInterval || 60; // 60 sec default
    this.mqttBroker = device.mqttBroker;
    this.mqttPort = device.mqttPort;
    this.mqttSwitch = device.mqttSwitch;
    this.mqttInUse = device.mqttInUse;
    this.mqttUsername = device.mqttUsername;
    this.mqttPassword = device.mqttPassword;

    this.discordWebhook = device.discordWebhook;
    this.discordUsername = device.discordUsername || 'StergoSmart';
    this.discordAvatar = device.discordAvatar || 'https://raw.githubusercontent.com/homebridge/branding/latest/logos/homebridge-color-round-stylized.png';
    this.discordMessage = device.discordMessage;

    // Ensure backward compatibility for shared polling
    this.sharedPolling = device.sharedPolling ?? false; // Default shared polling to false
    this.sharedPollingId = device.sharedPollingId ?? ''; // Default shared polling group ID to an empty string
    this.sharedPollingInterval = device.sharedPollingInterval ?? 5000; // Set the polling interval to 5 sec or from config value

    if (this.sharedPolling && this.sharedPollingId) {
      const sharedPollingInstance = SharedPolling.registerPolling(
        this.sharedPollingId,
        this.urlStatus,
        this.platform,
        this.sharedPollingInterval, // Set the polling interval to 60 sec or from config value
      );
    
      // Subscribe to data updates
      sharedPollingInstance.on('dataUpdated', (data: SharedData) => {
        this.isReachable = true; // ✅ Mark as reachable
        this.updateOutletStatusFromSharedData(data);
      });

      sharedPollingInstance.on('dataError', () => {
        this.isReachable = false; // ❌ Mark as unreachable
      });
    } else if ( this.urlStatus ) {
      this.getOn();
      setInterval(this.getOn.bind(this), 5000);
    }  

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

           if (this.urlON) {
             this.service.getCharacteristic(this.platform.Characteristic.On)
               .on('set', this.wrapSetHandler()) // Reuses setOn
               .on('get', this.wrapGetHandler('On'));
           }

           if (this.inUseOnCheck) {
             this.service.getCharacteristic(this.platform.Characteristic.OutletInUse)
               .on('get', this.wrapGetHandler('OutletInUse'));
           }

           if (this.mqttBroker) {
             this.initMQTT();

             this.service.getCharacteristic(this.platform.Characteristic.On)
               .on('set', this.publishMQTTmessage.bind(this))
               .on('get', this.wrapGetHandler('On'));
           }
         }
    }
  }

  private wrapGetHandler(state: keyof typeof this.outletStates): (callback: (error: Error | null, value?: CharacteristicValue) => void) => void {
    return (callback) => {
      if (!this.isReachable) {
        callback(new this.platform.api.hap.HapStatusError(
          this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
        ));
        return;
      }

      callback(null, this.outletStates[state]);
    };
  }

  private wrapSetHandler(): (value: CharacteristicValue, callback: CharacteristicSetCallback) => void {
    return (value, callback) => {
      if (!this.isReachable) {
        callback(new this.platform.api.hap.HapStatusError(
          this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
        ));
        return;
      }

      this.setOn(value, callback); // Preserves your original logic
    };
  }

  private getStatus(isOn: boolean): string {
    return isOn ? 'ON' : 'OFF';
  }

  private updateOutletState(isOn: boolean, deviceName: string) {
    if (this.outletStates.On !== isOn) {
      this.outletStates.On = isOn;
      if ( this.enableLogging ) {
        this.platform.log.info(deviceName, `: Outlet is ${isOn ? 'ON' : 'OFF'}`);
      }
      this.service.updateCharacteristic(this.platform.Characteristic.On, isOn);
    }
  }

  private updateOutletStatusFromSharedData( data?: Record<string, unknown> ): void {
    this.processOutletGetData(data, true);
  }

  private async getOn() {
    if (!this.urlStatus) {
      this.platform.log.warn(this.deviceName, ': Ignoring request; No status url defined.');
      return;
    }

    try {
      this.isReachable = true; // ✅ Mark as reachable
      const response = await axios.get(this.urlStatus, { timeout: 8000 });
      const data = response.data;
  
      this.platform.log.debug(`${this.deviceName}: Fetched JSON data:`, data);
      this.processOutletGetData(data, false);
    } catch (error) {
      this.isReachable = false; // ❌ Mark as unreachable
      const axiosError = error as AxiosError;
      if (axios.isAxiosError(axiosError)) {
        this.platform.log.warn(`${this.deviceName}: Axios error while fetching JSON:`, axiosError.message);
      } else {
        this.platform.log.warn(`${this.deviceName}: Unknown error occurred while fetching JSON.`);
      }
    }
  }

  private processOutletGetData(data: Record<string, unknown> | undefined, isSharedData: boolean): void {
    if (!data) {
      this.platform.log.warn(`${this.deviceName}: No data available for ${isSharedData ? 'shared data update' : 'fetching Outlet state'}.`);
      return;
    }

    if ( this.statusStateParam && hasNestedKey(data, this.statusStateParam) ) {
      const value = getNestedValue(data, this.statusStateParam, 'string'); // Adjust returnType as needed
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
      
      if ( value === statusOnCheck ) {
        this.updateOutletState(true, this.deviceName);
      } else if (value === statusOffCheck) {
        this.updateOutletState(false, this.deviceName);
      } else {
        this.platform.log.warn(this.deviceName, `: The value of ${this.statusStateParam} does not match statusOnCheck or statusOffCheck.`);
      }
    }
      
    if ( this.inUseStateParam && hasNestedKey(data, this.inUseStateParam) ) {
      const value = getNestedValue(data, this.inUseStateParam, 'string'); // Adjust returnType as needed
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
      if ( value === inUseOnCheck ) {
        if ( this.enableLogging && this.outletStates.OutletInUse !== true ) {
          this.platform.log.info(this.deviceName, ': inUse set to: ', this.getStatus(true));
        }
        this.outletStates.OutletInUse = true;
      } else if ( value === inUseOffCheck ) {
        if ( this.enableLogging && this.outletStates.OutletInUse !== false ) {
          this.platform.log.info(this.deviceName, ': inUse set to: ', this.getStatus(false));
        }
        this.outletStates.OutletInUse = false;
      } else {
        this.platform.log.warn(this.deviceName, `: The value of ${this.inUseStateParam} does not match inUseOnCheck or inUseOffCheck.`);
      }
      this.service.updateCharacteristic(this.platform.Characteristic.OutletInUse, this.outletStates.OutletInUse);
 
    } else {
      if ( this.inUseStateParam ) {
        this.platform.log.warn(this.deviceName, ': Error: Cannot find KEY:', this.statusStateParam, 'in JSON');
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
        this.isReachable = true; // ✅ Mark as reachable
        this.outletStates.OutletInUse = this.outletStates.On;
        this.service.updateCharacteristic(this.platform.Characteristic.OutletInUse, this.outletStates.OutletInUse);
        if ( this.enableLogging) {
          this.platform.log.info('Success: Outlet ', this.deviceName, ' is: ', this.getStatus(this.outletStates.On));
        }
      })
      .catch((error) => {
        this.isReachable = false; // ❌ Mark as unreachable
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

  //
  // Connect to MQTT and update Outlets
  private initMQTT(): void {
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

    const mqttSubscribedTopics: string[] = [];
    if (this.mqttSwitch) {
      mqttSubscribedTopics.push(this.mqttSwitch);
    }
    if (this.mqttInUse) {
      mqttSubscribedTopics.push(this.mqttInUse);
    }

    // ✅ Initialize MQTTManager
    this.mqttManager = MQTTManager.getInstance(mqttOptions, this.platform.log);
    const deviceID = this.mqttManager.deviceID;

    // ✅ Error handler
    this.mqttManager.on('error', (id, err) => {
      if (id !== deviceID) {
        return;
      }
      this.isReachable = false;
      this.platform.log.warn(`${this.deviceName}: Connection error: ${err.message}`);
      this.platform.log.warn(`${this.deviceName}: Reconnecting in ${this.mqttReconnectInterval} seconds`);
    });

    // ✅ Subscribe to topics
    this.mqttManager.subscribeMultiple(mqttSubscribedTopics, (topic, message) => {
      const msg = message.toString();

      if (topic === this.mqttSwitch) {
        if (this.enableLogging) {
          this.platform.log.info(`${this.deviceName}: Status set to: ${this.getStatus(Boolean(Number(msg)))}`);
        }

        this.outletStates.On = msg === '1' || msg === 'true';
        this.service.updateCharacteristic(this.platform.Characteristic.On, this.outletStates.On);

        if (this.discordWebhook) {
          this.initDiscordWebhooks();
        }
      }

      if (topic === this.mqttInUse) {
        this.platform.log.info(`${this.deviceName}: inUse set to: ${this.getStatus(Boolean(Number(msg)))}`);
        this.outletStates.OutletInUse = msg === '1' || msg === 'true';
        this.service.updateCharacteristic(this.platform.Characteristic.OutletInUse, this.outletStates.OutletInUse);
      }
    });

    // ✅ Connection events
    this.mqttManager.on('connect', (id) => {
      if (id !== deviceID) {
        return;
      }
      this.isReachable = true;
      if (this.enableLogging) {
        this.platform.log.info(`${this.deviceName}: MQTT Connected`);
      }
    });

    this.mqttManager.on('offline', (id) => {
      if (id !== deviceID) {
        return;
      }
      this.isReachable = false;
      this.platform.log.warn(`${this.deviceName}: Client is offline`);
    });

    this.mqttManager.on('reconnect', (id) => {
      if (id !== deviceID) {
        return;
      }
      this.platform.log.warn(`${this.deviceName}: Reconnecting...`);
    });

    this.mqttManager.on('disconnect', (id) => {
      if (id !== deviceID) {
        return;
      }
      this.isReachable = false;
      this.platform.log.warn(`${this.deviceName}: Connection closed`);
    });
  }

  private publishMQTTmessage(
    value: CharacteristicValue,
    callback: CharacteristicSetCallback,
  ): void {
    this.platform.log.debug(`${this.deviceName}: Setting power state to: ${this.getStatus(!this.outletStates.On)}`);

    if (!this.mqttManager || !this.mqttManager.isReady()) {
      this.platform.log.warn(`${this.deviceName}: MQTT manager not ready, cannot publish`);
      callback(new Error('MQTT manager not connected'));
      return;
    }

    this.mqttManager.publish(this.mqttSwitch, String(Number(!this.outletStates.On)), {
      qos: 1,
      retain: true,
    });

    this.service.updateCharacteristic(this.platform.Characteristic.On, this.outletStates.On);
    this.platform.log.debug(`${this.deviceName}: Message published successfully`);
    callback(null);
  }

  private initDiscordWebhooks() {
    // Prepare message just to send On Off status
    const message = this.deviceName + ': ' + this.discordMessage + this.getStatus(this.outletStates.On);
    const discord = new discordWebHooks(this.discordWebhook, this.discordUsername, this.discordAvatar, message);

    discord.discordSimpleSend().then((result) => {
      if ( this.enableLogging) {
        this.platform.log.info(this.deviceName, ': ', result);
      }
    });
  }
}