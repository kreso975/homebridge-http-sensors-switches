import { CharacteristicSetCallback, CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import { SharedPolling, SharedData } from './lib/SharedPolling.js';     // Include shared polling library
import { getNestedValue, hasNestedKey } from './lib/utilities.js';      // Include utility function for nested value retrieval
import { discordWebHooks } from './lib/discordWebHooks.js';             // Include Discord webhook library

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions } from 'mqtt';

export class platformSwitch {
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

  public mqttReconnectInterval: string = '';
  public mqttBroker: string = '';
  public mqttPort: string = '';
  public mqttSwitch: string = '';
  public mqttUsername: string = '';
  public mqttPassword: string = '';

  public discordWebhook: string = '';
  public discordUsername: string = '';
  public discordAvatar: string = '';
  public discordMessage: string = '';

  public switchStates = { On: false };
  private individualPollingInterval?: NodeJS.Timeout; // Individual polling interval

  constructor(
    public readonly platform: HttpSensorsAndSwitchesHomebridgePlatform,
    public readonly accessory: PlatformAccessory,
  ) {
    const device = this.accessory.context.device;

    // Initialize device properties from the accessory context
    this.deviceType = device.deviceType;
    this.deviceName = device.deviceName || 'NoName';
    this.deviceManufacturer = device.deviceManufacturer || 'Stergo';
    this.deviceModel = device.deviceModel || 'Switch';
    this.deviceSerialNumber = device.deviceSerialNumber || accessory.UUID;
    this.deviceFirmwareVersion = device.deviceFirmwareVersion || '0.0';
    this.enableLogging = device.enableLogging;
    this.urlStatus = device.urlStatus;
    this.statusStateParam = device.stateName;
    this.statusOnCheck = device.onStatusValue;
    this.statusOffCheck = device.offStatusValue;
    this.urlON = device.urlON;
    this.urlOFF = device.urlOFF;
    this.mqttReconnectInterval = device.mqttReconnectInterval || '60';
    this.mqttBroker = device.mqttBroker;
    this.mqttPort = device.mqttPort;
    this.mqttSwitch = device.mqttSwitch;
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
        this.sharedPollingInterval, // Set the polling interval to 5 sec or from config value
      );
      
      // Subscribe to data updates
      sharedPollingInstance.on('dataUpdated', (data: SharedData) => {
        this.isReachable = true; // ✅ Mark as reachable
        this.updateSwitchStatusFromSharedData(data);
      });

