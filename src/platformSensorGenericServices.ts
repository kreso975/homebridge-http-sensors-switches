import { PlatformAccessory, Service, Characteristic, WithUUID } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions } from 'mqtt';

import { SharedPolling } from './lib/SharedPolling.js';       // Include shared polling library
import { discordWebHooks } from './lib/discordWebHooks.js';
import { getNestedValue } from './lib/utilities.js';
import { sensorConfig } from './platformSensorGenericSettings.js';

interface SensorService {
   paramNames: Record<string, string>;
   mqttTopics: Record<string, string>;
 }
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformSensorGeneric {
  public sensorService!: Service;
  public mqttClient!: mqtt.MqttClient;
  private sharedPollingInstance?: SharedPolling;

  public enableLogging: boolean = true;
  // Ensure backward compatibility for shared polling
  public sharedPolling = false; // Default to false
  public sharedPollingId = ''; // Default to empty

  public deviceId: string = '';
  public deviceType: string = '';
  public deviceName: string = '';
  public deviceManufacturer: string = '';
  public deviceModel: string = '';
  public deviceSerialNumber: string = '';
  public deviceFirmwareVersion: string = '';
  
  public urlStatus: string = '';

  public mqttReconnectInterval: string = '';
  public mqttBroker: string = '';
  public mqttPort: string = '';
  public mqttUsername: string = '';
  public mqttPassword: string = '';

  public updateInterval = 60000;

  public discordWebhook: string = '';
  public discordUsername: string = '';
  public discordAvatar: string = '';
  public discordMessage: string = '';

  public paramNames: Record<string, string> = {};
  public mqttTopics: Record<string, string> = {};
  public SensorStates: Record<string, number> = {};
  public SensorStatusRanges: Record<string, [number, number]> = {};

  constructor(
    public readonly platform: HttpSensorsAndSwitchesHomebridgePlatform,
    public readonly accessory: PlatformAccessory,
  ) {
    const device = this.accessory.context.device;

    this.deviceType = device.deviceType;
    this.deviceName = device.deviceName || 'NoName';
    this.deviceManufacturer = device.deviceManufacturer || 'Stergo';
    this.deviceModel = device.deviceModel || 'Sensor';
    this.deviceSerialNumber = device.deviceSerialNumber || accessory.UUID;
    this.deviceFirmwareVersion = device.deviceFirmwareVersion || '0.0';

    // Set general properties
    this.enableLogging = device.enableLogging;
    this.urlStatus = device.urlStatus;
    this.updateInterval = device.updateInterval || 60000;

    // Validate and retrieve sensor configuration
    const config = sensorConfig[this.deviceType as keyof typeof sensorConfig];
    if (!config) {
      throw new Error(`Unsupported deviceType: ${this.deviceType}`);
    }

    // Initialize sensor properties from paramNames and mqttTopics
    this.initializeProperties(config, device);

    // Initialize sensor states and ranges
    this.SensorStates = { ...config.SensorStates };
    this.SensorStatusRanges = { ...config.SensorStatusRanges };

    this.discordWebhook = device.discordWebhook;
    this.discordUsername = device.discordUsername || 'StergoSmart';
    this.discordAvatar = device.discordAvatar
      || 'https://raw.githubusercontent.com/homebridge/branding/latest/logos/homebridge-color-round-stylized.png';
    this.discordMessage = device.discordMessage;

    // Ensure backward compatibility for shared polling
    this.sharedPolling = device.sharedPolling ?? false; // Default shared polling to false
    this.sharedPollingId = device.sharedPollingId ?? ''; // Default shared polling group ID to an empty string

    if (this.sharedPolling && this.sharedPollingId) {
      // Register the shared polling instance for the group
      const sharedPollingInstance = SharedPolling.registerPolling(
        this.sharedPollingId,
        this.urlStatus, // URL shared by multiple devices
        this.platform, // Pass the entire platform instance
      );
    
      // Periodically fetch shared data and update device state
      setInterval(() => {
        const data = sharedPollingInstance?.getData();
        if (data) {
          this.updateSensorStatusFromSharedData(data);
        }
      }, 10000); // Poll every 10 seconds
    } else if (this.urlStatus) {
      // Fallback to individual polling if shared polling is not enabled
      this.getSensorState();
      setInterval(this.getSensorState.bind(this), this.updateInterval);
    }

    if (!this.deviceType) {
      return;
    }

    // Initialize accessory information and services
    if (this.deviceType === 'CarbonDioxideSensor' && (this.urlStatus || this.mqttBroker)) {
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);

      if (this.urlStatus || this.mqttBroker) {
        // Retrieve the correct Service class dynamically
        const ServiceClass = this.platform.Service[`${this.deviceType}`];
        if (!ServiceClass) {
          this.platform.log.error(`Service type not found for deviceType: ${this.deviceType}`);
          return;
        }
       
        // Use the Service class to create or get the appropriate service instance
        this.sensorService = this.accessory.getService(ServiceClass)
           || this.accessory.addService(ServiceClass);
       
        this.sensorService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);
       
        if (this.urlStatus) {
          // Get the valid characteristic keys dynamically
          const validCharacteristicKeys = Object.keys(this.platform.Characteristic) as Array<keyof typeof this.platform.Characteristic>;
       
          this.getStateDefinition().forEach(({ state, param }) => {
            if (param) {
              // Validate that state is in validCharacteristicKeys
              if (!validCharacteristicKeys.includes(state as keyof typeof this.platform.Characteristic)) {
                this.platform.log.warn(`${state} is not a valid characteristic for ${this.deviceType}`);
                return;
              }
       
              // Cast state to the correct type for characteristics
              const characteristic = this.platform.Characteristic[state as
                keyof typeof this.platform.Characteristic] as unknown as WithUUID<new () => Characteristic>;
       
              this.sensorService.getCharacteristic(characteristic).on('get', (callback) => {
                callback(null, this.SensorStates[state]);
              });
            }
          });
        }
       
        if (this.mqttBroker) {
          this.initMQTT();
        }
      }
       
    }
  }

  // Silly function :)
  private getStatus(isOn: boolean): string {
    return isOn ? 'ON' : 'OFF';
  }

  /**
   * Dynamically initialize properties for paramNames and mqttTopics
   */
  private initializeProperties(
    config: SensorService,
    device: Record<string, string | number>,
  ): void {
    Object.entries(config.paramNames).forEach(([key, defaultValue]) => {
      this.paramNames[key] = device[key as keyof typeof device]?.toString() || defaultValue;
    });

    Object.entries(config.mqttTopics).forEach(([key, defaultValue]) => {
      this.mqttTopics[key] = device[key as keyof typeof device]?.toString() || defaultValue;
    });
  }

  private getStateDefinition(): { state: string; param: string; topic: string; webhook: boolean; control: number }[] {
    // Retrieve the configuration for the current device type
    const config = sensorConfig[this.deviceType as keyof typeof sensorConfig];
    if (!config) {
      throw new Error(`Unsupported deviceType: ${this.deviceType}`);
    }
 
    // Dynamically map the states using `paramNames`, `mqttTopics`, and `SensorStates`
    return Object.keys(config.SensorStates).map((stateKey) => {
      const key = stateKey as keyof typeof config.SensorStatusRanges;
    
      return {
        state: stateKey,
        param: this.paramNames[`paramName${stateKey}`] || '',
        topic: this.mqttTopics[`mqtt${stateKey}`] || '',
        webhook: config.SensorStatusRanges[key]?.length > 0, // Example logic
        control: 0, // Default control
      };
    });
    
  }

  private processSensorState(data: Record<string, unknown> | undefined, isSharedData: boolean): void {
    if (!data) {
      this.platform.log.warn(`${this.deviceName}: No data available for ${isSharedData ? 'shared data update' : 'fetching Occupancy state'}.`);
      return;
    }
 
    this.getStateDefinition().forEach(({ state, param, webhook }): void => {
      if (!param) {
        if (this.enableLogging) {
          this.platform.log.debug(`${this.deviceName}: Parameter for ${state} is not configured. Skipping.`);
        }
        return;
      }
 
      const rawValue = getNestedValue(data, param, 'number');
      let value: number | undefined;
 
      if (typeof rawValue === 'number') {
        value = rawValue;
      } else if (typeof rawValue === 'boolean') {
        value = rawValue ? 1 : 0; // Convert boolean to number
      } else {
        value = undefined; // Treat invalid types as undefined
      }
 
      if (value === undefined) {
        if (this.enableLogging) {
          this.platform.log.warn(`${this.deviceName}: Parameter '${param}' not found in JSON for state ${state}.`);
        }
        return;
      }
 
      const range = this.SensorStatusRanges[state];
      if (
        Array.isArray(range) &&
       range.length === 2 &&
       typeof range[0] === 'number' &&
       typeof range[1] === 'number' &&
       value >= range[0] &&
       value <= range[1]
      ) {
        if (this.enableLogging) {
          if (this.SensorStates[state] !== value) {
            this.platform.log.info(`${this.deviceName}: ${state} - [${this.SensorStates[state]}] SET to: ${value}`);
          }
        }
 
        this.SensorStates[state] = value;
 
        // Dynamically resolve the characteristic
        const characteristic = this.platform.Characteristic[state as keyof typeof this.platform.Characteristic] as WithUUID<new () => Characteristic>;
 
        // Update the characteristic
        this.sensorService.updateCharacteristic(characteristic, value);
 
        if (webhook && value === 1) {
          this.initDiscordWebhooks(state);
        }
      } else if (this.enableLogging) {
        this.platform.log.warn(`${this.deviceName}: Received invalid ${state} value: ${value} (valid range: ${range[0]} to ${range[1]}).`);
      }
    });
  }
 
  
  private updateSensorStatusFromSharedData( data?: Record<string, unknown> ): void {
    this.processSensorState(data, true);
  }
  
  private async getSensorState(): Promise<void> {
    if (!this.urlStatus) {
      this.platform.log.warn(`${this.deviceName}: Ignoring request; No status URL defined.`);
      return;
    }
  
    try {
      const response = await axios.get(this.urlStatus, { timeout: 8000 });
      const data = response.data;
  
      this.platform.log.debug(`${this.deviceName}: Fetched JSON data:`, data);
      this.processSensorState(data, false);
  
      this.platform.log.debug(`${this.deviceName}: Occupancy states updated to:`, this.SensorStates);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axios.isAxiosError(axiosError)) {
        this.platform.log.warn(`${this.deviceName}: Axios error while fetching Occupancy state:`, axiosError.message);
      } else {
        this.platform.log.warn(`${this.deviceName}: Unknown error occurred while fetching Occupancy state.`);
      }
    }
  }
  
  private initMQTT() {
    // Define an empty array to hold the subscribed topics
    const mqttSubscribedTopics: string | string[] | mqtt.ISubscriptionMap = [];
  
    // Prepare MQTT connection options
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
  
    // Use getStateDefinition to dynamically fetch topics and push them into the array
    this.getStateDefinition().forEach(({ topic }) => {
      if (typeof topic === 'string' && topic.trim().length > 0) {
        mqttSubscribedTopics.push(topic); // Push valid topic
      }
    });
  
    // Initialize MQTT client
    this.mqttClient = mqtt.connect( mqttOptions);
          
    this.mqttClient.on('connect', () => {
      if ( this.enableLogging) {
        this.platform.log.info(this.deviceName,': MQTT Connected');  
      }
      this.mqttClient.subscribe(mqttSubscribedTopics, (err) => {
        if (!err) {
          if ( this.enableLogging) {
            this.platform.log.info(this.deviceName,': Subscribed to: ', mqttSubscribedTopics.toString());
          }
        } else {
          // Need to insert error handler
          this.platform.log.warn(this.deviceName, err.toString());
        }
      });
    });
  
    // Handle incoming MQTT messages
    this.mqttClient.on('message', (topic, message) => {
      this.getStateDefinition().forEach(({ state, topic: stateTopic, webhook }) => {
        if (stateTopic === topic) { // Match incoming topic
          const value = message.toString();
          let newValue;

          // Handle binary and numeric ranges dynamically
          const [min, max] = this.SensorStatusRanges[state];
          if (min === 0 && max === 1) {
            newValue = ['1', 'true'].includes(value) ? 1 : 0; // Binary range
          } else {
            newValue = Number(value); // Numeric range
          }

          // Validate against SensorStatusRanges
          if (newValue >= min && newValue <= max) {
            this.SensorStates[state] = newValue; // Update state value

            if (this.enableLogging) {
              this.platform.log.info(`${this.deviceName}: ${state} set to: ${newValue}`);
            }

            // Update Homebridge characteristic
            const characteristic = this.platform.Characteristic[state as keyof typeof this.platform.Characteristic] as WithUUID<new () => Characteristic>;
            this.sensorService.updateCharacteristic(characteristic, newValue);

            // Trigger webhook if `webhook` is true and `newValue === 1`
            if (webhook && newValue === 1) {
              this.initDiscordWebhooks(state);
            }
          } else {
            if (this.enableLogging) {
              this.platform.log.warn(
                `${this.deviceName}: Invalid value for ${state}: ${newValue} (must be between ${min} and ${max})`,
              );
            }
          }
        }
      });
    });
  
    // Additional event handlers for connection state
    this.mqttClient.on('offline', () => {
      this.platform.log.debug(this.deviceName, ': Client is offline');
    });
  
    this.mqttClient.on('reconnect', () => {
      this.platform.log.debug(this.deviceName, ': Reconnecting...');
    });
  
    this.mqttClient.on('close', () => {
      this.platform.log.debug(this.deviceName, ': Connection closed');
    });
  
    // Enhanced error handling
    this.mqttClient.on('error', (err) => {
      this.platform.log.warn(this.deviceName, ': Connection error:', err);
      this.platform.log.warn(this.deviceName, ': Reconnecting in: ', this.mqttReconnectInterval, ' seconds.');
    });
  }

  private initDiscordWebhooks(state: keyof typeof this.SensorStates): void {
    // Prepare a dynamic message including the passed state
    const message = `${this.deviceName}: ${state} - ${this.discordMessage} ${this.getStatus(!!this.SensorStates[state])}`;
    const discord = new discordWebHooks(this.discordWebhook, this.discordUsername, this.discordAvatar, message);

    discord.discordSimpleSend().then((result) => {
      if (this.enableLogging) {
        this.platform.log.info(`${this.deviceName}: Webhook sent successfully - `, result);
      }
    }).catch((error) => {
      if (this.enableLogging) {
        this.platform.log.warn(`${this.deviceName}: Failed to send webhook - `, error.message);
      }
    });
  }

}
