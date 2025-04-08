import { CharacteristicSetCallback, CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions } from 'mqtt';
import { discordWebHooks } from './lib/discordWebHooks.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformFan {
  public service!: Service;
  public mqttClient!: mqtt.MqttClient;

  public enableLogging: boolean = true;
  public deviceId: string = '';
  public deviceType: string = '';
  public deviceName: string = '';
  public deviceManufacturer: string = '';
  public deviceModel: string = '';
  public deviceSerialNumber: string = '';
  public deviceFirmwareVersion: string = '';

  public urlStatus: string = '';
  public urlFanControl: string = '';
  public methodUpdate: boolean = false;
  public paramNameActive: string = '';
  public paramNameRotationSpeed: string = '';
  public paramNameRotationDirection: string = '';
  public paramNameSwingMode: string = '';
  public paramNameCurrentFanState: string = '';
  public paramNameTargetFanState: string = '';

  public mqttReconnectInterval: string = '';
  public mqttBroker: string = '';
  public mqttPort: string = '';
  public mqttSwitch: string = '';
  public mqttUsername: string = '';
  public mqttPassword: string = '';

  public mqttRotationSpeed: string = '';
  public mqttRotationDirection: string = '';
  public mqttSwingMode: string = '';
  public mqttCurrentFanState: string = '';
  public mqttTargetFanState: string = '';

  public discordWebhook: string = '';
  public discordUsername: string = '';
  public discordAvatar: string = '';
  public discordMessage: string = '';

  public fanStates = {
    Active: 0,              		// Values: 0 (Inactive), 1 (Active). (On/Off)
    CurrentFanState: 0,         // Read only / Values: 0 Inactive, 1 Idle, 2 Blowing Air
    TargetFanState: 0,          // Values: 0 Manual, 1 Automatic
    RotationSpeed: 0,           // Range:  0% to 100%.
    RotationDirection: 0,		    // Values: 0 Clockwise, 1: Counterclockwise
    SwingMode: 0,               // Values: 0 (Disabled), 1 (Enabled)
  };

  public fanStatusRanges = {
    Active: [0, 1],                 // Valid values: 0 (Inactive), 1 (Active)
    CurrentFanState: [0, 2],        // Valid values: 0 (Inactive), 1 (Idle), 2 (Blowing Air)
    TargetFanState: [0, 1],         // Valid values: 0 (Manual), 1 (Automatic)
    RotationSpeed: [0, 100],        // Valid range: 0 to 100
    RotationDirection: [0, 1],      // Valid values: 0 (Clockwise), 1 (Counterclockwise)
    SwingMode: [0, 1],              // Valid values: 0 (Disabled), 1 (Enabled)
  };

  constructor(
    public readonly platform: HttpSensorsAndSwitchesHomebridgePlatform,
    public readonly accessory: PlatformAccessory,
  ) {

    this.deviceType = this.accessory.context.device.deviceType;
    this.deviceName = this.accessory.context.device.deviceName || 'NoName';
    this.deviceManufacturer = this.accessory.context.device.deviceManufacturer || 'Stergo';
    this.deviceModel = this.accessory.context.device.deviceModel || 'Fan';
    this.deviceSerialNumber = this.accessory.context.device.deviceSerialNumber || accessory.UUID;
    this.deviceFirmwareVersion = this.accessory.context.device.deviceFirmwareVersion || '0.0';

    // From Config
    this.enableLogging = this.accessory.context.device.enableLogging;
    this.urlStatus = this.accessory.context.device.urlStatus;
    this.urlFanControl = this.accessory.context.device.urlFanControl;
    this.methodUpdate = this.accessory.context.device.methodUpdate;
    this.paramNameActive = this.accessory.context.device.paramNameActive;
    this.paramNameRotationSpeed = this.accessory.context.device.paramNameRotationSpeed;
    this.paramNameRotationDirection = this.accessory.context.device.paramNameRotationDirection;
    this.paramNameSwingMode = this.accessory.context.device.paramNameSwingMode;
    this.paramNameCurrentFanState = this.accessory.context.device.paramNameCurrentFanState;
    this.paramNameTargetFanState = this.accessory.context.device.paramNameTargetFanState;
    
    this.mqttReconnectInterval = this.accessory.context.device.mqttReconnectInterval || 60; // 60 sec default
    this.mqttBroker = this.accessory.context.device.mqttBroker;
    this.mqttPort = this.accessory.context.device.mqttPort;
    this.mqttSwitch = this.accessory.context.device.mqttSwitch;
    this.mqttUsername = this.accessory.context.device.mqttUsername;
    this.mqttPassword = this.accessory.context.device.mqttPassword;

    this.mqttRotationSpeed = this.accessory.context.device.mqttRotationSpeed;
    this.mqttRotationDirection = this.accessory.context.device.mqttRotationDirection;
    this.mqttSwingMode = this.accessory.context.device.mqttSwingMode;
    this.mqttCurrentFanState = this.accessory.context.device.mqttCurrentFanState;
    this.mqttTargetFanState = this.accessory.context.device.mqttTargetFanState;

    this.discordWebhook = this.accessory.context.device.discordWebhook;
    this.discordUsername = this.accessory.context.device.discordUsername || 'StergoSmart';
    this.discordAvatar = this.accessory.context.device.discordAvatar
      || 'https://raw.githubusercontent.com/homebridge/branding/latest/logos/homebridge-color-round-stylized.png';
    this.discordMessage = this.accessory.context.device.discordMessage;

    if (!this.deviceType) {
      this.platform.log.warn(this.deviceName, ': Ignoring accessory; No deviceType defined.');
      return;
    }

    if (this.deviceType === 'Fan' && (this.urlFanControl || this.mqttBroker)) {

      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);

      if ( this.urlFanControl || this.mqttBroker ) {
        // Get the Fanv2 service if it exists, otherwise create a new Fanv2 service
        this.service = this.accessory.getService(this.platform.Service.Fanv2) || this.accessory.addService(this.platform.Service.Fanv2);
       
        // Set the service name, this is what is displayed as the default name on the Home app
        this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);
       
        // Try to fetch the initial power status of the device and check the status every 5 seconds
        if (this.urlStatus) {
          this.getFanState();
          setInterval(this.getFanState.bind(this), 5000);
        }
        
        if ( this.urlFanControl || this.urlStatus ) {
          // Register handlers for the characteristics
          this.getStateDefinition().forEach(({ state, param, setHandler }) => {
            if ( param ) { // Ensure the parameter is valid
              if (setHandler) {
                this.service.getCharacteristic(this.platform.Characteristic[state])
                  .on('set', this.setFanState.bind(this, state)); // Bind the 'set' handler dynamically
              }
              this.service.getCharacteristic(this.platform.Characteristic[state]).on('get', (callback) => {
                callback(null, this.fanStates[state]); // Correct state reference
              });
            }
          });
        }
        
        // We can now use MQTT
        if ( this.mqttBroker ) {
          
          this.initMQTT();
          this.getStateDefinition().forEach(({ state, topic, setHandler }) => {
            if (topic && setHandler) { // Ensure topic is valid and setHandler is enabled
              this.service.getCharacteristic(this.platform.Characteristic[state])
                .on('set', (value, callback) => {
                  // Dynamically bind the publishMQTTmessage for each state
                  this.publishMQTTmessage(state, value, callback);
                });
            }
          });
          
        }
      }
    }       
  }

  private getStateDefinition() {
    return [
      { state: 'Active' as const, param: this.paramNameActive, topic: this.mqttSwitch, setHandler: true },
      { state: 'RotationSpeed' as const, param: this.paramNameRotationSpeed, topic: this.mqttRotationSpeed, setHandler: true },
      { state: 'RotationDirection' as const, param: this.paramNameRotationDirection, topic: this.mqttRotationDirection, setHandler: true },
      { state: 'SwingMode' as const, param: this.paramNameSwingMode, topic: this.mqttSwingMode, setHandler: true },
      { state: 'CurrentFanState' as const, param: this.paramNameCurrentFanState, topic: this.mqttCurrentFanState, setHandler: false },
      { state: 'TargetFanState' as const, param: this.paramNameTargetFanState, topic: this.mqttTargetFanState, setHandler: true },
    ];
  }
  
  // Silly function :)
  private getStatus(isOn: boolean): string {
    return isOn ? 'ON' : 'OFF';
  }

  private async setFanState(
    what: keyof typeof this.fanStates,
    value: CharacteristicValue,
    callback: CharacteristicSetCallback,
  ): Promise<void> {
    const previousValue = this.fanStates[what]; // Save the current state value
    this.fanStates[what] = value as number; // Update the state dynamically
  
    try {
      const url = this.urlFanControl; // Base URL for fan control
      if (!url) {
        this.platform.log.warn(this.deviceName, ': No Fan control URL defined.');
        callback(new Error('No Fan control URL defined.'));
        this.fanStates[what] = previousValue; // Revert to the previous state
        return;
      }
  
      const characteristicDefinition = this.getStateDefinition().find((def) => def.state === what);
      if (!characteristicDefinition) {
        this.platform.log.warn(this.deviceName, `: Unknown fan state: ${what}`);
        callback(null);
        this.fanStates[what] = previousValue; // Revert to the previous state
        return;
      }
  
      const { state, param, topic } = characteristicDefinition;
  
      if (!param) {
        this.platform.log.warn(this.deviceName, `: Ignoring request; No parameter defined for ${state}.`);
        callback(new Error(`No parameter defined for ${state}.`));
        this.fanStates[what] = previousValue; // Revert to the previous state
        return;
      }
  
      // Determine HTTP method based on methodUpdate (true = GET, false = POST)
      const method: 'POST' | 'GET' = this.methodUpdate ? 'GET' : 'POST';
  
      // Logging the characteristic value change
      this.platform.log.debug(this.deviceName, `: Setting ${state} to:`, value);
  
      // Update HomeKit characteristic
      this.service.updateCharacteristic(this.platform.Characteristic[state], value);
  
      // Construct URL for GET requests with only the updated value
      const modifiedUrl = method === 'GET' ? `${url}?${param}=${encodeURIComponent(value as number)}` : url;

      // Prepare Axios request options
      const axiosOptions = {
        method,
        url: modifiedUrl, // Use the modified URL for GET requests
        headers: {
          'Content-Type': 'application/json',
        },
        ...(method === 'POST' && { data: { [param]: this.fanStates[state] } }), // Include data only for POST
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
        this.initDiscordWebhooks();
      }
  
      // Log success and call callback
      callback(null);
      if (this.enableLogging) {
        this.platform.log.info('Success: Fan ', this.deviceName, ` is: ${this.getStatus(!!this.fanStates[what])}`);
      }
    } catch (error) {
      // Handle errors: Revert state and log the issue
      this.fanStates[what] = previousValue; // Revert to the previous state
      if (error instanceof Error) {
        this.platform.log.warn(this.deviceName, `: Axios error for ${what}:`, error.message);
      } else {
        this.platform.log.warn(this.deviceName, `: An unknown error occurred while setting ${what}.`);
      }
      callback(error as Error); // Notify failure
    }
  }  

  private async getFanState(): Promise<void> {
    if (!this.urlStatus) {
      this.platform.log.warn(this.deviceName, ': Ignoring request; No status URL defined.');
      return;
    }

    try {
      const response = await axios({
        url: this.urlStatus,
        method: 'get',
        timeout: 8000, // Set timeout for response
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = response.data;

      // Log fetched data for debugging
      this.platform.log.debug(`${this.deviceName}: Fetched JSON data:`, data);

      this.getStateDefinition().forEach(({ state, param }) => {
        // Check if 'param' is defined in the config
        if (!param) {
          if (this.enableLogging) {
            this.platform.log.debug(`${this.deviceName}: Parameter for ${state} is not configured. Skipping.`);
          }
          return; // Skip processing this state
        }
      
        // Check if 'data[param]' exists in the JSON
        if (data[param] === undefined) {
          if (this.enableLogging) {
            this.platform.log.warn(`${this.deviceName}: Parameter '${param}' not found in JSON for state ${state}.`);
          }
          return; // Skip processing this state
        }
      
        let value = data[param];
      
        // Type validation and normalization
        if (typeof value === 'boolean') {
          value = value ? 1 : 0; // Convert boolean to 1 or 0
        }
      
        value = Number(value); // Ensure the value is a valid number
        const range = this.fanStatusRanges[state];
      
        // General range validation for all states
        if (
          Array.isArray(range) && range.length === 2 && 
          typeof range[0] === 'number' && typeof range[1] === 'number' &&
          value >= range[0] && value <= range[1]
        ) {
          this.fanStates[state] = value; // Update the state
          this.service.updateCharacteristic(this.platform.Characteristic[state], value); // Update corresponding characteristic
      
          if (this.enableLogging) {
            this.platform.log.info(`${this.deviceName}: ${state} SET to: ${value}`);
          }
        } else if (this.enableLogging) {
          this.platform.log.warn(
            `${this.deviceName}: Received invalid ${state} value: ${value} (valid range: ${range[0]} to ${range[1]}).`,
          );
        }
      });      

      // Debugging state updates
      this.platform.log.debug(`${this.deviceName}: Fan states updated to:`, this.fanStates);

    } catch (error) {
      const axiosError = error as AxiosError;
      if (axios.isAxiosError(axiosError)) {
        this.platform.log.warn(`${this.deviceName}: Axios error while fetching fan state:`, axiosError.message);
      } else {
        this.platform.log.warn(`${this.deviceName}: Unknown error occurred while fetching fan state.`);
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

    // Handle incoming messages
    this.mqttClient.on('message', (topic, message) => {
      this.getStateDefinition().forEach(({ state, topic: stateTopic }) => {
        if (stateTopic === topic) { // Match incoming topic
          const value = message.toString();
          let newValue;

          // Handle binary and numeric ranges dynamically
          const [min, max] = this.fanStatusRanges[state];
          if (min === 0 && max === 1) {
            newValue = ['1', 'true'].includes(value) ? 1 : 0; // Binary range
          } else {
            newValue = Number(value); // Numeric range
          }

          // Validate against fanStatusRanges
          if (newValue >= min && newValue <= max) {
            this.fanStates[state] = newValue; // Update state value

            if (this.enableLogging) {
              this.platform.log.info(`${this.deviceName}: ${state} set to: ${newValue}`);
            }

            // Update Homebridge characteristic
            const characteristic = this.platform.Characteristic[state];
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
    what: keyof typeof this.fanStates,
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
  
  private initDiscordWebhooks() {
    // Prepare message just to send On Off status
    const message = this.deviceName + ': ' + this.discordMessage + this.getStatus(!!this.fanStates.Active);
    const discord = new discordWebHooks(this.discordWebhook, this.discordUsername, this.discordAvatar, message);

    discord.discordSimpleSend().then((result) => {
      if ( this.enableLogging) {
        this.platform.log.info(this.deviceName, ': ', result);
      }
    });
  }
}