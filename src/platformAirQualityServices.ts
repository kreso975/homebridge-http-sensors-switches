import { PlatformAccessory, Service } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions } from 'mqtt';

import { SharedPolling } from './lib/SharedPolling.js';       // Include shared polling library
import { discordWebHooks } from './lib/discordWebHooks.js';
import { getNestedValue } from './lib/utilities.js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformAirQuality {
  public airQualityService!: Service;
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
  public paramNameAirQuality: string = '';
  public paramNamePM2_5Density: string = '';
  public paramNamePM10Density: string = '';
  public paramNameOzoneDensity: string = '';
  public paramNameNitrogenDioxideDensity: string = '';
  public paramNameSulphurDioxideDensity: string = '';
  public paramNameCarbonMonoxideLevel: string = '';
  public paramNameActive: string = '';
  public paramNameFault: string = '';
  public paramNameLowBattery: string = '';
  public paramNameTampered: string = '';

  public mqttReconnectInterval: string = '';
  public mqttBroker: string = '';
  public mqttPort: string = '';
  public mqttUsername: string = '';
  public mqttPassword: string = '';

  public mqttAirQuality: string = '';
  public mqttPM2_5Density: string = '';
  public mqttPM10Density: string = '';
  public mqttOzoneDensity: string = '';
  public mqttNitrogenDioxideDensity: string = '';
  public mqttSulphurDioxideDensity: string = '';
  public mqttCarbonMonoxideLevel: string = '';
  public mqttActive: string = '';
  public mqttFault: string = '';
  public mqttLowBattery: string = '';
  public mqttTampered: string = '';

  public updateInterval = 60000;

  public discordWebhook: string = '';
  public discordUsername: string = '';
  public discordAvatar: string = '';
  public discordMessage: string = '';
  
  public AirQualityStates = {
    AirQuality: 0,
    PM2_5Density: 0,
    PM10Density: 0,
    OzoneDensity: 0,
    NitrogenDioxideDensity: 0,
    SulphurDioxideDensity: 0,
    CarbonMonoxideLevel: 0,
    StatusActive: 0,              // Range:  0% to 100%.
    StatusFault: 0,		         // Values: 0 Clockwise, 1: Counterclockwise
    StatusLowBattery: 0,          // Values: 0 (Disabled), 1 (Enabled)
    StatusTampered: 0,            // Values: 0 (Disabled), 1 (Enabled)
  };
  
  public AirQualityStatusRanges = {
    AirQuality: [0,5],                    // Valid values: 0 (No Air Quality), 1 (Good), 2 (Fair), 3 (Moderate), 4 (Poor), 5 (Very Poor)
    PM2_5Density: [0,500],                // Valid values: 0 to 500
    PM10Density: [0,500],                 // Valid values: 0 to 500
    OzoneDensity: [0,1000],               // Valid values: 0 to 1000
    NitrogenDioxideDensity: [0,1000],     // Valid values: 0 to 1000
    SulphurDioxideDensity: [0,1000],      // Valid values: 0 to 1000
    DioxideDensity: [0,1000],             // Valid values: 0 to 1000
    CarbonMonoxideLevel: [0,1000],        // Valid values: 0 to 1000
    StatusActive: [0, 1],                 // Valid values: 0 (Inactive), 1 (Active)
    StatusFault: [0, 1],                  // Valid values: 0 (No Fault), 1 (Fault Detected)
    StatusLowBattery: [0, 1],             // Valid values: 0 (Battery OK), 1 (Low Battery)
    StatusTampered: [0, 1],               // Valid values: 0 (No Tampering), 1 (Tampered)
  };
 
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

    this.paramNameAirQuality = device.paramNameAirQuality;
    this.paramNamePM2_5Density = device.paramNamePM2_5Density;
    this.paramNamePM10Density = device.paramNamePM10Density;
    this.paramNameOzoneDensity = device.paramNameOzoneDensity;
    this.paramNameNitrogenDioxideDensity = device.paramNameNitrogenDioxideDensity;
    this.paramNameSulphurDioxideDensity = device.paramNameSulphurDioxideDensity;
    this.paramNameCarbonMonoxideLevel = device.paramNameCarbonMonoxideLevel;
    this.paramNameActive = device.paramNameActive;
    this.paramNameFault = device.paramNameFault;
    this.paramNameLowBattery = device.paramNameLowBattery;
    this.paramNameTampered = device.paramNameTampered;

    this.updateInterval = device.updateInterval || 60000; // Default update interval is 300 seconds

    this.mqttReconnectInterval = device.mqttReconnectInterval || 60; // 60 sec default
    this.mqttBroker = device.mqttBroker;
    this.mqttPort = device.mqttPort;
    this.mqttUsername = device.mqttUsername;
    this.mqttPassword = device.mqttPassword;

    
    this.mqttAirQuality = device.mqttAirQuality;
    this.mqttPM2_5Density = device.mqttPM2_5Density;
    this.mqttPM10Density = device.mqttPM10Density;
    this.mqttOzoneDensity = device.mqttOzoneDensity;
    this.mqttNitrogenDioxideDensity = device.mqttNitrogenDioxideDensity;
    this.mqttSulphurDioxideDensity = device.mqttSulphurDioxideDensity;
    this.mqttCarbonMonoxideLevel = device.mqttCarbonMonoxideLevel;
    this.mqttActive = device.mqttActive;
    this.mqttFault = device.mqttFault;
    this.mqttLowBattery = device.mqttLowBattery;
    this.mqttTampered = device.mqttTampered;

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
          this.updateAirQualityStatusFromSharedData(data);
        }
      }, 10000); // Poll every 10 seconds
    } else if (this.urlStatus) {
      // Fallback to individual polling if shared polling is not enabled
      this.getAirQualityState();
      setInterval(this.getAirQualityState.bind(this), this.updateInterval);
    }

    if (!this.deviceType) {
      return;
    }

    if ( this.deviceType === 'AirQuality' && (this.urlStatus || this.mqttBroker)) {

      // Set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);

      // If we are going with JSON over HTTP
      if ( this.urlStatus || this.mqttBroker ) {
        // Get the Air Quality service if it exists, otherwise create a new Air Quality service
        this.airQualityService = this.accessory.getService(this.platform.Service.AirQualitySensor) 
        || this.accessory.addService(this.platform.Service.AirQualitySensor);
        
        // Set the service name, this is what is displayed as the default name on the Home app
        this.airQualityService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);
        
        if ( this.urlStatus ) {      
          // Register handlers for the characteristics
          this.getStateDefinition().forEach(({ state, param }) => {
            if ( param ) { // Ensure the parameter is valid
              this.airQualityService.getCharacteristic(this.platform.Characteristic[state]).on('get', (callback) => {
                callback(null, this.AirQualityStates[state]); // Correct state reference
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
      { state: 'AirQuality' as const, param: this.paramNameAirQuality, topic: this.mqttAirQuality, webhook: false, control: 0 },
      { state: 'PM2_5Density' as const, param: this.paramNamePM2_5Density, topic: this.mqttPM2_5Density, webhook: false, control: 0 },
      { state: 'PM10Density' as const, param: this.paramNamePM10Density, topic: this.mqttPM10Density, webhook: false, control: 0 },
      { state: 'OzoneDensity' as const, param: this.paramNameOzoneDensity, topic: this.mqttOzoneDensity, webhook: false, control: 0 },
      { state: 'NitrogenDioxideDensity' as const, param: this.paramNameNitrogenDioxideDensity, 
        topic: this.mqttNitrogenDioxideDensity, webhook: false, control: 0 },
      { state: 'SulphurDioxideDensity' as const, param: this.paramNameSulphurDioxideDensity,
        topic: this.mqttSulphurDioxideDensity, webhook: false, control: 0 },
      { state: 'CarbonMonoxideLevel' as const, param: this.paramNameCarbonMonoxideLevel, topic: this.mqttCarbonMonoxideLevel, webhook: false, control: 0 },
      { state: 'StatusActive' as const, param: this.paramNameActive, topic: this.mqttActive, webhook: false, control: 0 },
      { state: 'StatusFault' as const, param: this.paramNameFault, topic: this.mqttFault, webhook: false, control: 0 },
      { state: 'StatusLowBattery' as const, param: this.paramNameLowBattery, topic: this.mqttLowBattery, webhook: true, control: 1 },
      { state: 'StatusTampered' as const, param: this.paramNameTampered, topic: this.mqttTampered, webhook: false, control: 0 },
    ];
  }

  private updateAirQualityStatusFromSharedData(data?: Record<string, unknown>): void {
    if (!data) {
      this.platform.log.warn(`${this.deviceName}: No data available for updating Air Quality status.`);
      return;
    }

    this.getStateDefinition().forEach(({ state, param, webhook }) => {
      // Check if 'param' is defined in the config
      if (!param) {
        if (this.enableLogging) {
          this.platform.log.debug(`${this.deviceName}: Parameter for ${state} is not configured. Skipping.`);
        }
        return; // Skip processing this state
      }

      //let value = data[param];
      let value = getNestedValue(data, param, 'number');

      // Check if 'data[param]' exists in the JSON
      if (value === undefined) {
        if (this.enableLogging) {
          this.platform.log.warn(`${this.deviceName}: Parameter '${param}' not found in JSON for state ${state}.`);
        }
        return; // Skip processing this state
      }

      // Type validation and normalization
      if (typeof value === 'boolean') {
        value = value ? 1 : 0; // Convert boolean to 1 or 0
      }

      value = Number(value); // Ensure the value is a valid number
      const range = this.AirQualityStatusRanges[state];


      // General range validation for all states
      if (
        Array.isArray(range) &&
             range.length === 2 &&
             typeof range[0] === 'number' &&
             typeof range[1] === 'number' &&
             value >= range[0] &&
             value <= range[1]
      ) {

        if (this.enableLogging) {
          if( this.AirQualityStates[state] !== value ) {
            this.platform.log.info(`${this.deviceName}: ${state} - [${this.AirQualityStates[state]}] SET to: ${value}`);
          }
        }

        this.AirQualityStates[state] = value; // Update the state
        this.airQualityService.updateCharacteristic(this.platform.Characteristic[state], value); // Update corresponding characteristic

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
  }

  private async getAirQualityState(): Promise<void> {
    if (!this.urlStatus) {
      this.platform.log.warn(this.deviceName, ': Ignoring request; No status URL defined.');
      return;
    }

    try {
      const response = await axios.get(this.urlStatus, { timeout: 8000 });
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

        //let value = data[param];
        let value = getNestedValue(data, param, 'number');

        // Type validation and normalization
        if (typeof value === 'boolean') {
          value = value ? 1 : 0; // Convert boolean to 1 or 0
        }

        value = Number(value); // Ensure the value is a valid number
        const range = this.AirQualityStatusRanges[state];

        // General range validation for all states
        if (
          Array.isArray(range) &&
               range.length === 2 &&
               typeof range[0] === 'number' &&
               typeof range[1] === 'number' &&
               value >= range[0] &&
               value <= range[1]
        ) {

          if (this.enableLogging) {
            if( this.AirQualityStates[state] !== value ) {
              this.platform.log.info(`${this.deviceName}: ${state} - [${this.AirQualityStates[state]}] SET to: ${value}`);
            }
          }

          this.AirQualityStates[state] = value; // Update the state
          this.airQualityService.updateCharacteristic(this.platform.Characteristic[state], value); // Update corresponding characteristic

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
      this.platform.log.debug(`${this.deviceName}: Air Quality states updated to:`, this.AirQualityStates);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axios.isAxiosError(axiosError)) {
        this.platform.log.warn(`${this.deviceName}: Axios error while fetching Air Quality state:`, axiosError.message);
      } else {
        this.platform.log.warn(`${this.deviceName}: Unknown error occurred while fetching Air Quality state.`);
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
          const [min, max] = this.AirQualityStatusRanges[state];
          if (min === 0 && max === 1) {
            newValue = ['1', 'true'].includes(value) ? 1 : 0; // Binary range
          } else {
            newValue = Number(value); // Numeric range
          }

          // Validate against AirQualityStatusRanges
          if (newValue >= min && newValue <= max) {
            this.AirQualityStates[state] = newValue; // Update state value

            if (this.enableLogging) {
              this.platform.log.info(`${this.deviceName}: ${state} set to: ${newValue}`);
            }

            // Update Homebridge characteristic
            const characteristic = this.platform.Characteristic[state];
            this.airQualityService.updateCharacteristic(characteristic, newValue);

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

  private initDiscordWebhooks(state: keyof typeof this.AirQualityStates): void {
    // Prepare a dynamic message including the passed state
    const message = `${this.deviceName}: ${state} - ${this.discordMessage} ${this.getStatus(!!this.AirQualityStates[state])}`;
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
