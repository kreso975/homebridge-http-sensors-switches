## Changelog
### [v2.0.0] - 10.4.2025 - In Development
- **Feature Added**: Introduced `sharedPolling` to support efficient polling for devices sharing the same data source.
- **PlatformSwitch Enhancements**:
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

- **PlatformSmokeSensor Class**:
  - Added a new class `platformSmoke` to support devices monitoring smoke detection.
  - Integrated a new service for managing and reporting smoke detection data.
  - Integrated support for `sharedPolling` to optimize data retrieval processes.
  - Support Discord:
    - Detect Smoke
    - Low Battery
    - Tampered Status
  - Added support for the `getNestedValue` function to process nested JSON data.  
  
- **PlatformOccupancySensor Class**:
  - Added a new class `platformOccupancy` to support devices monitoring occupancy detection.
  - Integrated a new service for managing and reporting occupancy detection data.
  - Integrated support for `sharedPolling` to optimize data retrieval processes.
  - Support Discord:
    - Detect Occupancy
    - Low Battery
    - Tampered Status
  - Added support for the `getNestedValue` function to process nested JSON data.  
  
- **PlatformAirQualitySensor Class**:
  - Added a new class `platformAirQuality` to support devices monitoring air quality levels.
  - Integrated a new service for managing and reporting air quality data.
  - Integrated support for `sharedPolling` to optimize data retrieval processes.
  - Support Discord:
    - Detect Air Quality (e.g., PM2.5, PM10, Ozone levels)
    - Low Battery
    - Tampered Status
  - Added support for the `getNestedValue` function to process nested JSON data.

  
  - **SensorGenericServices Class**:
  - It will replace single file handlers
  - settings in platformSensorGenerisSettings.ts
  - ADDED support: platformCarbonDioxide, platformOccupancy


