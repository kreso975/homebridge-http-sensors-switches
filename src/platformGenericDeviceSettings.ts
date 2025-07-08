type State = {
   param: string;
   topic: string;
   webhook: boolean;    // Indicates if the state will be used in a webhook
   setHandler: boolean; // Indicates if the state has SET handler
   fromConfig: boolean; // Indicates if the state Value is going to be taken from the Homebridge device config
 };
 
 type Device = {
   paramNames: string[];
   sensors: Record<string, { defaultValue: number; range: [number, number] }>;
   states: Record<string, State>;
 };
 
 type DeviceConfig = Record<string, Device>;

export const deviceConfig: DeviceConfig = {
  Fan: {
    paramNames: [
      'Active',
      'RotationSpeed',
      'RotationDirection',
      'SwingMode',
      'CurrentFanState',
      'TargetFanState',
    ],
    sensors: {
      Active: { defaultValue: 0, range: [0, 1] as [number, number] },             // Values: 0 (Inactive), 1 (Active). (On/Off)
      RotationSpeed: { defaultValue: 0, range: [0, 100] as [number, number] },    // Range:  0% to 100%.
      RotationDirection: { defaultValue: 0, range: [0, 1] as [number, number] },  // Values: 0 Clockwise, 1: Counterclockwise
      SwingMode: { defaultValue: 0, range: [0, 1] as [number, number] },          // Values: 0 (Disabled), 1 (Enabled)
      CurrentFanState: { defaultValue: 0, range: [0, 2] as [number, number] },    // Valid values: 0 (Inactive), 1 (Idle), 2 (Blowing Air)
      TargetFanState: { defaultValue: 0, range: [0, 1] as [number, number] },     // Valid values: 0 (Manual), 1 (Automatic)
    },
    states: {
      Active: { param: 'StatusActive', topic: 'Switch', webhook: true, setHandler: true, fromConfig: false },
      RotationSpeed: { param: 'RotationSpeed', topic: 'RotationSpeed', webhook: false, setHandler: true, fromConfig: false },
      RotationDirection: { param: 'RotationDirection', topic: 'RotationDirection', webhook: false, setHandler: true, fromConfig: false },
      SwingMode: { param: 'SwingMode', topic: 'SwingMode', webhook: false, setHandler: true, fromConfig: false },
      CurrentFanState: { param: 'CurrentFanState', topic: 'CurrentFanState', webhook: false, setHandler: false, fromConfig: false },
      TargetFanState: { param: 'TargetFanState', topic: 'TargetFanState', webhook: false, setHandler: true, fromConfig: false },
    },
  },
  GarageDoorOpener: {
    paramNames: [
      'TargetDoorState',
      'CurrentDoorState',
      'ObstructionDetected',
      'StatusJammed',
    ],
    sensors: {
      TargetDoorState: { defaultValue: 0, range: [0, 1] as [number, number] },     // Values: 0 (Open), 1 (Closed).
      CurrentDoorState: { defaultValue: 0, range: [0, 4] as [number, number] },    // 0: Open, 1: Closed, 2: Opening, 3: Closing, 4: Stopped
      ObstructionDetected: { defaultValue: 0, range: [0, 1] as [number, number] }, // Values: 0 false, 1: true
      StatusJammed: { defaultValue: 0, range: [0, 1] as [number, number] },        // Values: 0 (not jammed), 1 (jammed)
    },
    states: {
      TargetDoorState: { param: 'TargetDoorState', topic: 'TargetDoorState', webhook: true, setHandler: true, fromConfig: false },
      CurrentDoorState: { param: 'CurrentDoorState', topic: 'CurrentDoorState', webhook: false, setHandler: false, fromConfig: false },
      ObstructionDetected: { param: 'ObstructionDetected', topic: 'ObstructionDetected', webhook: false, setHandler: false, fromConfig: false },
      StatusJammed: { param: 'StatusJammed', topic: 'StatusJammed', webhook: false, setHandler: false, fromConfig: false },
    },
  },
  DoorOpener: {
    paramNames: [
      'TargetPosition',
      'CurrentPosition',
      'PositionState',
      'ObstructionDetected',
      'StatusJammed',
    ],
    sensors: {
      TargetPosition: { defaultValue: 0, range: [0, 100] as [number, number] },     // Range: 0 (Closed), 100 (Open).
      CurrentPosition: { defaultValue: 0, range: [0, 100] as [number, number] },    // Range:  0% to 100%. 0 closed - 100 open
      PositionState: { defaultValue: 2, range: [0, 2] as [number, number] },        // Values: 0 (Closing), 1 (Opening), 2 (Stopped)
      ObstructionDetected: { defaultValue: 0, range: [0, 1] as [number, number] },  // Values: 0 false, 1: true
      StatusJammed: { defaultValue: 0, range: [0, 1] as [number, number] },         // Values: 0 (not jammed), 1 (jammed)
    },
    states: {
      TargetPosition: { param: 'TargetPosition', topic: 'TargetPosition', webhook: true, setHandler: true, fromConfig: false },
      CurrentPosition: { param: 'CurrentPosition', topic: 'CurrentPosition', webhook: false, setHandler: false, fromConfig: false },
      PositionState: { param: 'PositionState', topic: 'PositionState', webhook: false, setHandler: false, fromConfig: false },
      ObstructionDetected: { param: 'ObstructionDetected', topic: 'ObstructionDetected', webhook: false, setHandler: false, fromConfig: false },
      StatusJammed: { param: 'StatusJammed', topic: 'StatusJammed', webhook: false, setHandler: false, fromConfig: false },
    },
  },
  Window: {
    paramNames: [
      'TargetPosition',
      'CurrentPosition',
      'PositionState',
    ],
    sensors: {
      TargetPosition: { defaultValue: 0, range: [0, 100] as [number, number] },    // Range: 0 (Fully Closed) to 100 (Fully Open)
      CurrentPosition: { defaultValue: 0, range: [0, 100] as [number, number] },   // Range: 0 (Fully Closed) to 100 (Fully Open)
      PositionState: { defaultValue: 0, range: [0, 2] as [number, number] },       // Values: 0: Decreasing, 1: Increasing, 2: Stopped
    },
    states: {
      TargetPosition: { param: 'TargetPosition', topic: 'TargetPosition', webhook: false, setHandler: true, fromConfig: false },
      CurrentPosition: { param: 'CurrentPosition', topic: 'CurrentPosition', webhook: false, setHandler: false, fromConfig: false },
      PositionState: { param: 'PositionState', topic: 'PositionState', webhook: false, setHandler: false, fromConfig: false },
    },
  },
  WindowCovering: {
    paramNames: [
      'TargetPosition',
      'CurrentPosition',
      'PositionState',
      'HoldPosition',
      'StatusJammed',
    ],
    sensors: {
      TargetPosition: { defaultValue: 0, range: [0, 100] as [number, number] },   // Range: 0 (Fully Closed) to 100 (Fully Open)
      CurrentPosition: { defaultValue: 0, range: [0, 100] as [number, number] },  // Range: 0 (Fully Closed) to 100 (Fully Open)
      PositionState: { defaultValue: 0, range: [0, 2] as [number, number] },      // Values: 0: Closing, 1: Opening, 2: Stopped
      HoldPosition: { defaultValue: 0, range: [0, 1] as [number, number] },       // Values: 0: false, 1: true
      StatusJammed: { defaultValue: 0, range: [0, 1] as [number, number] },       // Values: 0: false, 1: true
    },
    states: {
      TargetPosition: { param: 'TargetPosition', topic: 'TargetPosition', webhook: false, setHandler: true, fromConfig: false },
      CurrentPosition: { param: 'CurrentPosition', topic: 'CurrentPosition', webhook: false, setHandler: false, fromConfig: false },
      PositionState: { param: 'PositionState', topic: 'PositionState', webhook: false, setHandler: false, fromConfig: false },
      HoldPosition: { param: 'HoldPosition', topic: 'HoldPosition', webhook: false, setHandler: true, fromConfig: false },
      StatusJammed: { param: 'StatusJammed', topic: 'StatusJammed', webhook: false, setHandler: false, fromConfig: false },
    },
  },
  Valve: {
    paramNames: [
      'Active',
      'InUse',
      'ValveType',
    ],
    sensors: {
      Active: { defaultValue: 0, range: [0, 1] as [number, number] },     // Values: 0 (Inactive), 1 (Active). (On/Off)
      InUse: { defaultValue: 0, range: [0, 1] as [number, number] },      // Values: 0 (Not in Use), 1 (In Use).
      ValveType: { defaultValue: 1, range: [0, 3] as [number, number] },  // 0: Generic valve, 1: Irrigation, 2: Shower head, 3: Tap
    },
    states: {
      Active: { param: 'StatusActive', topic: 'Active', webhook: false, setHandler: true, fromConfig: false },
      InUse: { param: 'InUse', topic: 'InUse', webhook: false, setHandler: false, fromConfig: false },
      ValveType: { param: 'ValveType', topic: 'ValveType', webhook: false, setHandler: false, fromConfig: true },
    },
  },
  // Add more sensor types here if needed
};
 