## [ongoing] - 2025-07-30

### 🚀 MQTTManager Refactor

- Refactored `MQTTManager` to use `EventEmitter` for lifecycle event handling
- Removed manual listener arrays (`connectListeners`, `errorListeners`, etc.)
- Introduced unified `.on()` and `.off()` API with strict typing via `MQTTEvents`
- Improved scalability for multiple devices across shared or separate brokers
- Added per-device error handling via `registerDeviceErrorHandler(deviceId, handler)`
- Replaced `clientId` filtering with scoped `mqttInstanceID` per broker instance to ensure proper event isolation
- Cleaned up unused types and redundant logic
- Updated `initMQTT()` integration to support declarative configuration of event subscriptions and error handlers

### 🧠 Architectural Benefits

- Centralized event handling for each MQTT broker. When different devices use the same broker settings, MQTTManager recognizes this and smartly reuses the same connection. This avoids unnecessary duplication, saves system resources, and keeps communication efficient. Events from all devices tied to the same broker are still properly separated, so things stay clean and manageable.
- Type-safe and extensible event model
- Cleaner separation of concerns between device and broker layers
- Easier to maintain and extend for future MQTT features