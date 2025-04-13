// Interfaces for sensor configurations
export interface OccupancySensorInstance {
   paramNameOccupancyDetected: string;
   mqttOccupancyDetected: string;
   paramNameActive?: string;
   mqttActive?: string;
   paramNameFault?: string;
   mqttFault?: string;
   paramNameLowBattery?: string;
   mqttLowBattery?: string;
   paramNameTampered?: string;
   mqttTampered?: string;
 }
 
export interface AirQualitySensorInstance {
   paramNameAirQuality: string;
   mqttAirQuality: string;
   paramNamePM2_5Density?: string;
   mqttPM2_5Density?: string;
   paramNamePM10Density?: string;
   mqttPM10Density?: string;
   paramNameOzoneDensity?: string;
   mqttOzoneDensity?: string;
   paramNameNitrogenDioxideDensity?: string;
   mqttNitrogenDioxideDensity?: string;
   paramNameSulphurDioxideDensity?: string;
   mqttSulphurDioxideDensity?: string;
   paramNameCarbonMonoxideLevel?: string;
   mqttCarbonMonoxideLevel?: string;
   paramNameActive?: string;
   mqttActive?: string;
   paramNameFault?: string;
   mqttFault?: string;
   paramNameLowBattery?: string;
   mqttLowBattery?: string;
   paramNameTampered?: string;
   mqttTampered?: string;
 }

// Export all interfaces together
export type SensorInstance = OccupancySensorInstance | AirQualitySensorInstance;
 
 
export const sensorConfig = {
  OccupancySensor: {
    paramNames: {
      paramNameOccupancyDetected: '',
      paramNameActive: '',
      paramNameFault: '',
      paramNameLowBattery: '',
      paramNameTampered: '',
    },
    mqttTopics: {
      mqttOccupancyDetected: '',
      mqttActive: '',
      mqttFault: '',
      mqttLowBattery: '',
      mqttTampered: '',
    },
    SensorStates: {
      OccupancyDetected: 0,
      StatusActive: 0,
      StatusFault: 0,
      StatusLowBattery: 0,
      StatusTampered: 0,
    },
    SensorStatusRanges: {
      OccupancyDetected: [0, 1] as [number, number],
      StatusActive: [0, 1] as [number, number],
      StatusFault: [0, 1] as [number, number],
      StatusLowBattery: [0, 1] as [number, number],
      StatusTampered: [0, 1] as [number, number],
    },
    getStateDefinition: (instance: OccupancySensorInstance) => [
      { state: 'OccupancyDetected', param: instance.paramNameOccupancyDetected, topic: instance.mqttOccupancyDetected, webhook: true, control: 1 },
      { state: 'StatusActive', param: instance.paramNameActive, topic: instance.mqttActive, webhook: false, control: 0 },
      { state: 'StatusFault', param: instance.paramNameFault, topic: instance.mqttFault, webhook: false, control: 0 },
      { state: 'StatusLowBattery', param: instance.paramNameLowBattery, topic: instance.mqttLowBattery, webhook: true, control: 1 },
      { state: 'StatusTampered', param: instance.paramNameTampered, topic: instance.mqttTampered, webhook: false, control: 0 },
    ],
  },
  AirQualitySensor: {
    paramNames: {
      paramNameAirQuality: '',
      paramNamePM2_5Density: '',
      paramNamePM10Density: '',
      paramNameOzoneDensity: '',
      paramNameNitrogenDioxideDensity: '',
      paramNameSulphurDioxideDensity: '',
      paramNameCarbonMonoxideLevel: '',
      paramNameActive: '',
      paramNameFault: '',
      paramNameLowBattery: '',
      paramNameTampered: '',
    },
    mqttTopics: {
      mqttAirQuality: '',
      mqttPM2_5Density: '',
      mqttPM10Density: '',
      mqttOzoneDensity: '',
      mqttNitrogenDioxideDensity: '',
      mqttSulphurDioxideDensity: '',
      mqttCarbonMonoxideLevel: '',
      mqttActive: '',
      mqttFault: '',
      mqttLowBattery: '',
      mqttTampered: '',
    },
    SensorStates: {
      AirQuality: 0,
      PM2_5Density: 0,
      PM10Density: 0,
      OzoneDensity: 0,
      NitrogenDioxideDensity: 0,
      SulphurDioxideDensity: 0,
      CarbonMonoxideLevel: 0,
      StatusActive: 0,
      StatusFault: 0,
      StatusLowBattery: 0,
      StatusTampered: 0,
    },
    SensorStatusRanges: {
      AirQuality: [0, 100] as [number, number],
      PM2_5Density: [0, 100] as [number, number],
      PM10Density: [0, 100] as [number, number],
      OzoneDensity: [0, 100] as [number, number],
      NitrogenDioxideDensity: [0, 100] as [number, number],
      SulphurDioxideDensity: [0, 100] as [number, number],
      CarbonMonoxideLevel: [0, 100] as [number, number],
      StatusActive: [0, 1] as [number, number],
      StatusFault: [0, 1] as [number, number],
      StatusLowBattery: [0, 1] as [number, number],
      StatusTampered: [0, 1] as [number, number],
    },
    getStateDefinition: (instance: AirQualitySensorInstance) => [
      { state: 'AirQuality', param: instance.paramNameAirQuality, topic: instance.mqttAirQuality, webhook: false, control: 0 },
      { state: 'PM2_5Density', param: instance.paramNamePM2_5Density, topic: instance.mqttPM2_5Density, webhook: false, control: 0 },
      { state: 'PM10Density', param: instance.paramNamePM10Density, topic: instance.mqttPM10Density, webhook: false, control: 0 },
      { state: 'OzoneDensity', param: instance.paramNameOzoneDensity, topic: instance.mqttOzoneDensity, webhook: false, control: 0 },
      { state: 'NitrogenDioxideDensity', param: instance.paramNameNitrogenDioxideDensity, 
        topic: instance.mqttNitrogenDioxideDensity, webhook: false, control: 0 },
      { state: 'SulphurDioxideDensity', param: instance.paramNameSulphurDioxideDensity, topic: instance.mqttSulphurDioxideDensity, webhook: false, control: 0 },
      { state: 'CarbonMonoxideLevel', param: instance.paramNameCarbonMonoxideLevel, topic: instance.mqttCarbonMonoxideLevel, webhook: false, control: 0 },
      { state: 'StatusActive', param: instance.paramNameActive, topic: instance.mqttActive, webhook: false, control: 0 },
      { state: 'StatusFault', param: instance.paramNameFault, topic: instance.mqttFault, webhook: false, control: 0 },
      { state: 'StatusLowBattery', param: instance.paramNameLowBattery, topic: instance.mqttLowBattery, webhook: true, control: 1 },
      { state: 'StatusTampered', param: instance.paramNameTampered, topic: instance.mqttTampered, webhook: false, control: 0 },
    ],
  },
};
 
 
 
 