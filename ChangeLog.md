v2.0.1 - InProgress
DoorOpener 
Valve - // 0: Generic valve, 1: Irrigation, 2: Shower head, 3: Tap

Todo:

- in processGetDeviceStatusData use new fromConfig: true to set value crom Config not JSON. not to includein loop if fromConfig: true
   that way it will always be from init default value - must investigate

config.schema - DONE

No Response added acros scripts except Shared polling. Shared polling needs logic how to put register devices to No Response
- It will be done over Emit sending Error


Todo:

Fix Sensors MQTT true/false 1/0

All Script updated with this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE in wrapGetHandler() or wrapSetHandler()


Added Valve full support.type State = {
   param: string;
   topic: string;
   webhook: boolean;    // Indicates if the state will be used in a webhook
   setHandler: boolean; // Indicates if the state has SET handler
   fromConfig: boolean; // Indicates if the state Value is going to be taken from the Homebridge device config
 };
extended with fromConfig: boolean; 

it gives instruction that config value should be used