

export const sensorConfig = {
  OccupancySensor: {
    paramNames: [
      'OccupancyDetected',
      'Active',
      'Fault',
      'LowBattery',
      'Tampered',
    ],
    sensors: {
      OccupancyDetected: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusActive: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusFault: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusLowBattery: { defaultValue: 0, range: [0, 1] as [number, number] },
      StatusTampered: { defaultValue: 0, range: [0, 1] as [number, number] },
    },
    states: {
      OccupancyDetected: { param: 'OccupancyDetected', topic: 'mqttTopics.OccupancyDetected', webhook: true, control: 1 },
      StatusActive: { param: 'Active', topic: 'mqttTopics.Active', webhook: false, control: 0 },
      StatusFault: { param: 'Fault', topic: 'mqttTopics.Fault', webhook: false, control: 0 },
      StatusLowBattery: { param: 'LowBattery', topic: 'mqttTopics.LowBattery', webhook: true, control: 1 },
      StatusTampered: { param: 'Tampered', topic: 'mqttTopics.Tampered', webhook: false, control: 0 },
    },
  },
  CarbonDioxideSensor: {
    paramNames: [
      'CarbonDioxideDetected',
      'CarbonDioxideLevel',
      'CarbonDioxidePeakLevel',
      'Active',
      'Fault',
      'LowBattery',
      'Tampered',
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
      CarbonDioxideDetected: { param: 'CarbonDioxideDetected', topic: 'mqttTopics.CO2Detected', webhook: true, control: 1 },
      CarbonDioxideLevel: { param: 'CarbonDioxideLevel', topic: 'mqttTopics.CO2Level', webhook: false, control: 0 },
      CarbonDioxidePeakLevel: { param: 'CarbonDioxidePeakLevel', topic: 'mqttTopics.CO2PeakLevel', webhook: false, control: 0 },
      StatusActive: { param: 'Active', topic: 'mqttTopics.Active', webhook: false, control: 0 },
      StatusFault: { param: 'Fault', topic: 'mqttTopics.Fault', webhook: false, control: 0 },
      StatusLowBattery: { param: 'LowBattery', topic: 'mqttTopics.LowBattery', webhook: true, control: 1 },
      StatusTampered: { param: 'Tampered', topic: 'mqttTopics.Tampered', webhook: false, control: 0 },
    },
  },
  // Add more sensor types here if needed
};
