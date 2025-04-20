import { CharacteristicSetCallback, CharacteristicValue, PlatformAccessory, Service, Characteristic, WithUUID } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import { SharedPolling, SharedData } from './lib/SharedPolling.js';        // Include shared polling library
import { getNestedValue } from './lib/utilities.js';                       // Include utility function for nested value retrieval
import { discordWebHooks } from './lib/discordWebHooks.js';                // Include Discord webhook library
import { deviceConfig } from './platformGenericDeviceSettings.js';         // Include device settings

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions } from 'mqtt';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformGenericDevice {
  public service!: Service;
  public mqttClient!: mqtt.MqttClient;
  private sharedPollingInstance?: SharedPolling;

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

  public urlStatus: string = '';
  public urlDeviceControl: string = '';
  public methodUpdate: boolean = false;

  public mqttReconnectInterval: string = '';
  public mqttBroker: string = '';
  public mqttPort: string = '';
  public mqttUsername: string = '';
  public mqttPassword: string = '';

  public discordWebhook: string = '';
  public discordUsername: string = '';
  public discordAvatar: string = '';
  public discordMessage: string = '';

  public paramNames: Record<string, string> = {};
  public mqttTopics: Record<string, string> = {};
  public DeviceStates: Record<string, number> = {};
  public DeviceStatusRanges: Record<string, [number, number]> = {};

  constructor(
    public readonly platform: HttpSensorsAndSwitchesHomebridgePlatform,
    public readonly accessory: PlatformAccessory,
  ) {
    const device = this.accessory.context.device;

    this.deviceType = device.deviceType;
    this.deviceName = device.deviceName || 'NoName';
    this.deviceManufacturer = device.deviceManufacturer || 'Stergo';
    this.deviceModel = device.deviceModel || 'Fan';
    this.deviceSerialNumber = device.deviceSerialNumber || accessory.UUID;
    this.deviceFirmwareVersion = device.deviceFirmwareVersion || '0.0';

    // From Config
    this.enableLogging = device.enableLogging;

    this.urlStatus = device.urlStatus;
    this.urlDeviceControl = device.urlDeviceControl;
    this.methodUpdate = device.methodUpdate;
    
    this.mqttReconnectInterval = device.mqttReconnectInterval || 60; // 60 sec default
    this.mqttBroker = device.mqttBroker;
    this.mqttPort = device.mqttPort;
    this.mqttUsername = device.mqttUsername;
    this.mqttPassword = device.mqttPassword;

    this.discordWebhook = device.discordWebhook;
    this.discordUsername = device.discordUsername || 'StergoSmart';
    this.discordAvatar = device.discordAvatar || 'https://raw.githubusercontent.com/homebridge/branding/latest/logos/homebridge-color-round-stylized.png';
    this.discordMessage = device.discordMessage;

    // Check if deviceType is set and if configuration exists for the current deviceType
    if (!this.deviceType) {
      this.platform.log.warn('Device type is NOT SET.');
      return;
    }
    const config = deviceConfig[this.deviceType as keyof typeof deviceConfig];
    if ( !config ) {
      this.platform.log.warn(`Device type ${this.deviceType} is not supported.`);
      return;
    }
    // --------------------------------------------------------------------------------

    // Initialize paramNames and mqttTopics dynamically
    config.paramNames.forEach((paramNameKey) => {
      // Explicitly cast paramNameKey to a valid key of config.states
      
      const paramKey = `paramName${config.states[paramNameKey as keyof typeof config.states]?.param}`; // Add "paramName" prefix
      if (!paramKey) {
        this.platform.log.warn(`Param not found for ${paramNameKey} in states.`);
        return;
      }
    
      const paramValue = device[paramKey as keyof typeof device]?.toString() || '';
      this.platform.log.debug(`Param Key: ${paramKey}, Value: ${paramValue}`);
      this.paramNames[paramNameKey] = paramValue;
    
      // Populate mqttTopics dynamically (using "mqtt" prefix for keys)
      const deviceMqttKey = `mqtt${config.states[paramNameKey as keyof typeof config.states]?.topic}`; // Add "paramName" prefix
      const mqttValue = device[deviceMqttKey as keyof typeof device]?.toString() || '';
      this.platform.log.debug(`MQTT Key: ${deviceMqttKey}, Value: ${mqttValue}`);
      this.mqttTopics[paramNameKey] = mqttValue;
    });

    // Initialize DeviceStates and DeviceStatusRanges dynamically
    Object.entries(config.sensors).forEach(([sensorKey, deviceConfig]) => {
      this.DeviceStates[sensorKey] = deviceConfig.defaultValue;
      this.DeviceStatusRanges[sensorKey] = deviceConfig.range;
    });
    // ---------------------------------------------------------------------------------

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
        this.updateDeviceStatusFromSharedData(data);
      });
    } else if (this.urlStatus) {
      this.getDeviceState();
      setInterval(this.getDeviceState.bind(this), 5000);
    }  

    if ( this.urlStatus || this.mqttBroker ) {
      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);

      // Define a mapping between device types and their corresponding services
      const serviceMappings: Record<string, WithUUID<typeof Service>> = {
        Fan: this.platform.Service.Fanv2,
        GarageDoorOpener: this.platform.Service.GarageDoorOpener,
        Window: this.platform.Service.Window,
        WindowCovering: this.platform.Service.WindowCovering,
        // Add more sensors as needed
      };

      const serviceConstructor = serviceMappings[this.deviceType];
      if (!serviceConstructor) {
        throw new Error(`Unsupported device type: ${this.deviceType}`);
      }

      // Dynamically create or retrieve the service instance
      this.service = this.accessory.getService(serviceConstructor)
         || this.accessory.addService(new serviceConstructor(this.deviceName, this.deviceSerialNumber));      

      // Set the service name, this is what is displayed as the default name on the Home app
      this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);
         
      if ( this.urlDeviceControl || this.urlStatus ) {
        // Register handlers for the characteristics
        this.getStateDefinition().forEach(({ state, param, setHandler }) => {
          const characteristic = this.platform.Characteristic[state as
            keyof typeof this.platform.Characteristic] as unknown as WithUUID<new () => Characteristic>;
          if ( param ) { // Ensure the parameter is valid
            if (setHandler) {
              this.service.getCharacteristic(characteristic)
                .on('set', this.setDeviceState.bind(this, state)); // Bind the 'set' handler dynamically
            }
            this.service
              .getCharacteristic(characteristic)
              .on('get', (callback) => {
                callback(null, this.DeviceStates[state]); // Use correct state reference
              });
          }
        });
      }
    
      // We can now use MQTT
      if ( this.mqttBroker ) {
        this.initMQTT();
        this.getStateDefinition().forEach(({ state, topic, setHandler }) => {
          if ( topic && setHandler ) { // Ensure topic is valid and setHandler is enabled
            const characteristic = this.platform.Characteristic[state as
               keyof typeof this.platform.Characteristic] as unknown as WithUUID<new () => Characteristic>;
            this.service.getCharacteristic(characteristic)
              .on('set', (value, callback) => {
              // Dynamically bind the publishMQTTmessage for each state
                this.publishMQTTmessage(state, value, callback);
              });
          }
        });
      }
    }
  }

  private getStateDefinition() {
    const config = deviceConfig[this.deviceType as keyof typeof deviceConfig]?.states;
    if (!config) {
      this.platform.log.warn(`${this.deviceName}: No configuration found for device type: ${this.deviceType}`);
    }
    
    return Object.entries(config).map(([state, stateConfig]) => ({
      state,
      param: this.paramNames[state],
      topic: this.mqttTopics[state],
      webhook: stateConfig.webhook,
      setHandler: stateConfig.setHandler,
    }));
  }  

  // Silly function :)
  private getStatus(isOn: boolean): string {
    return isOn ? 'ON' : 'OFF';
  }

  private updateDeviceStatusFromSharedData( data?: Record<string, unknown> ): void {
    this.processGetDeviceStatusData(data, true);
  }

  private async getDeviceState(): Promise<void> {
    if (!this.urlStatus) {
      this.platform.log.warn(this.deviceName, ': Ignoring request; No status URL defined.');
      return;
    }

    try {
      const response = await axios.get(this.urlStatus, { timeout: 8000 });
      const data = response.data;
  
      //this.platform.log.debug(`${this.deviceName}: Fetched JSON data:`, data);
      this.processGetDeviceStatusData(data, false);
  
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axios.isAxiosError(axiosError)) {
        this.platform.log.warn(`${this.deviceName}: Axios error while fetching JSON:`, axiosError.message);
      } else {
        this.platform.log.warn(`${this.deviceName}: Unknown error occurred while fetching JSON.`);
      }
    }
  }

  private processGetDeviceStatusData(data: Record<string, unknown> | undefined, isSharedData: boolean): void {
    if (!data) {
      this.platform.log.warn(`${this.deviceName}: No data available for ${isSharedData ? 'shared data update' : 'fetching Switch state'}.`);
      return;
    }

    // Log fetched data for debugging
    // this.platform.log.debug(`${this.deviceName}: Fetched JSON data:`, data);

    this.getStateDefinition().forEach(({ state, param, webhook }): void => {
      if ( !param ) {
        if ( this.enableLogging ) { 
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
  
      const range = this.DeviceStatusRanges[state];
  
      if (
        Array.isArray(range) && range.length === 2 && 
        typeof range[0] === 'number' && typeof range[1] === 'number' &&
        value >= range[0] && value <= range[1]
      ) {
        if (this.enableLogging && this.DeviceStates[state] !== value) {
          this.platform.log.info(`${this.deviceName}: ${state} SET to: ${value}`);
          if ( this.discordWebhook && webhook ) {
            this.initDiscordWebhooks(state);
          }
        }
  
        this.DeviceStates[state] = value;
       
        const characteristic = this.platform.Characteristic[state as
          keyof typeof this.platform.Characteristic] as unknown as WithUUID<new () => Characteristic>;
        this.service.updateCharacteristic( characteristic, value );
  
      } else if ( this.enableLogging ) {
        this.platform.log.warn(`${this.deviceName}: Received invalid ${state} value: ${value} (valid range: ${range[0]} to ${range[1]}).`);
      }
    });    
  }

  private async setDeviceState( what: keyof typeof this.DeviceStates, value: CharacteristicValue, callback: CharacteristicSetCallback ): Promise<void> {
    
    const previousValue = this.DeviceStates[what]; // Save the current state value
    this.DeviceStates[what] = value as number; // Update the state dynamically
  
    try {
      const url = this.urlDeviceControl; // Base URL for fan control
      if (!url) {
        this.platform.log.warn(this.deviceName, ': No Fan control URL defined.');
        //callback(new Error('No Fan control URL defined.'));
        this.DeviceStates[what] = previousValue; // Revert to the previous state
        return;
      }
  
      const characteristicDefinition = this.getStateDefinition().find((def) => def.state === what);
      if (!characteristicDefinition) {
        this.platform.log.warn(this.deviceName, `: Unknown fan state: ${what}`);
        //callback(null);
        this.DeviceStates[what] = previousValue; // Revert to the previous state
        return;
      }
  
      const { state, param, topic } = characteristicDefinition;
  
      if (!param) {
        this.platform.log.warn(this.deviceName, `: Ignoring request; No parameter defined for ${state}.`);
        //callback(new Error(`No parameter defined for ${state}.`));
        this.DeviceStates[what] = previousValue; // Revert to the previous state
        return;
      }
  
      // Determine HTTP method based on methodUpdate (true = GET, false = POST)
      const method: 'POST' | 'GET' = this.methodUpdate ? 'GET' : 'POST';
  
      // Logging the characteristic value change
      this.platform.log.debug(this.deviceName, `: Setting ${state} to:`, value);
  
      // Update HomeKit characteristic
      const characteristic = this.platform.Characteristic[state as
         keyof typeof this.platform.Characteristic] as unknown as WithUUID<new () => Characteristic>;
      this.service.updateCharacteristic(characteristic, value);
  
      // Construct URL for GET requests with only the updated value
      const modifiedUrl = method === 'GET' ? `${url}?${param}=${encodeURIComponent(value as number)}` : url;
      this.platform.log.debug(this.deviceName, `: Setting ${state} URL:`, modifiedUrl);
      // Prepare Axios request options
      const axiosOptions = {
        method,
        url: modifiedUrl, // Use the modified URL for GET requests
        headers: {
          'Content-Type': 'application/json',
        },
        ...(method === 'POST' && { data: { [param]: this.DeviceStates[state] } }), // Include data only for POST
      };
  
      // Make Axios request
      await axios(axiosOptions);
  
      // Handle optional MQTT topic publishing
      if ( topic && this.mqttClient ) {
        this.mqttClient.publish(topic, String(value), { qos: 1, retain: true }, (err) => {
          if (err && this.enableLogging) {
            this.platform.log.warn(this.deviceName, `: Failed to publish MQTT message for ${state}:`, err.message);
          } else if (this.enableLogging) {
            this.platform.log.debug(this.deviceName, `: MQTT message published for ${state} successfully.`);
          }
        });
      }
  
      // Initialize Discord Webhook if configured
      if (this.discordWebhook) {
        this.initDiscordWebhooks(state);
      }
  
      // Log success and call callback
      callback(null);
      if (this.enableLogging) {
        this.platform.log.info('Success: Fan ', this.deviceName, ` is: ${this.getStatus(!!this.DeviceStates[what])}`);
      }
    } catch (error) {
      // Handle errors: Revert state and log the issue
      this.DeviceStates[what] = previousValue; // Revert to the previous state
      if (error instanceof Error) {
        this.platform.log.warn(this.deviceName, `: Axios error for ${what}:`, error.message);
      } else {
        this.platform.log.warn(this.deviceName, `: An unknown error occurred while setting ${what}.`);
      }
      callback(error as Error); // Notify failure
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

    // Handle incoming messages
    this.mqttClient.on('message', (topic, message) => {
      this.getStateDefinition().forEach(({ state, topic: stateTopic }) => {
        if (stateTopic === topic) { // Match incoming topic
          const value = message.toString();
          let newValue;

          // Handle binary and numeric ranges dynamically
          const [min, max] = this.DeviceStatusRanges[state];
          if (min === 0 && max === 1) {
            newValue = ['1', 'true'].includes(value) ? 1 : 0; // Binary range
          } else {
            newValue = Number(value); // Numeric range
          }

          // Validate against fanStatusRanges
          if ( newValue >= min && newValue <= max ) {
            if ( this.enableLogging && this.DeviceStates[state] !== newValue ) {
              this.platform.log.info(`${this.deviceName}: ${state} set to: ${newValue}`);
            }
            this.DeviceStates[state] = newValue; // Update state value
            // Update Homebridge characteristic
            const characteristic = this.platform.Characteristic[state as 
                keyof typeof this.platform.Characteristic] as unknown as WithUUID<new () => Characteristic>;
            this.service.updateCharacteristic(characteristic, newValue);
            
            
          } else {
            if (this.enableLogging) {
              this.platform.log.warn(`${this.deviceName}: Invalid value for ${state}: ${newValue} (must be between ${min} and ${max})`);
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

  private publishMQTTmessage(
    what: keyof typeof this.DeviceStates,
    value: CharacteristicValue,
    callback: CharacteristicSetCallback,
  ): void {
    const definition = this.getStateDefinition().find(({ state }) => state === what);
  
    if (!definition || !definition.topic) {
      // Log warning if no matching definition or topic is found
      this.platform.log.warn(`${this.deviceName}: No valid topic for state: ${what}`);
      callback(new Error(`No valid topic for state: ${what}`));
      return;
    }
  
    const topic = definition.topic; // Use topic from definition
    const message = String(value); // Convert value to a string for publishing
  
    if (this.enableLogging) {
      this.platform.log.info(`${this.deviceName}: Publishing ${what} to topic ${topic} with value: ${message}`);
    }
  
    // Publish MQTT message
    this.mqttClient.publish(topic, message, { qos: 1, retain: true }, (err) => {
      if (err) {
        this.platform.log.warn(`${this.deviceName}: Failed to publish message for ${what}:`, err);
      } else {
        this.platform.log.debug(`${this.deviceName}: Message for ${what} published successfully`);
      }
    });
  
    // Callback to indicate success
    callback(null);
  }  
  
  private initDiscordWebhooks(state: keyof typeof this.DeviceStates): void {
    // Prepare a dynamic message including the passed state
    const message = `${this.deviceName}: ${state} - ${this.discordMessage} ${this.getStatus(!!this.DeviceStates[state])}`;
    const discord = new discordWebHooks(this.discordWebhook, this.discordUsername, this.discordAvatar, message);

    discord.discordSimpleSend().then((result) => {
      if ( this.enableLogging ) {
        this.platform.log.info(`${this.deviceName}: Webhook sent successfully - `, result);
      }
    }).catch((error) => {
      if ( this.enableLogging ) {
        this.platform.log.warn(`${this.deviceName}: Failed to send webhook - `, error.message);
      }
    });
  }
}