      sharedPollingInstance.on('dataError', () => {
        this.isReachable = false; // ❌ Mark as unreachable
      });
    } else if (this.urlStatus) {
      this.startIndividualPolling();
      setInterval(this.startIndividualPolling.bind(this), 5000);
    }    
    
    // Initialize the device accessory with HomeKit services and characteristics
    this.initializeAccessory();
  }

  private initializeAccessory(): void {
    if (!this.deviceType) {
      this.platform.log.warn(`${this.deviceName}: Ignoring accessory; No deviceType defined.`);
      this.cleanup(); // Stop active polling if accessory is invalid
      return;
    }
  
    if (this.deviceType === 'Switch' && !(this.urlON || this.mqttBroker)) {
      this.platform.log.warn(`${this.deviceName}: Ignoring accessory; Missing required configuration.`);
      this.cleanup(); // Stop active polling if configuration is invalid - needs better handling
      return;
    }
  
    // Configure Accessory Information and Services for valid configurations
    if (this.deviceType === 'Switch' && (this.urlON || this.mqttBroker)) {
      // Set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);
  
      // Add or get the Switch service
      this.service = this.accessory.getService(this.platform.Service.Switch) || this.accessory.addService(this.platform.Service.Switch);
      this.service.setCharacteristic(this.platform.Characteristic.Name, this.deviceName);
  
      // Configure HTTP-based state changes
      if ( this.urlON ) {
        this.service.getCharacteristic(this.platform.Characteristic.On)
          .on('set', this.wrapSetHandler())
          .on('get', this.wrapGetHandler('On'));
      }
  
      // Configure MQTT if provided
      if (this.mqttBroker) {
        this.initMQTT(); // Initialize MQTT functionality
        this.service.getCharacteristic(this.platform.Characteristic.On)
          .on('set', this.publishMQTTmessage.bind(this)); // Publish MQTT messages when state changes
      }
    }
  }

  private wrapGetHandler(state: keyof typeof this.switchStates): (callback: (error: Error | null, value?: CharacteristicValue) => void) => void {
    return (callback) => {
      if (!this.isReachable) {
        callback(new this.platform.api.hap.HapStatusError(
          this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
        ));
        return;
      }

      callback(null, this.switchStates[state]);
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

      this.setOn(value, callback);
    };
  }
  
  private updateSwitchState(isOn: boolean, deviceName: string): void {
    if (this.switchStates.On !== isOn) {
      this.switchStates.On = isOn;
      if ( this.enableLogging ) {
        this.platform.log.info(`${deviceName}: Switch is ${isOn ? 'ON' : 'OFF'}`);
      }
      this.service.updateCharacteristic(this.platform.Characteristic.On, isOn);
    }
  }

  private updateSwitchStatusFromSharedData( data?: Record<string, unknown> ): void {
    this.processSwitchGetData(data, true);
  }

  private async startIndividualPolling() {
    if (!this.urlStatus) {
      this.platform.log.warn(`${this.deviceName}: Ignoring request; No status URL defined.`);
      return;
    }
  
    try {
      this.isReachable = true; // ✅ Mark as reachable
      const response = await axios.get(this.urlStatus, { timeout: 8000 });
      const data = response.data;
  
      this.platform.log.debug(`${this.deviceName}: Fetched JSON data:`, data);
      this.processSwitchGetData(data, false);
    } catch (error) {
      this.isReachable = false; // ❌ Mark as unreachable
      if ( this.enableLogging ) {
        const axiosError = error as AxiosError;
        if ( axios.isAxiosError(axiosError) ) {
          this.platform.log.warn(`${this.deviceName}: Axios error while fetching JSON:`, axiosError.message);
        } else {
          this.platform.log.warn(`${this.deviceName}: Unknown error occurred while fetching JSON.`);
        }
      }
    }
  }  
  
  private processSwitchGetData( data: Record<string, unknown> | undefined, isSharedData: boolean ): void {
    if (!data) {
      this.platform.log.warn(`${this.deviceName}: No data available for ${isSharedData ? 'shared data update' : 'fetching Switch state'}.`);
      return;
    }

    // Check if we have value
    if ( this.statusStateParam && hasNestedKey(data, this.statusStateParam) ) {
      // Proceed with processing the data
      const value = getNestedValue(data, this.statusStateParam, 'string'); // Adjust returnType as needed
      const valueType = typeof value;

      // Convert statusOnCheck and statusOffCheck to the appropriate type
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

      // Check and update switch state
      if (value === statusOnCheck) {
        this.updateSwitchState(true, this.deviceName);
      } else if (value === statusOffCheck) {
        this.updateSwitchState(false, this.deviceName);
      } else {
        this.platform.log.warn(this.deviceName, `: The value of ${this.statusStateParam} does not match statusOnCheck or statusOffCheck.`);
      }
    } else {
      this.platform.log.warn(this.deviceName, ': Error: Cannot find KEY:', this.statusStateParam, 'in JSON');
    }
  }

  private cleanup(): void {
    const device = this.accessory.context.device;
    this.platform.log.info(`Cleaning up device: ${device.deviceName}`); // Example usage of 'device'
  
    // Cleanup shared polling
    if (this.sharedPolling && this.sharedPollingId) {
      if (this.sharedPollingInstance) {
        SharedPolling.unregisterPolling(this.sharedPollingId);
        this.sharedPollingInstance = undefined; // Ensure this instance doesn't retain a reference
        this.platform.log.info(`${device.deviceName}: Unregistered shared polling.`);
      } else {
        this.platform.log.info(`${device.deviceName}: No shared polling instance to cleanup.`);
      }
    }
  
    // Cleanup individual polling
    if (this.individualPollingInterval) {
      clearInterval(this.individualPollingInterval);
      this.individualPollingInterval = undefined;
      if (this.enableLogging) {
        this.platform.log.info(`${device.deviceName}: Stopped individual polling.`);
      }
    }
  }

  /**
 * Handles "SET" requests from HomeKit.
 * This method is triggered when the user changes the state of a switch.
 */
  private async setOn(value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {
    this.switchStates.On = value as boolean;

    if (!this.urlON || !this.urlOFF) {
      this.platform.log.warn(`${this.deviceName}: Ignoring request; No Switch trigger URL defined.`);
      callback(new Error('No Switch trigger URL defined.'));
      return;
    }

    // Determine the URL to use based on the state
    this.url = this.switchStates.On ? this.urlON : this.urlOFF;
    this.platform.log.debug(`${this.deviceName}: Setting power state to ${this.switchStates.On ? 'ON' : 'OFF'}`);

    // Update characteristic
    this.service.updateCharacteristic(this.platform.Characteristic.On, this.switchStates.On);

    try {
      this.isReachable = true; // ✅ Mark as reachable
      // Send the HTTP request to trigger the switch state
      await axios.get(this.url);

      // If Discord Webhook is enabled, send status update
      if (this.discordWebhook) {
        this.initDiscordWebhooks();
      }

      // Log the success if logging is enabled
      if (this.enableLogging) {
        this.platform.log.info(`Success: Switch ${this.deviceName} is ${this.switchStates.On ? 'ON' : 'OFF'}`);
      }

      callback(null); // Indicate success to HomeKit
    } catch (error) {
      this.isReachable = false; // ❌ Mark as unreachable
      // Handle errors and revert the switch state
      const errorMessage = (error as AxiosError).message;
      this.switchStates.On = !this.switchStates.On; // Revert state
      this.service.updateCharacteristic(this.platform.Characteristic.On, this.switchStates.On);
      this.platform.log.warn(`${this.deviceName}: Error setting power state: ${errorMessage}`);

      callback(new Error(errorMessage)); // Indicate error to HomeKit
    }
  }

  private initMQTT(): void {
    const mqttSubscribedTopics: string[] = [];
  
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
  
    if (this.mqttSwitch) {
      mqttSubscribedTopics.push(this.mqttSwitch);
    }
  
    this.mqttClient = mqtt.connect(mqttOptions);
  
    this.mqttClient.on('connect', () => {
      this.isReachable = true; // ✅ Mark as reachable
      if (this.enableLogging) {
        this.platform.log.info(`${this.deviceName}: MQTT Connected`);
      }
      this.mqttClient.subscribe(mqttSubscribedTopics, (err) => {
        if (!err) {
          this.platform.log.info(`${this.deviceName}: Subscribed to topics - ${mqttSubscribedTopics.toString()}`);
        } else {
          this.platform.log.warn(`${this.deviceName}: MQTT subscription error - ${err.message}`);
        }
      });
    });
  
    this.mqttClient.on('message', (topic, message) => {
      if (topic === this.mqttSwitch) {
        this.platform.log.info(`${this.deviceName}: MQTT message received - ${message.toString()}`);
        this.switchStates.On = message.toString() === '1' || message.toString() === 'true';
        this.service.updateCharacteristic(this.platform.Characteristic.On, this.switchStates.On);
  
        if (this.discordWebhook) {
          this.initDiscordWebhooks();
        }
      }
    });
  
    this.mqttClient.on('error', (err) => {
      this.isReachable = false; // ❌ Mark as unreachable
      this.platform.log.warn(`${this.deviceName}: MQTT connection error - ${err.message}`);
      this.platform.log.warn(`${this.deviceName}: Attempting reconnection in ${this.mqttReconnectInterval} seconds`);
    });

    // Additional event handlers for connection state
    this.mqttClient.on('offline', () => {
      this.isReachable = false;
      this.platform.log.debug(this.deviceName, ': Client is offline');
    });

    this.mqttClient.on('reconnect', () => {
      this.platform.log.debug(this.deviceName, ': Reconnecting...');
    });

    this.mqttClient.on('close', () => {
      this.isReachable = false;
      this.platform.log.debug(this.deviceName, ': Connection closed');
    });
  }

  private publishMQTTmessage(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    const message = String(Number(value));
    this.mqttClient.publish(this.mqttSwitch, message, { qos: 1, retain: true }, (err) => {
      if (err) {
        this.platform.log.warn(`${this.deviceName}: Failed to publish MQTT message - ${err.message}`);
      } else {
        this.platform.log.info(`${this.deviceName}: MQTT message published successfully - ${message}`);
      }
      callback(null);
    });
  }

  private initDiscordWebhooks(): void {
    const message = `${this.deviceName}: ${this.discordMessage} ${this.switchStates.On ? 'ON' : 'OFF'}`;
    const discord = new discordWebHooks(this.discordWebhook, this.discordUsername, this.discordAvatar, message);
  
    discord.discordSimpleSend().then((result) => {
      this.platform.log.info(`${this.deviceName}: Discord Webhook result - ${result}`);
    }).catch((error) => {
      this.platform.log.warn(`${this.deviceName}: Discord Webhook error - ${error.message}`);
    });
  }
}
