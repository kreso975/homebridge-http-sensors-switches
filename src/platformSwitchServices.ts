import { CharacteristicSetCallback, CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import { SharedPolling } from './lib/SharedPolling.js';       // Include shared polling library
import { getNestedValue } from './lib/utilities.js';          // Include utility function for nested value retrieval
import { discordWebHooks } from './lib/discordWebHooks.js';   // Include Discord webhook library

import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions } from 'mqtt';

export class platformSwitch {
  public service!: Service;
  public mqttClient!: mqtt.MqttClient;
  private sharedPollingInstance?: SharedPolling;

  // Device and configuration properties
  public enableLogging = true;
  // Ensure backward compatibility for shared polling
  public sharedPolling = false; // Default to false
  public sharedPollingId = ''; // Default to empty

  public deviceId = '';
  public deviceType = '';
  public deviceName = '';
  public deviceManufacturer = '';
  public deviceModel = '';
  public deviceSerialNumber = '';
  public deviceFirmwareVersion = '';

  public url: string = '';
  public urlON = '';
  public urlOFF = '';
  public urlStatus = '';
  public statusStateParam = '';
  public statusOnCheck = '';
  public statusOffCheck = '';

  public mqttReconnectInterval = '';
  public mqttBroker = '';
  public mqttPort = '';
  public mqttUsername = '';
  public mqttPassword = '';

  public mqttSwitch = '';

  public discordWebhook = '';
  public discordUsername = '';
  public discordAvatar = '';
  public discordMessage = '';

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
          this.updateSwitchStatusFromSharedData(data);
        }
      }, 5000); // Poll every 5 seconds
    } else if (this.urlStatus) {
      // Fallback to individual polling if shared polling is not enabled
      this.startIndividualPolling(this.urlStatus);
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
          .on('set', this.setOn.bind(this)) // Handle setting the switch state
          .on('get', (callback) => {
            callback(null, this.switchStates.On); // Return the current state
          });
      }
  
      // Configure MQTT if provided
      if (this.mqttBroker) {
        this.initMQTT(); // Initialize MQTT functionality
        this.service.getCharacteristic(this.platform.Characteristic.On)
          .on('set', this.publishMQTTmessage.bind(this)); // Publish MQTT messages when state changes
      }
    }
  }
  
  private updateSwitchStatusFromSharedData(data?: Record<string, unknown>): void {
    if (!data) {
      this.platform.log.warn(`${this.deviceName}: No data available for updating switch status.`);
      return;
    }
  
    // Proceed with processing the data
    const value = getNestedValue(data, this.statusStateParam, 'string'); // Adjust returnType as needed

    if (value === this.statusOnCheck) {
      this.updateSwitchState(true, this.deviceName);
    } else if (value === this.statusOffCheck) {
      this.updateSwitchState(false, this.deviceName);
    } else {
      this.platform.log.warn(`${this.deviceName}: Unexpected value for ${this.statusStateParam}`);
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
  
  
  private startIndividualPolling(urlStatus: string): void {
    const fetchStatus = async () => {
      if (this.enableLogging) {
        this.platform.log.info(`Started polling for URL: ${this.url}`);
      }
      try {
        const response = await axios.get(urlStatus, { timeout: 8000 });
        const data = response.data;
  
        const value = getNestedValue(data, this.statusStateParam, 'string'); // Adjust returnType as needed
  
        if (value === this.statusOnCheck) {
          this.updateSwitchState(true, this.deviceName);
        } else if (value === this.statusOffCheck) {
          this.updateSwitchState(false, this.deviceName);
        } else {
          this.platform.log.warn(`${this.deviceName}: Unexpected value for ${this.statusStateParam}`);
        }
      } catch (error) {
        const errorMessage = (error as AxiosError).message;
        this.platform.log.error(`${this.deviceName}: Error fetching status - ${errorMessage}`);
      }
    };
  
    // Perform initial status check and set up polling
    this.individualPollingInterval = setInterval(fetchStatus, 5000);
  }  

  private updateSwitchState(isOn: boolean, deviceName: string): void {
    if (this.switchStates.On !== isOn) {
      this.switchStates.On = isOn;
      if (this.enableLogging) {
        this.platform.log.info(`${deviceName}: Switch is ${isOn ? 'ON' : 'OFF'}`);
      }
      this.service.updateCharacteristic(this.platform.Characteristic.On, isOn);
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
      this.platform.log.warn(`${this.deviceName}: MQTT connection error - ${err.message}`);
      this.platform.log.warn(`${this.deviceName}: Attempting reconnection in ${this.mqttReconnectInterval} seconds`);
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
