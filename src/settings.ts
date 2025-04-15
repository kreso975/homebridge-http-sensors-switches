/**
 * This is the name of the platform that users will use to register the plugin in the Homebridge config.json
 */
export const PLATFORM_NAME = 'HttpSensorsAndSwitches';

/**
 * This must match the name of your plugin as defined the package.json
 */
export const PLUGIN_NAME = 'homebridge-http-sensors-switches';

/**
 * This is a list of services that will be imported and registered with the platform
 */
export const listOfServices = [
  ['Switch', './platformSwitchServices.js', 'platformSwitch'],
  ['Sensor', './platformSensorServices.js', 'platformSensors'],
  ['Outlet', './platformOutletServices.js', 'platformOutlet'],
  ['LightBulb', './platformLightBulbServices.js', 'platformLightBulb'],
  ['Fan', './platformFanServices.js', 'platformFan'],
  ['MotionSensor', './platformSensorGenericServices.js', 'platformSensorGeneric'],
  ['ContactSensor', './platformSensorGenericServices.js', 'platformSensorGeneric'],
  ['LightSensor', './platformSensorGenericServices.js', 'platformSensorGeneric'],
  ['CarbonDioxideSensor', './platformSensorGenericServices.js', 'platformSensorGeneric'],
  ['SmokeSensor', './platformSensorGenericServices.js', 'platformSensorGeneric'],
  ['OccupancySensor', './platformSensorGenericServices.js', 'platformSensorGeneric'],
  ['AirQualitySensor', './platformSensorGenericServices.js', 'platformSensorGeneric'],
];
