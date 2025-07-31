import type { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME, listOfServices  } from './settings.js';

import { IClientOptions }  from 'mqtt';
import { MQTTManager } from './lib/MQTTManager.js';                      // Include MQTTManager

/**
 * Dynamically import services from listOfServices in ./settings.js
 */
const importedServices = await Promise.all(
  listOfServices.map(async ([deviceType, servicePath, className]) => {
    const serviceModule = await import(servicePath);
    return { deviceType, service: serviceModule[className] };
  }),
);

export const serviceMap = Object.assign({}, ...importedServices.map(({ deviceType, service }) => ({ [deviceType]: service })));

/**
 * HomebridgePlatform
 * This class is the main constructor for plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class HttpSensorsAndSwitchesHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  private mqttManager!: MQTTManager;

  

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);
    

    // MQTT insert dynamicaly Add / Destroy Accessory over Platforms Acceessory MQTT Topic
    // Demo creates and destroys Switch
    // Next phase is going to utilize all services in listOfServices using Parameters passed by MQTT Topic
    // and not from Config
    if ( this.config.platform_mqttBroker ) {
      this.log.info('MQTT Broker is configured:', this.config.platform_mqttBroker);
      // Initialize MQTTManager if broker is configured
      const mqttOptions: IClientOptions = {
        keepalive: 10,
        protocol: 'mqtt',
        host: this.config.platform_mqttBroker,
        port: Number(this.config.platform_mqttPort),
        clientId: 'platform-core',
        clean: true,
        username: this.config.platform_mqttUsername,
        password: this.config.platform_mqttPassword,
        rejectUnauthorized: false,
        reconnectPeriod: Number(this.config.platform_mqttReconnectInterval) * 1000,
      };
      
      const topics: string[] = [];
      if (this.config.platform_mqttTopic) {
        topics.push(this.config.platform_mqttTopic);
      }

      this.mqttManager = MQTTManager.getInstance(mqttOptions, log);
      const instanceID = this.mqttManager.instanceID;

      // 🌡️ Subscription handler
      this.mqttManager.subscribeMultiple(topics, (topic, payload) => {

        if (topic === this.config.platform_mqttTopic) {
          const command = payload.trim().toLowerCase();
          const uuid = this.api.hap.uuid.generate('mqtt-demo-switch');
          const existingAccessory = this.accessories.find(acc => acc.UUID === uuid);

          if (command === 'add') {
            log.warn(`[MQTTManager] Creating demo accessory on command: ${command}`);

            if (!existingAccessory) {
              const accessory = new this.api.platformAccessory('MQTT Demo Switch', uuid);
              const switchService = accessory.addService(this.Service.Switch, 'MQTT Demo Switch');

              switchService.getCharacteristic(this.Characteristic.On)
                .onSet((newValue) => {
                  log.info(`[MQTT Demo Switch] Set to ${newValue ? 'ON' : 'OFF'}`);
                });

              this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
              this.accessories.push(accessory);

              log.info('[MQTT Demo Switch] Accessory created and registered');
            } else {
              log.info('[MQTT Demo Switch] Accessory already exists');
            }

          } else if (command === 'destroy') {
            log.warn(`[MQTTManager] Destroying demo accessory on command: ${command}`);

            if (existingAccessory) {
              this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
              this.accessories.splice(this.accessories.indexOf(existingAccessory), 1);
              log.info('[MQTT Demo Switch] Accessory unregistered and removed');
            } else {
              log.info('[MQTT Demo Switch] Accessory does not exist — nothing to destroy');
            }
          } else {
            log.info(`[MQTTManager] Unknown command in payload: ${command}`);
          }
        }
      });

      // ⚠️ Error handling
      this.mqttManager.on('error', (id, err) => {
        if (id !== instanceID) {
          return;
        }
        log.error(`[MQTTManager] Error on device ${id}:`, err.message);
      });

      // 🔌 Connection lifecycle
      this.mqttManager.on('connect', id => {
        if (id !== instanceID) {
          return;
        }
      });

      this.mqttManager.on('disconnect', id => {
        if (id !== instanceID) {
          return;
        }
      });

      this.mqttManager.on('offline', id => {
        if (id !== instanceID) {
          return;
        }
      });

      this.mqttManager.on('reconnect', id => {
        if (id !== instanceID) {
          return;
        }
      });
    }

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to set up event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache, so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an method to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    // Plugin a user-defined array in the platform config.
    const platformConfigDevices = this.config.devices;

    // loop over the discovered devices and register each one if it has not already been registered
    if (Array.isArray(platformConfigDevices)) {
      for (const device of platformConfigDevices) {
        // generate a unique id for the accessory this should be generated from
        // something globally unique, but constant, for example, the device serial
        // number or MAC address
        const uuid = this.api.hap.uuid.generate(device.deviceID);

        // see if an accessory with the same uuid has already been registered and restored from
        // the cached devices we stored in the `configureAccessory` method above
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

        if (existingAccessory) {
          // the accessory already exists
          this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

          // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. e.g.:
          // We will update the existing accessory.context to ensure that changes in the config take effect.
          existingAccessory.context.device = device;
          this.api.updatePlatformAccessories([existingAccessory]);

          // create the accessory handler for the restored accessory
          // dynamically import the service based on the device type set in settings.js
          if (device.deviceType in serviceMap) {
            const ServiceConstructor = serviceMap[device.deviceType];
            new ServiceConstructor(this, existingAccessory);
          } else {
            this.log.warn(`Unsupported device type: ${device.deviceType}`);
          }

          // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, e.g.:
          // remove platform accessories when no longer present
          // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
          // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
        } else {
          // the accessory does not yet exist, so we need to create it
          this.log.info('Adding new accessory:', device.deviceName);

          // create a new accessory
          const accessory = new this.api.platformAccessory(device.deviceName, uuid);

          // store a copy of the device object in the `accessory.context`
          // the `context` property can be used to store any data about the accessory you may need
          accessory.context.device = device;

          // create the accessory handler for the newly create accessory
          // this is imported from `platformAccessory.ts`
          // dynamically import the service based on the device type set in settings.js
          if (device.deviceType in serviceMap) {
            const ServiceConstructor = serviceMap[device.deviceType];
            new ServiceConstructor(this, accessory);
          } else {
            this.log.warn(`Unsupported device type: ${device.deviceType}`);
          }


          // link the accessory to your platform
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        }
      }
    }
  }
}