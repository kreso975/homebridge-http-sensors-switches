## Changelog
### [v2.0.0] - 10.4.2025 - In Development

- **IMPORTANT**:
  - **Motion Sensor:** Config updated. Users must update Accessory.


- **Feature Added**: Introduced `sharedPolling` to support efficient polling for devices sharing the same data source.
  - **Shared Polling:** Groups devices under a common polling instance for efficient data retrieval.
    - **Dynamic Grouping:** Dynamically adds or removes devices from a polling group.
    - **Centralized Data Management:** Maintains the latest fetched data for easy access by devices.
    - **Customizable Polling Intervals:** Allows the polling interval to be set dynamically when registering a shared polling instance.
    - **Event-Based Updates:** Notifies devices in the group about data updates using an event-driven architecture.
    - **Error Handling:** Logs errors encountered during polling and ensures graceful failure recovery.

- **Switch & Outlet & Light Bulb & Fan Enhancements**:
  - Upgraded to fully integrate with `sharedPolling`.  
  - Added support for the `getNestedValue` function to process nested JSON data.  

- **PlatformSensor Enhancements**:
  - Upgraded to fully integrate with `sharedPolling`.

- **PlatformCarbonDioxide Class**:
  - Added a new class `platformCarbonDioxide` to support devices monitoring carbon dioxide levels.
  - Integrated a new service for managing and reporting CO₂ data.
  - Integrated support for `sharedPolling` to optimize data retrieval processes.
  - Support Discord:
    - Detect CO₂
    - Low Battery
  - Added support for the `getNestedValue` function to process nested JSON data.

- **Smoke Sensor**:
  - Added a new class `platformSmoke` to support devices monitoring smoke detection.
  - Integrated a new service for managing and reporting smoke detection data.
  - Integrated support for `sharedPolling` to optimize data retrieval processes.
  - Support Discord:
    - Detect Smoke
    - Low Battery
    - Tampered Status
  - Added support for the `getNestedValue` function to process nested JSON data.  
  
- **Occupancy Sensor**:
  - Added a new class `platformOccupancy` to support devices monitoring occupancy detection.
  - Integrated a new service for managing and reporting occupancy detection data.
  - Integrated support for `sharedPolling` to optimize data retrieval processes.
  - Support Discord:
    - Detect Occupancy
    - Low Battery
    - Tampered Status
  - Added support for the `getNestedValue` function to process nested JSON data.  

- **Contact Sensor**:
  - Added a new sensor `Contact sensor` to support devices monitoring Sensor state.
  - Integrated a new service for managing and reporting Contact state data.
  - Integrated support for `sharedPolling` to optimize data retrieval processes.
  - Support Discord:
    - Contact State
    - Low Battery
    - Tampered Status
  - Added support for the `getNestedValue` function to process nested JSON data.  

- **Light Sensor**:
  - Added a new sensor `Light sensor` to support devices represents the current ambient light level detected by the sensor..
  - Integrated a new service for managing and reporting current ambient light level data.
  - Integrated support for `sharedPolling` to optimize data retrieval processes.
  - Support Discord:
    - Low Battery
    - Tampered Status
  - Added support for the `getNestedValue` function to process nested JSON data.  
  
- **Air Quality Sensor**:
  - Added a new class `platformAirQuality` to support devices monitoring air quality levels.
  - Integrated a new service for managing and reporting air quality data.
  - Integrated support for `sharedPolling` to optimize data retrieval processes.
  - Support Discord:
    - Detect Air Quality (e.g., PM2.5, PM10, Ozone levels)
    - Low Battery
    - Tampered Status
  - Added support for the `getNestedValue` function to process nested JSON data.

  
- **SensorGenericServices Class**:
  - Replace all single file handlers except Temerature and Humidity (Practical reasons)
  - settings in platformSensorGenerisSettings.ts
  


