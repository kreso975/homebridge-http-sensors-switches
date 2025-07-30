## [ongoing] - 2025-07-30

### 🚀 MQTTManager Refactor

- Refactored `MQTTManager` to use `EventEmitter` for lifecycle event handling
- Removed manual listener arrays (`connectListeners`, `errorListeners`, etc.)
- Introduced unified `.on()` and `.off()` API with strict typing via `MQTTEvents`
- Improved scalability for multiple devices across shared or separate brokers
- Added per-device error handling via `registerDeviceErrorHandler(deviceId, handler)`
- Ensured event routing is filtered by `clientId` to prevent cross-device interference
- Cleaned up unused types and redundant logic
- Simplified `initMQTT()` integration with declarative event subscriptions

### 🧠 Architectural Benefits

- Centralized event dispatching
- Type-safe and extensible event model
- Cleaner separation of concerns
- Easier to maintain and extend for future MQTT features