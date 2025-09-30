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