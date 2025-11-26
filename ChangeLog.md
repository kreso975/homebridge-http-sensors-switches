## [2.4.0] - in progress


## [2.3.0] - 2025-11-25
### ⚠️ Breaking Changes
- Dropped support for Node.js v18  
- Minimum required Node.js version is now **v20.18**
- config.schema.json converted to Array do to UI issues in homebridge-config-ui-x 5.9 amd newer. There is still tabarray version available,
rename file config.schema.json.tabarray BUT use it only with up to homebridge-config-ui-x 5.8 version

### ✅ New Features
- Added support for Node.js v24  
- Battery monitoring added to Temperature/Humidity accessory  
- Introduced accessory-only Battery service

### 🛠️ Improvements
- Updated `package.json` with fixes and adjustments  
- Enhanced `config.schema.json` structure


## [2.2.0] - 2025-09-30

### Added
- ✅ Support for self-signed HTTPS certificates via new `HttpsAgentManager` class.
- ✅ UI configuration option `ignoreHttpsCertErrors` to skip certificate validation when needed.
- ✅ UI field `trustedCert` to provide inline PEM certificate content directly in config.
- ✅ Centralized HTTPS agent logic with caching to avoid redundant instantiation.
- ✅ Integrated HTTPS agent support across all polling methods (sensor, switch, outlet, lightbulb).

### Changed
- 🔄 Refactored all polling classes to use shared `HttpsAgentManager` for secure and consistent HTTPS handling.
- 🔄 Improved error logging for Axios HTTPS failures, including certificate-related issues.

### Fixed
- 🛠 Prevented duplicate HTTP requests in shared polling scenarios.
- 🛠 Ensured HTTPS agent is only instantiated when required, with runtime checks for lean operation.

