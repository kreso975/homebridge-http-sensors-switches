import { PlatformAccessory, Service } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions } from 'mqtt';
import { discordWebHooks } from './lib/discordWebHooks.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformCarbonDioxide {
  public carbonDioxideService!: Service;
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
  public paramNameCO2Detected: string = '';
  public paramNameCO2Level: string = '';
  public paramNameCO2PeakLevel: string = '';
  public paramNameActive: string = '';
  public paramNameFault: string = '';
  public paramNameLowBattery: string = '';
  public paramNameTampered: string = '';

  public mqttReconnectInterval: string = '';
  public mqttBroker: string = '';
  public mqttPort: string = '';
  public mqttUsername: string = '';
  public mqttPassword: string = '';

  public mqttMotionSensor: string = '';
  public mqttCO2Detected: string = '';
  public mqttCO2Level: string = '';
  public mqttCO2PeakLevel: string = '';
  public mqttActive: string = '';
  public mqttFault: string = '';
  public mqttLowBattery: string = '';
  public mqttTampered: string = '';

  public updateIntervalSensor = 300000;

  public discordWebhook: string = '';
  public discordUsername: string = '';
  public discordAvatar: string = '';
  public discordMessage: string = '';
  
  public CO2States = {
    CarbonDioxideDetected: 0,     // Values: 0 (Inactive), 1 (Active). (On/Off)
    CarbonDioxideLevel: 0,        // Read only / Values: 0 Inactive, 1 Idle, 2 Blowing Air
    CarbonDioxidePeakLevel: 0,    // Values: 0 Manual, 1 Automatic
    StatusActive: 0,              // Range:  0% to 100%.
    StatusFault: 0,		         // Values: 0 Clockwise, 1: Counterclockwise
    StatusLowBattery: 0,          // Values: 0 (Disabled), 1 (Enabled)
    StatusTampered: 0,            // Values: 0 (Disabled), 1 (Enabled)
  };

  public CO2StatusRanges = {
    CarbonDioxideDetected: [0, 1],        // Valid values: 0 (Normal), 1 (High Level Detected)
    CarbonDioxideLevel: [0, 5000],        // Typical valid range for CO2 levels in ppm
    CarbonDioxidePeakLevel: [0, 5000],    // Peak CO2 level, similar to CarbonDioxideLevel range
    StatusActive: [0, 1],                 // Valid values: 0 (Inactive), 1 (Active)
    StatusFault: [0, 1],                  // Valid values: 0 (No Fault), 1 (Fault Detected)
    StatusLowBattery: [0, 1],             // Valid values: 0 (Battery OK), 1 (Low Battery)
    StatusTampered: [0, 1],               // Valid values: 0 (No Tampering), 1 (Tampered)
  };

  constructor(
    public readonly platform: HttpSensorsAndSwitchesHomebridgePlatform,
    public readonly accessory: PlatformAccessory,
  ) {

    this.deviceType = this.accessory.context.device.deviceType;
    this.deviceName = this.accessory.context.device.deviceName || 'NoName';
    this.deviceManufacturer = this.accessory.context.device.deviceManufacturer || 'Stergo';
    this.deviceModel = this.accessory.context.device.deviceModel || 'Sensor';
    this.deviceSerialNumber = this.accessory.context.device.deviceSerialNumber || accessory.UUID;
    this.deviceFirmwareVersion = this.accessory.context.device.deviceFirmwareVersion || '0.0';
    
    // From Config
    this.enableLogging = this.accessory.context.device.enableLogging;

    this.urlStatus = this.accessory.context.device.urlStatus;
    this.paramNameCO2Detected = this.accessory.context.device.paramNameCO2Detected;
    this.paramNameCO2Level = this.accessory.context.device.paramNameCO2Level;
    this.paramNameCO2PeakLevel = this.accessory.context.device.paramNameCO2PeakLevel;
    this.paramNameActive = this.accessory.context.device.paramNameActive;
    this.paramNameFault = this.accessory.context.device.paramNameFault;
    this.paramNameLowBattery = this.accessory.context.device.paramNameLowBattery;
    this.paramNameTampered = this.accessory.context.device.paramNameTampered;

    this.updateIntervalSensor = accessory.context.device.updateIntervalSensor || 300000; // Default update interval is 300 seconds

    this.mqttReconnectInterval = this.accessory.context.device.mqttReconnectInterval || 60; // 60 sec default
    this.mqttBroker = this.accessory.context.device.mqttBroker;
    this.mqttPort = this.accessory.context.device.mqttPort;
    this.mqttMotionSensor = this.accessory.context.device.mqttMotionSensor;
    this.mqttUsername = this.accessory.context.device.mqttUsername;
    this.mqttPassword = this.accessory.context.device.mqttPassword;

    this.mqttCO2Detected = this.accessory.context.device.mqttCO2Detected;
    this.mqttCO2Level = this.accessory.context.device.mqttCO2Level;
    this.mqttCO2PeakLevel = this.accessory.context.device.mqttCO2PeakLevel;
    this.mqttActive = this.accessory.context.device.mqttActive;
    this.mqttFault = this.accessory.context.device.mqttFault;
    this.mqttLowBattery = this.accessory.context.device.mqttLowBattery;
    this.mqttTampered = this.accessory.context.device.mqttTampered;

    this.discordWebhook = this.accessory.context.device.discordWebhook;
    this.discordUsername = this.accessory.context.device.discordUsername || 'StergoSmart';
    this.discordAvatar = this.accessory.context.device.discordAvatar
      || 'https://raw.githubusercontent.com/homebridge/branding/latest/logos/homebridge-color-round-stylized.png';
    this.discordMessage = this.accessory.context.device.discordMessage;

    if (!this.deviceType) {
      return;
    }

    if ( this.deviceType === 'CarbonDioxide' && (this.urlStatus || this.mqttBroker)) {

      // Set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);

      // If we are going with JSON over HTTP
      if ( this.urlStatus || this.mqttBroker ) {
        // Get the Fanv2 service if it exists, otherwise create a new Fanv2 service
        this.carbonDioxideService = this.accessory.getService(this.platform.Service.CarbonDioxideSensor) 
        || this.accessory.addService(this.platform.Service.CarbonDioxideSensor);
        
        // Set the service name, this is what is displayed as the default name on the Home app
        this.carbonDioxideService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);
        
        if ( this.urlStatus ) {
          this.getCO2State();
          setInterval(this.getCO2State.bind(this), this.updateIntervalSensor);
      
          // Register handlers for the characteristics
          this.getStateDefinition().forEach(({ state, param }) => {
            if ( param ) { // Ensure the parameter is valid
              this.carbonDioxideService.getCharacteristic(this.platform.Characteristic[state]).on('get', (callback) => {
                callback(null, this.CO2States[state]); // Correct state reference
              });
            }
          });
        }

        // We can now use MQTT
        if ( this.mqttBroker ) {
          this.initMQTT();
        }
      }
    } 
  }

  // Silly function :)
  private getStatus(isOn: boolean): string {
    return isOn ? 'ON' : 'OFF';
  }
 
  private getStateDefinition() {
    return [
      { state: 'CarbonDioxideDetected' as const, param: this.paramNameCO2Detected, topic: this.mqttCO2Detected, webhook: true, control: 1 },
      { state: 'CarbonDioxideLevel' as const, param: this.paramNameCO2Level, topic: this.mqttCO2Level, webhook: false, control: 0 },
      { state: 'CarbonDioxidePeakLevel' as const, param: this.paramNameCO2PeakLevel, topic: this.mqttCO2PeakLevel, webhook: false, control: 0 },
      { state: 'StatusActive' as const, param: this.paramNameActive, topic: this.mqttActive, webhook: false, control: 0 },
      { state: 'StatusFault' as const, param: this.paramNameFault, topic: this.mqttFault, webhook: false, control: 0 },
      { state: 'StatusLowBattery' as const, param: this.paramNameLowBattery, topic: this.mqttLowBattery, webhook: true, control: 1 },
      { state: 'StatusTampered' as const, param: this.paramNameTampered, topic: this.mqttTampered, webhook: false, control: 0 },
    ];
  }

  private async getCO2State(): Promise<void> {
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

      this.getStateDefinition().forEach(({ state, param, webhook }) => {
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
        const range = this.CO2StatusRanges[state];

        // General range validation for all states
        if (
          Array.isArray(range) &&
               range.length === 2 &&
               typeof range[0] === 'number' &&
               typeof range[1] === 'number' &&
               value >= range[0] &&
               value <= range[1]
        ) {
          this.CO2States[state] = value; // Update the state
          this.carbonDioxideService.updateCharacteristic(this.platform.Characteristic[state], value); // Update corresponding characteristic

          if (this.enableLogging) {
            this.platform.log.info(`${this.deviceName}: ${state} SET to: ${value}`);
          }

          // Trigger webhook if configured and value is 1
          if (webhook && value === 1) {
            this.initDiscordWebhooks(state);
          }
        } else if (this.enableLogging) {
          this.platform.log.warn(
            `${this.deviceName}: Received invalid ${state} value: ${value} (valid range: ${range[0]} to ${range[1]}).`,
          );
        }
      });

      // Debugging state updates
      this.platform.log.debug(`${this.deviceName}: CO2 states updated to:`, this.CO2States);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axios.isAxiosError(axiosError)) {
        this.platform.log.warn(`${this.deviceName}: Axios error while fetching CO2 state:`, axiosError.message);
      } else {
        this.platform.log.warn(`${this.deviceName}: Unknown error occurred while fetching CO2 state.`);
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
          const [min, max] = this.CO2StatusRanges[state];
          if (min === 0 && max === 1) {
            newValue = ['1', 'true'].includes(value) ? 1 : 0; // Binary range
          } else {
            newValue = Number(value); // Numeric range
          }

          // Validate against CO2StatusRanges
          if (newValue >= min && newValue <= max) {
            this.CO2States[state] = newValue; // Update state value

            if (this.enableLogging) {
              this.platform.log.info(`${this.deviceName}: ${state} set to: ${newValue}`);
            }

            // Update Homebridge characteristic
            const characteristic = this.platform.Characteristic[state];
            this.carbonDioxideService.updateCharacteristic(characteristic, newValue);

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

  private initDiscordWebhooks(state: keyof typeof this.CO2States): void {
    // Prepare a dynamic message including the passed state
    const message = `${this.deviceName}: ${state} - ${this.discordMessage} ${this.getStatus(!!this.CO2States[state])}`;
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
