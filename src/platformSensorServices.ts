import { PlatformAccessory, CharacteristicValue, Service  } from 'homebridge';
import type { HttpSensorsAndSwitchesHomebridgePlatform } from './platform.js';

import { HttpsAgentManager } from './lib/HttpsAgentManager.js';
import axios, { AxiosError } from 'axios';
import mqtt, { IClientOptions }  from 'mqtt';

import { SharedPolling, SharedData } from './lib/SharedPolling.js';       // Include shared polling library
import { getNestedValue } from './lib/utilities.js';
import { discordWebHooks } from './lib/discordWebHooks.js';               // Include Discord webhook library


/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class platformSensors {
  public temperatureService!: Service;
  public humidityService!: Service;
  public batteryService!: Service;
  public mqttClient!: mqtt.MqttClient;
  private sharedPollingInstance?: SharedPolling;

  private isReachable: boolean = true; // Track if the device is reachable
  public enableLogging: boolean = true;

  // Security, Self Signed Certificates rules
  public ignoreHttpsCertErrors: boolean = false;
  public trustedCert?: string;

  // Ensure backward compatibility for shared polling
  public sharedPolling = false; // Default to false
  public sharedPollingId = ''; // Default to empty
  public sharedPollingInterval = 60000; // Default to 60 seconds

  public deviceId: string = '';
  public deviceType: string = '';
  public deviceName: string = '';
  public deviceManufacturer: string = '';
  public deviceModel: string = '';
  public deviceSerialNumber: string = '';
  public deviceFirmwareVersion: string = '';
  
  public sensorUrl: string = '';
  public temperatureName: string = '';
  public humidityName: string = '';
  public airPressureName: string = '';
  public batteryLevelName: string = '';
  public batteryChargingStateName: string = '';
  public batteryStatusLowName: string = '';

  public mqttReconnectInterval: string = '';
  public mqttBroker: string = '';
  public mqttPort: string = '';
  public mqttTemperature: string = '';
  public mqttHumidity: string = '';
  public mqttBatteryLevel: string = '';
  public mqttBatteryChargingState: string = '';
  public mqttBatteryStatusLow: string = '';
  public mqttUsername: string = '';
  public mqttPassword: string = '';

  public discordWebhook: string = '';
  public discordUsername: string = '';
  public discordAvatar: string = '';
  public discordMessage: string = '';
 
  public currentTemperature: number = 20;
  public currentHumidity: number = 50;
  public currentBatteryLevel: number = 78;
  public currentBatteryChargingState: number = 2; // 0: Not charging, 1: Charging,	2: Not chargeable
  public currentBatteryStatusLow: boolean = false;
  public updateInterval = 300000;

  private httpsAgentManager: HttpsAgentManager;

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

    // Security, Self Signed Certificates rules
    this.ignoreHttpsCertErrors = device.ignoreHttpsCertErrors || false;
    this.trustedCert = device.trustedCert || undefined;

    this.sensorUrl = device.sensorUrl;
    this.temperatureName = device.temperatureName;
    this.humidityName = device.humidityName;
    this.airPressureName = device.airPressureName;
    this.batteryLevelName = device.paramNameBatteryLevel;
    this.batteryChargingStateName = device.paramNameStatusChargingBattery;
    this.batteryStatusLowName = device.paramNameStatusLowBattery;
    this.updateInterval = device.updateInterval || 60000; // Default update interval is 300 seconds

    this.mqttReconnectInterval = device.mqttReconnectInterval || 60; // 60 sec default
    this.mqttBroker = device.mqttBroker;
    this.mqttPort = device.mqttPort;
    this.mqttTemperature = device.mqttTemperature;
    this.mqttHumidity = device.mqttHumidity;
    this.mqttBatteryLevel = device.mqttBatteryLevel;
    this.mqttBatteryChargingState = device.mqttBatteryChargingState;
    this.mqttBatteryStatusLow = device.mqttLowBattery;
    this.mqttUsername = device.mqttUsername;
    this.mqttPassword = device.mqttPassword;

    this.discordWebhook = device.discordWebhook;
    this.discordUsername = device.discordUsername || 'StergoSmart';
    this.discordAvatar = device.discordAvatar || 'https://raw.githubusercontent.com/homebridge/branding/latest/logos/homebridge-color-round-stylized.png';
    this.discordMessage = device.discordMessage;

    this.httpsAgentManager = new HttpsAgentManager(
      this.trustedCert,
      this.ignoreHttpsCertErrors,
      this.sensorUrl,
    );

    // Ensure backward compatibility for shared polling
    this.sharedPolling = device.sharedPolling ?? false; // Default shared polling to false
    this.sharedPollingId = device.sharedPollingId ?? ''; // Default shared polling group ID to an empty string
    this.sharedPollingInterval = device.sharedPollingInterval ?? 60000; // Set the polling interval to 60 sec or from config value

    if (this.sharedPolling && this.sharedPollingId) {
      const sharedPollingInstance = SharedPolling.registerPolling(
        this.sharedPollingId,
        this.sensorUrl,
        this.platform,
        this.sharedPollingInterval, // Set the polling interval to 60 sec or from config value
        this.httpsAgentManager, // ✅ pass HTTPS agent manager
      );
    
      // Subscribe to data updates
      sharedPollingInstance.on('dataUpdated', (data: SharedData) => {
        this.isReachable = true; // ✅ Mark as reachable
        this.updateSensorStatusFromSharedData(data);
      });

      sharedPollingInstance.on('dataError', () => {
        this.isReachable = false; // ❌ Mark as unreachable
      });
    } else if (this.sensorUrl) {
      this.getSensorData();
      setInterval(this.getSensorData.bind(this), this.updateInterval);
    }  

    if ( !this.deviceType ) {
      return;
    }

    if ( this.deviceType === 'Sensor' && ( this.sensorUrl || this.mqttBroker ) ) {

      // set accessory information
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .setCharacteristic(this.platform.Characteristic.Manufacturer, this.deviceManufacturer)
        .setCharacteristic(this.platform.Characteristic.Model, this.deviceModel)
        .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.deviceFirmwareVersion)
        .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceSerialNumber);

      // If we have Config setup for Temperature
      if ( this.temperatureName || this.mqttTemperature ) {
        // get the TemperatureSensor service if it exists, otherwise create a new TemperatureSensor service
        this.temperatureService = this.accessory.getService(this.platform.Service.TemperatureSensor)
          || this.accessory.addService(this.platform.Service.TemperatureSensor);

        // set the service name, this is what is displayed as the default name on the Home app
        // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
        this.temperatureService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);

        //this.service = this.service.addCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity);
        // register handlers for the CurrentTemperature Characteristic
        this.temperatureService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
          .on('get', this.wrapGetHandler('currentTemperature'));
      }

      // If we have Config setup for Humidity
      if ( this.humidityName || this.mqttHumidity ) {
        // get the HumiditySensor service if it exists, otherwise create a new HumiditySensor service
        this.humidityService = this.accessory.getService(this.platform.Service.HumiditySensor)
          || this.accessory.addService(this.platform.Service.HumiditySensor);

        this.humidityService.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.deviceName);

        // register handlers for the CurrentRelativeHumidity Characteristic
        this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
          .on('get', this.wrapGetHandler('currentHumidity'));
      }

      // If we have Config setup for Air Pressure
      // Not implementd yet
      if ( this.airPressureName ) {
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName,': ',this.airPressureName);
        }
      }

      // If we have Config setup for Battery
      if ( this.batteryLevelName || this.batteryChargingStateName || this.batteryStatusLowName ||
          (this.mqttBatteryLevel || this.mqttBatteryChargingState || this.mqttBatteryStatusLow)
      ) {
        this.batteryService = this.accessory.getService(this.platform.Service.Battery)
                            || this.accessory.addService(this.platform.Service.Battery);

        this.batteryService.setCharacteristic( this.platform.Characteristic.Name,
          accessory.context.device.deviceName + ' Battery',
        );

        // Battery Level
        if (this.batteryLevelName || this.mqttBatteryLevel) {
          this.batteryService.getCharacteristic(this.platform.Characteristic.BatteryLevel)
            .on('get', this.wrapGetHandler('currentBatteryLevel'));
        }

        // Charging State
        if (this.batteryChargingStateName || this.mqttBatteryChargingState) {
          this.batteryService.getCharacteristic(this.platform.Characteristic.ChargingState)
            .on('get', this.wrapGetHandler('currentBatteryChargingState'));
        }

        // Status Low Battery
        if (this.batteryStatusLowName || this.mqttBatteryStatusLow) {
          this.batteryService.getCharacteristic(this.platform.Characteristic.StatusLowBattery)
            .on('get', this.wrapGetHandler('currentBatteryStatusLow'));
        }
      }

      // We can now use MQTT
      if ( this.mqttBroker ) {
        this.getSensorDataMQTT();
      }
      
    } 
  }

  private wrapGetHandler(
    stateKey: 'currentTemperature' | 'currentHumidity' | 'currentBatteryLevel' | 'currentBatteryChargingState' | 'currentBatteryStatusLow',
  ): (callback: (error: Error | null, value?: CharacteristicValue) => void) => void {
    return (callback) => {
      if (!this.isReachable) {
        callback(new this.platform.api.hap.HapStatusError(
          this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
        ));
        return;
      }

      callback(null, this[stateKey]);
    };
  }

  private updateSensorStatusFromSharedData( data?: Record<string, unknown> ): void {
    this.processGetSensorStatus(data, true);
  }

  private async getSensorData() {
    if (!this.sensorUrl) {
      this.platform.log.warn(`${this.deviceName}: Ignoring request; No status URL defined.`);
      return;
    }

    try {
      this.isReachable = true;
      const httpsAgent = this.httpsAgentManager.getAgent();
      const response = await axios.get(this.sensorUrl, { timeout: 8000, httpsAgent });
      const data = response.data;
      this.processGetSensorStatus(data, false);
    } catch (error) {
      this.isReachable = false;
      const axiosError = error as AxiosError;
      if (axios.isAxiosError(axiosError)) {
        this.platform.log.warn(`${this.deviceName}: Axios error while fetching JSON:`, axiosError.message);
      } else {
        this.platform.log.warn(`${this.deviceName}: Unknown error occurred while fetching JSON.`);
      }
    }
  }

  private processGetSensorStatus(data: Record<string, unknown> | undefined, isSharedData: boolean ): void {
    if (!data) {
      this.platform.log.warn(`${this.deviceName}: No data available for ${isSharedData ? 'shared data update' : 'fetching Switch state'}.`);
      return;
    }
  
    // If Temperature Service is available
    if (this.temperatureService) {
      if (this.temperatureName) {
        const tmpTemperature = getNestedValue(data, this.temperatureName, 'number');
        
        if (typeof tmpTemperature === 'number') {
          this.currentTemperature = tmpTemperature;
          this.temperatureService.updateCharacteristic( this.platform.Characteristic.CurrentTemperature, this.currentTemperature );
          if ( this.enableLogging ) {
            this.platform.log.info(this.deviceName,': Temperature = ',this.currentTemperature.toString());
          }
        } else {
          this.platform.log.warn(this.deviceName, ': Error: Cannot find or convert: ', this.temperatureName, ' in JSON' );
        }
      } else {
        this.platform.log.warn(this.deviceName, ': Error: Temperature name is not defined');
      }
    }

    // If Humidity Service is available
    if (this.humidityService) {
      if (this.humidityName) {
        const tmpHumidity = getNestedValue(data, this.humidityName, 'number');
    
        if (typeof tmpHumidity === 'number') {
          this.currentHumidity = tmpHumidity;
          this.humidityService.updateCharacteristic( this.platform.Characteristic.CurrentRelativeHumidity, this.currentHumidity );
          if ( this.enableLogging ) {
            this.platform.log.info(this.deviceName,': Humidity = ',this.currentHumidity.toString());
          }
        } else {
          this.platform.log.warn( this.deviceName, ': Error: Cannot find or convert: ', this.humidityName, ' in JSON' );
        }
      } else {
        this.platform.log.warn(this.deviceName, ': Error: Humidity name is not defined');
      }
    }
    
    // If we have Config setup for Air Pressure
    if ( this.airPressureName ) {
      if ( this.enableLogging) {
        this.platform.log.info(this.deviceName,': ',this.airPressureName);
      }
    }

    // If Battery Service is available
    if (this.batteryService) {
      if (this.batteryLevelName) {
        const tmpBatteryLevel = getNestedValue(data, this.batteryLevelName, 'number');

        if (typeof tmpBatteryLevel === 'number') {
          this.currentBatteryLevel = tmpBatteryLevel;
          this.batteryService.updateCharacteristic(this.platform.Characteristic.BatteryLevel, this.currentBatteryLevel);
          if (this.enableLogging) {
            this.platform.log.info(this.deviceName, ': Battery Level = ', this.currentBatteryLevel.toString());
          }
        } else {
          this.platform.log.warn(this.deviceName, ': Error: Cannot find or convert: ', this.batteryLevelName, ' in JSON');
        }
      }

      if (this.batteryChargingStateName) {
        const tmpChargingState = getNestedValue(data, this.batteryChargingStateName, 'number');

        if (typeof tmpChargingState === 'number') {
          this.currentBatteryChargingState = tmpChargingState;
          this.batteryService.updateCharacteristic(this.platform.Characteristic.ChargingState, this.currentBatteryChargingState);
          if (this.enableLogging) {
            this.platform.log.info(this.deviceName, ': Battery Charging State = ', this.currentBatteryChargingState.toString());
          }
        } else {
          this.platform.log.warn(this.deviceName, ': Error: Cannot find or convert: ', this.batteryChargingStateName, ' in JSON');
        }
      }

      if (this.batteryStatusLowName) {
        const tmpStatusLow = getNestedValue(data, this.batteryStatusLowName, 'boolean');

        if (typeof tmpStatusLow === 'boolean') {
          this.currentBatteryStatusLow = tmpStatusLow;
          this.batteryService.updateCharacteristic(this.platform.Characteristic.StatusLowBattery,
            this.currentBatteryStatusLow
              ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
              : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
          if (this.enableLogging) {
            this.platform.log.info(this.deviceName, ': Battery Status Low = ', this.currentBatteryStatusLow.toString());
          }

          // ✅ Send Discord webhook only if battery is low
          if (this.currentBatteryStatusLow && this.discordWebhook) {
            this.initDiscordWebhooks();
          }

        } else {
          this.platform.log.warn(this.deviceName, ': Error: Cannot find or convert: ', this.batteryStatusLowName, ' in JSON');
        }
      }
    }


    if ( this.enableLogging ) {
      // this.platform.log.debug(this.deviceName,': ',JSON.stringify(data));
    }
  }
  
  //
  // Connect to MQTT and update Temperature and Humidity
  private getSensorDataMQTT() {
    const mqttSubscribedTopics: string | string[] | mqtt.ISubscriptionMap = [];

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
      reconnectPeriod: Number(this.mqttReconnectInterval)*1000,
    };  

    if (this.mqttTemperature) {
      mqttSubscribedTopics.push(this.mqttTemperature);
    }
    if (this.mqttHumidity) {
      mqttSubscribedTopics.push(this.mqttHumidity);
    }
    // Subscribe to battery topics
    if (this.mqttBatteryLevel) {
      mqttSubscribedTopics.push(this.mqttBatteryLevel);
    }
    if (this.mqttBatteryChargingState) {
      mqttSubscribedTopics.push(this.mqttBatteryChargingState);
    }
    if (this.mqttBatteryStatusLow) {
      mqttSubscribedTopics.push(this.mqttBatteryStatusLow);
    }

    this.mqttClient = mqtt.connect( mqttOptions);
    
    this.mqttClient.on('connect', () => {
      this.isReachable = true; // ✅ Mark as reachable
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
  
    this.mqttClient.on('message', (topic, message) => {
      //this.platform.log(this.deviceName,': Received message: ${message.toString()}');
      
      if ( topic === this.mqttTemperature ) {
        if ( this.enableLogging) {
          this.platform.log.info(this.deviceName,': Temperature = ',message.toString());
        }
        this.currentTemperature = Number(message.toString());
        this.temperatureService.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.currentTemperature);
      }

      if ( topic === this.mqttHumidity ) {
        if ( this.enableLogging ) {
          this.platform.log.info(this.deviceName,': Humidity = ',message.toString());
        }
        this.currentHumidity = Number(message.toString());
        this.humidityService.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.currentHumidity);
      }

      if (topic === this.mqttBatteryLevel) {
        this.currentBatteryLevel = Number(message.toString());
        this.batteryService?.updateCharacteristic(this.platform.Characteristic.BatteryLevel, this.currentBatteryLevel);
        if (this.enableLogging) {
          this.platform.log.info(this.deviceName, ': Battery Level = ', this.currentBatteryLevel);
        }
      }

      if (topic === this.mqttBatteryChargingState) {
        this.currentBatteryChargingState = Number(message.toString());
        this.batteryService?.updateCharacteristic(this.platform.Characteristic.ChargingState, this.currentBatteryChargingState);
        if (this.enableLogging) {
          this.platform.log.info(this.deviceName, ': Battery Charging State = ', this.currentBatteryChargingState);
        }
      }

      if (topic === this.mqttBatteryStatusLow) {
        const raw = message.toString().trim().toLowerCase();

        if (raw === 'true' || raw === 'false') {
          this.currentBatteryStatusLow = raw === 'true';

          this.batteryService?.updateCharacteristic(
            this.platform.Characteristic.StatusLowBattery,
            this.currentBatteryStatusLow
              ? this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
              : this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL,
          );

          if (this.enableLogging) {
            this.platform.log.info(this.deviceName, ': Battery Status Low = ', raw);
          }
        } else {
          this.platform.log.warn(this.deviceName, ': Invalid Battery Status Low value:', raw);
        }
      }
    });

    this.mqttClient.on('offline', () => {
      this.isReachable = false; // ❌ Mark as unreachable
      this.platform.log.debug(this.deviceName,': Client is offline');
    });

    this.mqttClient.on('reconnect', () => {
      this.platform.log.debug(this.deviceName,': Reconnecting...');
    });
    
    this.mqttClient.on('close', () => {
      this.isReachable = false; // ❌ Mark as unreachable
      this.platform.log.debug(this.deviceName,': Connection closed');
    });
    
    // Handle errors
    this.mqttClient.on('error', (err) => {
      this.isReachable = false; // ❌ Mark as unreachable
      this.platform.log.warn(this.deviceName,': Connection error:', err);
      this.platform.log.warn(this.deviceName, ': Reconnecting in: ', this.mqttReconnectInterval, ' seconds.');
      //this.mqttClient.end();
    });
  }

  private initDiscordWebhooks(): void {
    const message = `${this.deviceName}: LOW BATTERY WARNING!`;
    const discord = new discordWebHooks(this.discordWebhook, this.discordUsername, this.discordAvatar, message);
    
    discord.discordSimpleSend().then((result) => {
      this.platform.log.info(`${this.deviceName}: Discord Webhook result - ${result}`);
    }).catch((error) => {
      this.platform.log.warn(`${this.deviceName}: Discord Webhook error - ${error.message}`);
    });
  }
}
