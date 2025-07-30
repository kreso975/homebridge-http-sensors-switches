import { CharacteristicSetCallback, CharacteristicValue, PlatformAccessory, Service, Characteristic, WithUUID } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';


import { SharedPolling, SharedData } from './lib/SharedPolling.js';        // Include shared polling library
import { MQTTManager } from './lib/MQTTManager.js';                           // Include MQTTManager
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

  private isReachable: boolean = true; // Track if the device is reachable
  // Device and configuration properties
  public enableLogging: boolean = true;
  // Ensure backward compatibility for shared polling
  public sharedPolling = false; // Default to false
  public sharedPollingId = ''; // Default to empty
  public sharedPollingInterval = 5000;

  public deviceID: string = '';
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
    private readonly platform: HttpSensorsAndSwitchesHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
    private mqttManager: MQTTManager,
  ) {
    const device = this.accessory.context.device;

    this.deviceType = device.deviceType;
    this.deviceID = device.deviceID || accessory.UUID;
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
    if (!config) {
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

    // Initialize DeviceStates and DeviceStatusRanges dynamically
    Object.entries(config.sensors).forEach(([sensorKey, deviceConfig]) => {
      this.DeviceStates[sensorKey] = deviceConfig.defaultValue;
      this.DeviceStatusRanges[sensorKey] = deviceConfig.range;
    });
    // ---------------------------------------------------------------------------------

    // Ensure backward compatibility for shared polling
    this.sharedPolling = device.sharedPolling ?? false;                 // Default shared polling to false
    this.sharedPollingId = device.sharedPollingId ?? '';                // Default shared polling group ID to an empty string
    this.sharedPollingInterval = device.sharedPollingInterval ?? 5000;  // Set the polling interval to 5 sec or from config value

    if ( this.sharedPolling && this.sharedPollingId ) {
      const sharedPollingInstance = SharedPolling.registerPolling(
        this.sharedPollingId,
        this.urlStatus,
        this.platform,
        this.sharedPollingInterval,                                     // Set the polling interval to 5 sec or from config value
      );

      // Subscribe to data updates
      sharedPollingInstance.on('dataUpdated', (data: SharedData) => {
        this.isReachable = true; // ✅ Mark as reachable
        this.updateDeviceStatusFromSharedData(data);
      });

      sharedPollingInstance.on('dataError', () => {
        this.isReachable = false; // ❌ Mark as unreachable
      });
    } else if (this.urlStatus) {
      this.getDeviceState();
      setInterval(this.getDeviceState.bind(this), 5000);
    }

    if (this.urlStatus || this.mqttBroker) {
      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);

      // Define a mapping between device types and their corresponding services
      const serviceMappings: Record<string, WithUUID<typeof Service>> = {
        Fan: this.platform.Service.Fanv2,
        DoorOpener: this.platform.Service.Door,
        GarageDoorOpener: this.platform.Service.GarageDoorOpener,
        Window: this.platform.Service.Window,
        WindowCovering: this.platform.Service.WindowCovering,
        Valve: this.platform.Service.Valve,
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

      if (this.urlDeviceControl || this.urlStatus) {
        // Register handlers for the characteristics
        this.getStateDefinition().forEach(({ state, param, setHandler }) => {
          const characteristic = this.platform.Characteristic[state as
            keyof typeof this.platform.Characteristic] as unknown as WithUUID<new () => Characteristic>;
          if (param) { // Ensure the parameter is valid
            if (setHandler) {
              this.service.getCharacteristic(characteristic)
                .on('set', this.wrapSetHandler(state));
            }
            this.service
              .getCharacteristic(characteristic)
              .on('get', this.wrapGetHandler(state));
          }
        });
      }

      // We can now use MQTT
      // Left to a user to decide if they want to use MQTT or not also to run in parallel with HTTP - not recommended
      if (this.mqttBroker) {
        this.initMQTT();
        this.getStateDefinition().forEach(({ state, topic, setHandler }) => {
          if (topic && setHandler) { // Ensure topic is valid and setHandler is enabled
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

  /**
   * Wraps the get handler for a characteristic to handle device state retrieval.
   * @param state The state key to retrieve.
   * @returns A function that handles the get request.
   */
  private wrapGetHandler(state: string): (callback: (error: Error | null, value?: CharacteristicValue) => void) => void {
    return (callback) => {
      if (!this.isReachable) {
        callback(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        return;
      }

      callback(null, this.DeviceStates[state]);
    };
  }

  /**
   * Wraps the set handler for a characteristic to handle device state updates.
   * @param state The state key to update.
   * @returns A function that handles the set request.
   */
  private wrapSetHandler(state: keyof typeof this.DeviceStates): (value: CharacteristicValue, callback: CharacteristicSetCallback) => void {
    return (value, callback) => {
      if (!this.isReachable) {
        callback(new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE));
        return;
      }

      this.setDeviceState(state, value, callback);
    };
  }

  private getStateDefinition() {
    const config = deviceConfig[this.deviceType as keyof typeof deviceConfig]?.states;
    if (!config) {
      this.platform.log.warn(`${this.deviceName}: No configuration found for device type: ${this.deviceType}`);
      return [];
    }

    return Object.entries(config).map(([state, stateConfig]) => ({
      state,
      param: this.paramNames[state],
      topic: this.mqttTopics[state],
      webhook: stateConfig.webhook,
      setHandler: stateConfig.setHandler,
      fromConfig: stateConfig.fromConfig,
    }));
  }

  // Silly function :)
  private getStatus(isOn: boolean): string {
    return isOn ? 'ON' : 'OFF';
  }

  private updateDeviceStatusFromSharedData(data?: Record<string, unknown>): void {
    this.processGetDeviceStatusData(data, true);
  }

  private async getDeviceState(): Promise<void> {
    if (!this.urlStatus) {
      this.platform.log.warn(this.deviceName, ': Ignoring request; No status URL defined.');
      return;
    }

    try {
      this.isReachable = true; // ✅ Mark as reachable
      const response = await axios.get(this.urlStatus, { timeout: 8000 });
      const data = response.data;

      //this.platform.log.debug(`${this.deviceName}: Fetched JSON data:`, data);
      this.processGetDeviceStatusData(data, false);

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

  private processGetDeviceStatusData(data: Record<string, unknown> | undefined, isSharedData: boolean): void {
    if (!data) {
      this.platform.log.warn(`${this.deviceName}: No data available for ${isSharedData ? 'shared data update' : 'fetching device state'}.`);
      return;
    }

    this.getStateDefinition().forEach(({ state, param, webhook, fromConfig }): void => {
      if (!param) {
        if (this.enableLogging) {
          this.platform.log.debug(`${this.deviceName}: Parameter for ${state} is not configured. Skipping.`);
        }
        return;
      }

      // Skip JSON parsing if value is from config
      if (fromConfig) {
        const paramKey = 'paramName' + state;
        const value = this.accessory.context.device[paramKey];
        const range = this.DeviceStatusRanges[state];

        if ( Array.isArray(range) && range.length === 2 && typeof range[0] === 'number' && typeof range[1] === 'number' &&
              value >= range[0] && value <= range[1] ) {
          const characteristic = this.platform.Characteristic[state as keyof typeof this.platform.Characteristic
          ] as unknown as WithUUID<new () => Characteristic>;

          const currentValue = this.service.getCharacteristic(characteristic).value;

          if (currentValue !== value) {
            this.service.updateCharacteristic(characteristic, value);

            if (this.enableLogging) {
              this.platform.log.info(`${this.deviceName}: ${state} (from config) SET to: ${value}`);
            }
          }
        } else if (this.enableLogging) {
          this.platform.log.warn(
            `${this.deviceName}: Configured value for ${state} is invalid: ${value} (expected range: ${range[0]} to ${range[1]})`,
          );
        }

        return;
      }

      // Otherwise, parse from live JSON
      const rawValue = getNestedValue(data, param, 'number');
      let value: number | undefined;

      if (typeof rawValue === 'number') {
        value = rawValue;
      } else if (typeof rawValue === 'boolean') {
        value = rawValue ? 1 : 0;
      } else {
        value = undefined;
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
          if (this.discordWebhook && webhook) {
            this.initDiscordWebhooks(state);
          }
        }

        this.DeviceStates[state] = value;

        const characteristic = this.platform.Characteristic[
          state as keyof typeof this.platform.Characteristic] as unknown as WithUUID<new () => Characteristic>;
        this.service.updateCharacteristic(characteristic, value);
      } else if (this.enableLogging) {
        this.platform.log.warn(`${this.deviceName}: Received invalid ${state} value: ${value} (valid range: ${range[0]} to ${range[1]}).`);
      }
    });
  }

  private async setDeviceState(what: keyof typeof this.DeviceStates, value: CharacteristicValue, callback: CharacteristicSetCallback): Promise<void> {

    const previousValue = this.DeviceStates[what]; // Save the current state value
    this.DeviceStates[what] = value as number; // Update the state dynamically

    try {
      this.isReachable = true; // ✅ Mark as reachable
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
      if (topic && this.mqttClient) {
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
        this.platform.log.info('Success: ', this.deviceName, ` is: ${this.getStatus(!!this.DeviceStates[what])}`);
      }
    } catch (error) {
      this.isReachable = false; // ❌ Mark as unreachable
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

    this.mqttManager = MQTTManager.getInstance(mqttOptions, this.platform.log);
    const deviceID = this.mqttManager.deviceID;

    // ✅ Connection events
    this.mqttManager.on('connect', (id) => {
      if (id !== deviceID) {
        return;
      }

      this.isReachable = true;
      if (this.enableLogging) {
        this.platform.log.info(`${this.deviceName}: MQTT Connected`);
      }

      const topics = this.getStateDefinition()
        .map(({ topic }) => topic)
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0);

      this.mqttManager.subscribeMultiple(topics, this.handleMQTTMessage.bind(this));
    });

    this.mqttManager.on('offline', (id) => {
      if (id !== deviceID) {
        return;
      }
      this.isReachable = false;
      this.platform.log.warn(`${this.deviceName}: MQTT Offline`);
    });

    this.mqttManager.on('reconnect', (id) => {
      if (id !== deviceID) {
        return;
      }
      this.platform.log.warn(`${this.deviceName}: MQTT Reconnecting...`);
    });

    this.mqttManager.on('disconnect', (id) => {
      if (id !== deviceID) {
        return;
      }
      this.isReachable = false;
      this.platform.log.warn(`${this.deviceName}: MQTT Connection closed`);
    });

    this.mqttManager.on('error', (id, err) => {
      if (id !== deviceID) {
        return;
      }
      this.isReachable = false;
      this.platform.log.warn(`${this.deviceName}: MQTT Error:`, err);
      this.platform.log.warn(`${this.deviceName}: Reconnecting in ${this.mqttReconnectInterval} seconds`);
    });
  }

  private handleMQTTMessage(topic: string, message: string): void {
    const matched = this.getStateDefinition().find(({ topic: stateTopic }) => stateTopic === topic);
    if (!matched) {
      if (this.enableLogging) {
        this.platform.log.warn(`${this.deviceName}: Received MQTT message for unknown topic: ${topic}`);
      }
      return;
    }

    const { state } = matched;
    const value = message.toString();
    const [min, max] = this.DeviceStatusRanges[state];

    let newValue: number;

    if (min === 0 && max === 1) {
      const normalizedValue = value.trim().toLowerCase();
      newValue = ['1', 'true'].includes(normalizedValue) ? 1 : 0;
    } else {
      newValue = Number(value);
    }

    if (newValue >= min && newValue <= max) {
      if (this.DeviceStates[state] !== newValue) {
        this.DeviceStates[state] = newValue;

        const characteristic = this.platform.Characteristic[
        state as keyof typeof this.platform.Characteristic
        ] as unknown as WithUUID<new () => Characteristic>;

        this.service.updateCharacteristic(characteristic, newValue);

        if (this.enableLogging) {
          this.platform.log.info(`${this.deviceName}: ${state} set to: ${newValue}`);
        }
      }

      this.isReachable = true;
    } else {
      if (this.enableLogging) {
        this.platform.log.warn(`${this.deviceName}: Invalid value for ${state}: ${newValue} (must be between ${min} and ${max})`);
      }
    }
  }

  private publishMQTTmessage( 
    what: keyof typeof this.DeviceStates,
    value: CharacteristicValue,
    callback: CharacteristicSetCallback,
  ): void {
    let called = false;
    const safeCallback = (...args: Parameters<CharacteristicSetCallback>) => {
      if (!called) {
        called = true;
        callback(...args);
      }
    };

    const definition = this.getStateDefinition().find(({ state }) => state === what);
    if (!definition || !definition.topic) {
      this.platform.log.warn(`${this.deviceName}: No valid topic for state: ${what}`);
      safeCallback(new Error(`No valid topic for state: ${what}`));
      return;
    }

    const topic = definition.topic;
    const message = String(value);

    if (this.enableLogging) {
      this.platform.log.info(`${this.deviceName}: Publishing ${what} to topic ${topic} with value: ${message}`);
    }

    if (!this.mqttManager || !this.mqttManager.isReady()) {
      this.platform.log.warn(`${this.deviceName}: MQTT client not connected`);
      safeCallback(new Error('MQTT client not connected'));
      return;
    }

    this.mqttManager.publish(topic, message, { qos: 1, retain: true });
    safeCallback(null);
  }


  private initDiscordWebhooks(state: keyof typeof this.DeviceStates): void {
    // Prepare a dynamic message including the passed state
    const message = `${this.deviceName}: ${state} - ${this.discordMessage} ${this.getStatus(!!this.DeviceStates[state])}`;
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