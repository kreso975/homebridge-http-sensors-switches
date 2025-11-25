
type Sensor = {
  defaultValue: number;
  range: [number, number];
};

type State = {
  param: string;
  topic: string;
  webhook: boolean;
};

type SensorConfig = {
  paramNames: string[];
  sensors: Record<string, Sensor>;
  states: Record<string, State>;
};

type Sensors = Record<string, SensorConfig>;

export const sensorConfig: Sensors = {
  OccupancySensor: {
    paramNames: [
      'OccupancyDetected',
      'StatusActive',
      'StatusFault',
      'StatusLowBattery',
      'StatusTampered',
    ],
    sensors: {
      OccupancyDetected: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusActive: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusFault: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusLowBattery: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusTampered: { defaultValue: 0, range: [0, 1] as [number, number] },
    },
    states: {
      OccupancyDetected: { param: 'OccupancyDetected', topic: 'OccupancyDetected', webhook: true },
      StatusActive: { param: 'StatusActive', topic: 'StatusActive', webhook: false },
      StatusFault: { param: 'StatusFault', topic: 'StatusFault', webhook: false },
      StatusLowBattery: { param: 'StatusLowBattery', topic: 'StatusLowBattery', webhook: true },
      StatusTampered: { param: 'StatusTampered', topic: 'StatusTampered', webhook: false },
    },
  },
  Battery: {
    paramNames: [
      'BatteryLevel',
      'ChargingState',
      'StatusLowBattery',
    ],
    sensors: {
      BatteryLevel: { defaultValue: 100, range: [0, 100] as [number, number] }, // Reports the current battery percentage (0–100%)
      ChargingState: { defaultValue: 0, range: [0, 2] as [number, number] }, // 0: Not charging, 1: Charging, 2: Not chargeable
      StatusLowBattery: { defaultValue: 0, range: [0, 1] as [number, number] }, // 0: Battery level is normal, 1: Battery level is low

    },
    states: {
      BatteryLevel: { param: 'BatteryLevel', topic: 'BatteryLevel', webhook: false },
      ChargingState: { param: 'StatusChargingBattery', topic: 'StatusChargingBattery', webhook: false },
      StatusLowBattery: { param: 'StatusLowBattery', topic: 'StatusLowBattery', webhook: true },
    },
  },
  MotionSensor: {
    paramNames: [
      'MotionDetected',
      'StatusActive',
      'StatusFault',
      'StatusLowBattery',
      'StatusTampered',
    ],
    sensors: {
      MotionDetected: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusActive: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusFault: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusLowBattery: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusTampered: { defaultValue: 0, range: [0, 1] as [number, number] },
    },
    states: {
      MotionDetected: { param: 'MotionDetected', topic: 'MotionDetected', webhook: true },
      StatusActive: { param: 'StatusActive', topic: 'StatusActive', webhook: false },
      StatusFault: { param: 'StatusFault', topic: 'StatusFault', webhook: false },
      StatusLowBattery: { param: 'StatusLowBattery', topic: 'StatusLowBattery', webhook: true },
      StatusTampered: { param: 'StatusTampered', topic: 'StatusTampered', webhook: false },
    },
  },
  ContactSensor: {
    paramNames: [
      'ContactSensorState',
      'StatusActive',
      'StatusFault',
      'StatusLowBattery',
      'StatusTampered',
    ],
    sensors: {
      ContactSensorState: { defaultValue: 0, range: [0, 1] as [number, number] }, // 0: Contact detected (closed), 1: Contact not detected (open)
      StatusActive: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusFault: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusLowBattery: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusTampered: { defaultValue: 0, range: [0, 1] as [number, number] },
    },
    states: {
      ContactSensorState: { param: 'ContactSensorState', topic: 'ContactSensorState', webhook: true },
      StatusActive: { param: 'StatusActive', topic: 'StatusActive', webhook: false },
      StatusFault: { param: 'StatusFault', topic: 'StatusFault', webhook: false },
      StatusLowBattery: { param: 'StatusLowBattery', topic: 'StatusLowBattery', webhook: true },
      StatusTampered: { param: 'StatusTampered', topic: 'StatusTampered', webhook: false },
    },
  },
  LightSensor: {
    paramNames: [
      'CurrentAmbientLightLevel',
      'StatusActive',
      'StatusFault',
      'StatusLowBattery',
      'StatusTampered',
    ],
    sensors: {
      CurrentAmbientLightLevel: { defaultValue: 0, range: [0.0001, 100000] as [number, number] }, // Valid values: 0.0001 to 100000 lux
      StatusActive: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusFault: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusLowBattery: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusTampered: { defaultValue: 0, range: [0, 1] as [number, number] },
    },
    states: {
      CurrentAmbientLightLevel: { param: 'CurrentAmbientLightLevel', topic: 'CurrentAmbientLightLevel', webhook: false },
      StatusActive: { param: 'StatusActive', topic: 'StatusActive', webhook: false },
      StatusFault: { param: 'StatusFault', topic: 'StatusFault', webhook: false },
      StatusLowBattery: { param: 'StatusLowBattery', topic: 'StatusLowBattery', webhook: true },
      StatusTampered: { param: 'StatusTampered', topic: 'StatusTampered', webhook: false },
    },
  },
  CarbonDioxideSensor: {
    paramNames: [
      'CarbonDioxideDetected',
      'CarbonDioxideLevel',
      'CarbonDioxidePeakLevel',
      'StatusActive',
      'StatusFault',
      'StatusLowBattery',
      'StatusTampered',
    ],
    sensors: {
      CarbonDioxideDetected: { defaultValue: 0, range: [0, 1] as [number, number] },
      CarbonDioxideLevel: { defaultValue: 0, range: [0, 5000] as [number, number] },
      CarbonDioxidePeakLevel: { defaultValue: 0, range: [0, 5000] as [number, number] },
      StatusActive: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusFault: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusLowBattery: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusTampered: { defaultValue: 0, range: [0, 1] as [number, number] },
    },
    states: {
      CarbonDioxideDetected: { param: 'CO2Detected', topic: 'CO2Detected', webhook: true },
      CarbonDioxideLevel: { param: 'CO2Level', topic: 'CO2Level', webhook: false },
      CarbonDioxidePeakLevel: { param: 'CO2PeakLevel', topic: 'CO2PeakLevel', webhook: false },
      StatusActive: { param: 'StatusActive', topic: 'StatusActive', webhook: false },
      StatusFault: { param: 'StatusFault', topic: 'StatusFault', webhook: false },
      StatusLowBattery: { param: 'StatusLowBattery', topic: 'StatusLowBattery', webhook: true },
      StatusTampered: { param: 'StatusTampered', topic: 'StatusTampered', webhook: false },
    },
  },
  SmokeSensor: {
    paramNames: [
      'SmokeDetected',
      'StatusActive',
      'StatusFault',
      'StatusLowBattery',
      'StatusTampered',
    ],
    sensors: {
      SmokeDetected: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusActive: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusFault: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusLowBattery: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusTampered: { defaultValue: 0, range: [0, 1] as [number, number] },
    },
    states: {
      SmokeDetected: { param: 'SmokeDetected', topic: 'SmokeDetected', webhook: true },
      StatusActive: { param: 'StatusActive', topic: 'StatusActive', webhook: false },
      StatusFault: { param: 'StatusFault', topic: 'StatusFault', webhook: false },
      StatusLowBattery: { param: 'StatusLowBattery', topic: 'StatusLowBattery', webhook: true },
      StatusTampered: { param: 'StatusTampered', topic: 'StatusTampered', webhook: false },
    },
  },
  AirQualitySensor: {
    paramNames: [
      'AirQuality',
      'PM2_5Density',
      'PM10Density',
      'OzoneDensity',
      'NitrogenDioxideDensity',
      'SulphurDioxideDensity',
      'CarbonMonoxideLevel',
      'VOCDensity',
      'StatusActive',
      'StatusFault',
      'StatusLowBattery',
      'StatusTampered',
    ],
    sensors: {
      // Valid values: 0 (No Air Quality), 1 (Good), 2 (Fair), 3 (Moderate), 4 (Poor), 5 (Very Poor)
      AirQuality: { defaultValue: 0, range: [0, 5] as [number, number] },                 
      PM2_5Density: { defaultValue: 0, range: [0, 500] as [number, number] },   // Valid values: 0 to 500
      PM10Density: { defaultValue: 0, range: [0, 500] as [number, number] },    // Valid values: 0 to 500
      OzoneDensity: { defaultValue: 0, range: [0, 1000] as [number, number] },  // Valid values: 0 to 1000
      NitrogenDioxideDensity: { defaultValue: 0, range: [0, 1000] as [number, number] },  // Valid values: 0 to 1000
      SulphurDioxideDensity: { defaultValue: 0, range: [0, 1000] as [number, number] },   // Valid values: 0 to 1000
      CarbonMonoxideLevel: { defaultValue: 0, range: [0, 1000] as [number, number] },     // Valid values: 0 to 1000
      VOCDensity: { defaultValue: 0, range: [0, 1000] as [number, number] },      // Valid values: 0 to 1000
      StatusActive: { defaultValue: 0, range: [0, 1] as [number, number] },       // Valid values: 0 (Inactive), 1 (Active)
      StatusFault: { defaultValue: 0, range: [0, 1] as [number, number] },        // Valid values: 0 (No Fault), 1 (Fault Detected)
      StatusLowBattery: { defaultValue: 0, range: [0, 1] as [number, number] },   // Valid values: 0 (Battery OK), 1 (Low Battery)
      StatusTampered: { defaultValue: 0, range: [0, 1] as [number, number] },     // Valid values: 0 (No Tampering), 1 (Tampered)
    },
    states: {
      AirQuality: { param: 'AirQuality', topic: 'AirQuality', webhook: false },
      PM2_5Density: { param: 'PM2_5Density', topic: 'PM2_5Density', webhook: false },
      PM10Density: { param: 'PM10Density', topic: 'PM10Density', webhook: false },
      OzoneDensity: { param: 'OzoneDensity', topic: 'OzoneDensity', webhook: false },
      NitrogenDioxideDensity: { param: 'NitrogenDioxideDensity', topic: 'NitrogenDioxideDensity', webhook: false },
      SulphurDioxideDensity: { param: 'SulphurDioxideDensity', topic: 'SulphurDioxideDensity', webhook: false },
      CarbonMonoxideLevel: { param: 'CarbonMonoxideLevel', topic: 'CarbonMonoxideLevel', webhook: false },
      VOCDensity: { param: 'VOCDensity', topic: 'VOCDensity', webhook: false },
      StatusActive: { param: 'StatusActive', topic: 'StatusActive', webhook: false },
      StatusFault: { param: 'StatusFault', topic: 'StatusFault', webhook: false },
      StatusLowBattery: { param: 'StatusLowBattery', topic: 'StatusLowBattery', webhook: true },
      StatusTampered: { param: 'StatusTampered', topic: 'StatusTampered', webhook: false },
    },
  },
  // Add more sensor types here if needed
};
