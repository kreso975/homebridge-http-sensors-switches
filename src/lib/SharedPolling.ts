import { HttpSensorsAndSwitchesHomebridgePlatform } from './../platform.js';
import axios, { AxiosError } from 'axios';
import { EventEmitter } from 'events';

// Define the type for shared data
export type SharedData = Record<string, unknown>;

/**
 * The `SharedPolling` class provides a centralized polling mechanism for devices that share a common data source.
 * It minimizes redundant HTTP requests by grouping devices under a shared polling instance, identified by a unique ID.
 * Each instance fetches data from a specified URL at customizable intervals and distributes the data to all grouped devices.
 *
 * ### Key Features:
 * - **Shared Polling:** Groups devices under a common polling instance for efficient data retrieval.
 * - **Dynamic Grouping:** Dynamically adds or removes devices from a polling group.
 * - **Centralized Data Management:** Maintains the latest fetched data for easy access by devices.
 * - **Customizable Polling Intervals:** Allows the polling interval to be set dynamically when registering a shared polling instance.
 * - **Event-Based Updates:** Notifies devices in the group about data updates using an event-driven architecture.
 * - **Error Handling:** Logs errors encountered during polling and ensures graceful failure recovery.
 *
 * ### Use Cases:
 * - Environmental sensors (e.g., temperature, humidity, pressure) sharing a single data source.
 * - Multiple devices (e.g., switches, outlets) relying on a single status URL.
 * - Dynamic addition or removal of devices within a shared polling group.
 * - Varying polling intervals based on the needs of different devices or groups.
 *
 * ### Public Methods:
 * - `registerPolling(uniqueId: string, url: string, platform: HttpSensorsAndSwitchesHomebridgePlatform, interval: number = 5000): SharedPolling`:
 *   Registers a new shared polling instance or adds a device to an existing instance. Accepts a polling interval in milliseconds, defaulting to 5000ms.
 *
 * - `unregisterPolling(uniqueId: string): void`:
 *   Removes a device from a polling group. If no devices remain in the group, stops polling.
 *
 * - `getData(): SharedData`:
 *   Retrieves the latest data fetched by the polling instance.
 *
 * ### Private Methods:
 * - `startPolling(): void`:
 *   Starts polling the specified URL at the defined interval. The interval is customizable and passed during instance registration.
 *
 * - `stopPolling(): void`:
 *   Stops the polling process and clears the interval.
 *
 * - `fetchData(): Promise<void>`:
 *   Performs an HTTP GET request to fetch the data and updates the internal state. Emits a `dataUpdated` event to notify all subscribers.
 *
 * ### Internal Structure:
 * - Maintains a `pollingInstances` Map to associate unique IDs with polling instances and device counts.
 * - Stores fetched data in a `data` property, accessible via `getData()`.
 * - Uses an event-driven approach to notify devices in the group about data updates.
 *
 * ### Example Usage:
 * ```typescript
 * // Register a shared polling instance with a 10-second interval
 * const sharedPolling = SharedPolling.registerPolling(
 *   "environmentGroup",
 *   "http://example.com/status",
 *   platformInstance,
 *   10000 // Set polling interval to 10 seconds
 * );
 *
 * // Subscribe to data updates
 * sharedPolling.on('dataUpdated', (data: SharedData) => {
 *   console.log('Data updated:', data);
 * });
 *
 * // Access the fetched data
 * const data = sharedPolling.getData();
 * console.log(data.temperature); // Example: 23.5
 *
 * // Unregister a device from polling
 * SharedPolling.unregisterPolling("environmentGroup");
 * ```
 */
export class SharedPolling extends EventEmitter {
  private static pollingInstances: Map<string, SharedPolling> = new Map();
  private intervalId?: NodeJS.Timeout;
  private data: SharedData = {};
  private deviceCount: number = 0;
  private interval: number; // Polling interval in milliseconds

  // Constructor with platform for logging and interval
  private constructor(
    private readonly url: string,
    private readonly platform: HttpSensorsAndSwitchesHomebridgePlatform,
    interval: number, // Add interval parameter
  ) {
    super();
    this.interval = interval;
  }

  // Register a shared polling instance
  static registerPolling(
    uniqueId: string,
    url: string,
    platform: HttpSensorsAndSwitchesHomebridgePlatform,
    interval: number = 5000, // Default interval to 5000ms
  ): SharedPolling {
    let instance = SharedPolling.pollingInstances.get(uniqueId);

    if ( instance ) {
      instance.deviceCount += 1;
      instance.platform.log.info( `${uniqueId}: Device added to existing SharedPolling group. Total devices: ${instance.deviceCount}` );
    } else {
      platform.log.info( `${uniqueId}: Registering new SharedPolling instance for group: ${uniqueId}` );
      instance = new SharedPolling(url, platform, interval);
      instance.deviceCount = 1;
      SharedPolling.pollingInstances.set(uniqueId, instance);
      instance.startPolling();
    }

    return instance;
  }

  // Unregister a device from shared polling
  static unregisterPolling(uniqueId: string): void {
    const instance = SharedPolling.pollingInstances.get(uniqueId);

    if (instance) {
      instance.deviceCount -= 1;
      instance.platform.log.debug( `${uniqueId}: Device removed from SharedPolling group. Remaining devices: ${instance.deviceCount}` );

      if (instance.deviceCount === 0) {
        instance.stopPolling();
        SharedPolling.pollingInstances.delete(uniqueId);
        instance.platform.log.debug( `${uniqueId}: Stopped polling as no devices remain.` );
      }
    } else {
      console.warn(`${uniqueId}: No polling group found to unregister.`);
    }
  }

  // Start polling
  private startPolling(): void {
    this.platform.log.debug( `Started polling for URL: ${this.url} with interval: ${this.interval}ms` );
    this.fetchData(); // Initial data fetch
    this.intervalId = setInterval(() => { 
      this.fetchData();
    }, this.interval); // Use dynamic interval
  }

  // Stop polling
  private stopPolling(): void {
    if ( this.intervalId ) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      this.platform.log.debug(`Stopped polling for URL: ${this.url}`);
    }
  }

  // Fetch data
  private async fetchData(): Promise<void> {
    try {
      const response = await axios.get(this.url, { timeout: 8000 });
      this.data = response.data as SharedData;

      // Emit an event to notify .on('dataUpdated') listeners
      this.emit('dataUpdated', this.data);

      this.platform.log.debug(`Updated data for URL: ${this.url}`);
    } catch (error) {
      // If necessary, emit an error event here so the device can be marked as "No Response"
      const errorMessage = (error as AxiosError).message;
      this.platform.log.debug( `Error fetching data for URL: ${this.url} - ${errorMessage}` );
    }
  }

  // Get the latest data
  getData(): SharedData {
    return this.data;
  }
}
