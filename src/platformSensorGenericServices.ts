import { PlatformAccessory, CharacteristicValue, Service, Characteristic, WithUUID } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions } from 'mqtt';

import { SharedPolling, SharedData  } from './lib/SharedPolling.js';       // Include shared polling library
import { discordWebHooks } from './lib/discordWebHooks.js';
import { getNestedValue } from './lib/utilities.js';
import { sensorConfig } from './platformSensorGenericSettings.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformSensorGeneric {
  public sensorService!: Service;
  public mqttClient!: mqtt.MqttClient;
  private sharedPollingInstance?: SharedPolling;

  private isReachable: boolean = true; // Track if the device is reachable
  public enableLogging: boolean = true;
  // Ensure backward compatibility for shared polling
  public sharedPolling = false; // Default to false
  public sharedPollingId = ''; // Default to empty
  public sharedPollingInterval = 60000;

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
    
    // From Config
    this.enableLogging = device.enableLogging;

    this.urlStatus = device.urlStatus;
    this.updateInterval = device.updateInterval || 60000; // Default update interval is 300 seconds

    this.mqttReconnectInterval = device.mqttReconnectInterval || 60; // 60 sec default
    this.mqttBroker = device.mqttBroker;
    this.mqttPort = device.mqttPort;
    this.mqttUsername = device.mqttUsername;
    this.mqttPassword = device.mqttPassword;

    // Check if deviceType is set and if configuration exists for the current deviceType
    if (!this.deviceType) {
      this.platform.log.warn('Device type is NOT SET.');
      return;
    }
    const config = sensorConfig[this.deviceType as keyof typeof sensorConfig];
    if ( !config ) {
      this.platform.log.warn(`Device type ${this.deviceType} is not supported.`);
      return;
    }
    // --------------------------------------------------------------------------------
    // Read device configuration and initialize properties dynamically from Settings
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
      const deviceMqttKey = `mqtt${config.states[paramNameKey as keyof typeof config.states]?.topic}`; // Add "mqtt" prefix
      const mqttValue = device[deviceMqttKey as keyof typeof device]?.toString() || '';
      this.platform.log.debug(`MQTT Key: ${deviceMqttKey}, Value: ${mqttValue}`);
      this.mqttTopics[paramNameKey] = mqttValue;
    });

    // Initialize SensorStates and SensorStatusRanges dynamically
    Object.entries(config.sensors).forEach(([sensorKey, sensorConfig]) => {
      this.SensorStates[sensorKey] = sensorConfig.defaultValue;
      this.SensorStatusRanges[sensorKey] = sensorConfig.range;
    });
    // ---------------------------------------------------------------------------------

    this.discordWebhook = device.discordWebhook;
    this.discordUsername = device.discordUsername || 'StergoSmart';
    this.discordAvatar = device.discordAvatar
      || 'https://raw.githubusercontent.com/homebridge/branding/latest/logos/homebridge-color-round-stylized.png';
    this.discordMessage = device.discordMessage;

    // Ensure backward compatibility for shared polling
    this.sharedPolling = device.sharedPolling ?? false;                 // Default shared polling to false
    this.sharedPollingId = device.sharedPollingId ?? '';                // Default shared polling group ID to an empty string
    this.sharedPollingInterval = device.sharedPollingInterval ?? 60000; // Set the polling interval to 60 sec or from config value

    if (this.sharedPolling && this.sharedPollingId) {
      const sharedPollingInstance = SharedPolling.registerPolling(
        this.sharedPollingId,
        this.urlStatus,
        this.platform,
        this.sharedPollingInterval,                                     // Set the polling interval to 60 sec or from config value
      );
    
      // Subscribe to data updates
      sharedPollingInstance.on('dataUpdated', (data: SharedData) => {
        this.isReachable = true; // ✅ Mark as reachable
        this.updateSensorStatusFromSharedData(data);
      });

      sharedPollingInstance.on('dataError', () => {
        this.isReachable = false; // ❌ Mark as unreachable
      });
    } else if (this.urlStatus) {
      this.getSensorState();
      setInterval(this.getSensorState.bind(this), this.updateInterval);
    }    

    if ( this.urlStatus || this.mqttBroker ) {
      // Set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);

      // Define a mapping between device types and their corresponding services
      const serviceMappings: Record<string, WithUUID<typeof Service>> = {
        OccupancySensor: this.platform.Service.OccupancySensor,
        SmokeSensor: this.platform.Service.SmokeSensor,
        CarbonDioxideSensor: this.platform.Service.CarbonDioxideSensor,
        AirQualitySensor: this.platform.Service.AirQualitySensor,
        MotionSensor: this.platform.Service.MotionSensor,
        ContactSensor: this.platform.Service.ContactSensor,
        LightSensor: this.platform.Service.LightSensor,
        // Add more sensors as needed
      };

      const serviceConstructor = serviceMappings[this.deviceType];
      if (!serviceConstructor) {
        throw new Error(`Unsupported device type: ${this.deviceType}`);
      }
      
      // Dynamically create or retrieve the service instance
      this.sensorService = this.accessory.getService(serviceConstructor)
        || this.accessory.addService(new serviceConstructor(this.deviceName, this.deviceSerialNumber));      

      // Set the service name, this is what is displayed as the default name on the Home app
      this.sensorService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);
        
      if ( this.urlStatus ) {
        this.getStateDefinition().forEach(({ state, param }) => {
          if ( param ) {
            const characteristic = this.platform.Characteristic[state as
              keyof typeof this.platform.Characteristic] as unknown as WithUUID<new () => Characteristic>;

            this.sensorService
              .getCharacteristic(characteristic)
              .on('get', this.wrapGetHandler(state));
          }
        });
      }
      
      // We can now use MQTT
      if ( this.mqttBroker ) {
        this.initMQTT();
      }
      
    } 
  }

  /**
   * Wraps the get handler for a characteristic to handle device state retrieval.
   * @param state The state key to retrieve.
   * @returns A function that handles the get request.
   */
  private wrapGetHandler(state: string): (callback: (error: Error | null, value?: CharacteristicValue) => void) => void {
    return (callback) => {
      if (!this.isReachable) {
        callback(new this.platform.api.hap.HapStatusError( this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE ));
        return;
      }
  
      callback(null, this.SensorStates[state]);
    };
  }

  // Silly function :)
  private getStatus(isOn: boolean): string {
    return isOn ? 'ON' : 'OFF';
  }
 
  private getStateDefinition() {
    const config = sensorConfig[this.deviceType as keyof typeof sensorConfig]?.states;
    if (!config) {
      this.platform.log.warn(`${this.deviceName}: No configuration found for device type: ${this.deviceType}`);
    }
  
    return Object.entries(config).map(([state, stateConfig]) => ({
      state,
      param: this.paramNames[state],
      topic: this.mqttTopics[state],
      webhook: stateConfig.webhook,
    }));
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
      this.isReachable = true; // ✅ Mark as reachable
      const response = await axios.get(this.urlStatus, { timeout: 8000 });
      const data = response.data;
  
      this.processSensorState(data, false);
    } catch (error) {
      this.isReachable = false; // ❌ Mark as unreachable

      // 🔔 Notify HomeKit of communication failure
      if (this.sensorService) {
        this.getStateDefinition().forEach(({ state }) => {
          const characteristic = this.platform.Characteristic[
            state as keyof typeof this.platform.Characteristic] as unknown as WithUUID<new () => Characteristic>;
          this.sensorService.updateCharacteristic(characteristic, new this.platform.api.hap.HapStatusError(
            this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
          ));
        });
      }

      const axiosError = error as AxiosError;
      if (axios.isAxiosError(axiosError)) {
        this.platform.log.warn(`${this.deviceName}: Axios error while fetching JSON:`, axiosError.message);
      } else {
        this.platform.log.warn(`${this.deviceName}: Unknown error occurred while fetching JSON.`);
      }
    }
  }
  
  private processSensorState( data: Record<string, unknown> | undefined, isSharedData: boolean ): void {
    if (!data) {
      this.platform.log.warn(`${this.deviceName}: No data available for ${isSharedData ? 'shared data update' : 'fetching JSON state'}.`);
      return;
    }
    
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
  
      const range = this.SensorStatusRanges[state];
  
      if (
        Array.isArray(range) && range.length === 2 && 
        typeof range[0] === 'number' && typeof range[1] === 'number' &&
        value >= range[0] && value <= range[1]
      ) {
        if (this.enableLogging && this.SensorStates[state] !== value) {
          this.platform.log.info(`${this.deviceName}: ${state} SET to: ${value}`);
        }
  
        this.SensorStates[state] = value;
       
        const characteristic = this.platform.Characteristic[state as
          keyof typeof this.platform.Characteristic] as unknown as WithUUID<new () => Characteristic>;
        this.sensorService.updateCharacteristic( characteristic, value );
  
        if ( webhook && value === 1 ) {
          this.initDiscordWebhooks(state);
        }
      } else if ( this.enableLogging ) {
        this.platform.log.warn(`${this.deviceName}: Received invalid ${state} value: ${value} (valid range: ${range[0]} to ${range[1]}).`);
      }
    });
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
      this.isReachable = true; // ✅ Mark as reachable
      if ( this.enableLogging ) {
        this.platform.log.info(this.deviceName,': MQTT Connected');  
      }
      this.mqttClient.subscribe(mqttSubscribedTopics, (err) => {
        if (!err) {
          if ( this.enableLogging ) {
            this.platform.log.info(this.deviceName,': Subscribed to: ', mqttSubscribedTopics.toString());
          }
        } else {
          // Need to insert error handler
          this.platform.log.warn(this.deviceName,': Subscribing problem: ', err.toString());
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
            const normalizedValue = value.trim().toLowerCase();
            newValue = ['1', 'true'].includes(normalizedValue) ? 1 : 0;
          } else {
            newValue = Number(value); // Numeric range
          }

          // Validate against SensorStatusRanges
          if ( newValue >= min && newValue <= max ) {
            this.SensorStates[state] = newValue; // Update state value

            if (this.enableLogging) {
              this.platform.log.info(`${this.deviceName}: ${state} set to: ${newValue}`);
            }

            // Update Homebridge characteristic
            const characteristic = this.platform.Characteristic[state as
              keyof typeof this.platform.Characteristic] as unknown as WithUUID<new () => Characteristic>;
            this.sensorService.updateCharacteristic(characteristic, newValue);

            this.isReachable = true;

            // Trigger webhook if `webhook` is true and `newValue === 1`
            if ( webhook && newValue === 1 ) {
              this.initDiscordWebhooks(state);
            }
          } else {
            if ( this.enableLogging ) {
              this.platform.log.warn(`${this.deviceName}: Invalid value for ${state}: ${newValue} (must be between ${min} and ${max})`);
            }
          }
        }
      });
    });
  
    // Additional event handlers for connection state
    this.mqttClient.on('offline', () => { 
      this.isReachable = false; // ❌ Mark as unreachable
      this.platform.log.debug(this.deviceName, ': Client is offline');
    });
  
    this.mqttClient.on('reconnect', () => {
      this.platform.log.debug(this.deviceName, ': Reconnecting...');
    });
  
    this.mqttClient.on('close', () => {
      this.isReachable = false; // ❌ Mark as unreachable
      this.platform.log.debug(this.deviceName, ': Connection closed');
    });
  
    // Enhanced error handling
    this.mqttClient.on('error', (err) => {
      this.isReachable = false;
      this.platform.log.warn(this.deviceName, ': Connection error:', err);
      this.platform.log.warn(this.deviceName, ': Reconnecting in: ', this.mqttReconnectInterval, ' seconds.');
    });
  }

  private initDiscordWebhooks(state: keyof typeof this.SensorStates): void {
    // Prepare a dynamic message including the passed state
    const message = `${this.deviceName}: ${state} - ${this.discordMessage} ${this.getStatus(!!this.SensorStates[state])}`;
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
