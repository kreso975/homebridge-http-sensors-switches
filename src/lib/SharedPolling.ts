import axios, { AxiosError } from 'axios';

// Define the type for shared data
type SharedData = Record<string, unknown>;

// Define the log interface with explicitly typed methods
interface Logger {
  info(message: string): void;
  error(message: string): void;
}

/**
 * The `SharedPolling` class provides a centralized polling mechanism for devices that share a common data source.
 * It minimizes redundant HTTP requests by grouping devices under a shared polling instance, identified by a unique ID.
 * Each instance fetches data from a specified URL at regular intervals and distributes the data to all grouped devices.
 *
 * ### Key Features:
 * - **Shared Polling:** Groups devices under a common polling instance for efficient data retrieval.
 * - **Dynamic Grouping:** Dynamically adds or removes devices from a polling group.
 * - **Centralized Data Management:** Maintains the latest fetched data for easy access by devices.
 * - **Error Handling:** Logs errors encountered during polling and ensures graceful failure recovery.
 *
 * ### Use Cases:
 * - Environmental sensors (e.g., temperature, humidity, pressure) sharing a single data source.
 * - Multiple devices (e.g., switches, outlets) relying on a single status URL.
 * - Dynamic addition or removal of devices within a shared polling group.
 *
 * ### Public Methods:
 * - `registerPolling(uniqueId: string, url: string, log: Logger): SharedPolling`:
 *   Registers a new shared polling instance or adds a device to an existing instance.
 *
 * - `unregisterPolling(uniqueId: string, log: Logger): void`:
 *   Removes a device from a polling group. If no devices remain in the group, stops polling.
 *
 * - `getData(): SharedData`:
 *   Retrieves the latest data fetched by the polling instance.
 *
 * ### Private Methods:
 * - `startPolling(): void`:
 *   Starts polling the specified URL at a fixed interval (e.g., every 5 seconds).
 *
 * - `stopPolling(): void`:
 *   Stops the polling process and clears the interval.
 *
 * - `fetchData(): Promise<void>`:
 *   Performs an HTTP GET request to fetch the data and updates the internal state.
 *
 * ### Internal Structure:
 * - Maintains a `pollingInstances` Map to associate unique IDs with polling instances and device counts.
 * - Stores fetched data in a `data` property, accessible via `getData()`.
 *
 * ### Example Usage:
 * ```typescript
 * // Register a shared polling instance
 * const sharedPolling = SharedPolling.registerPolling(
 *   "environmentGroup",
 *   "http://example.com/status",
 *   loggerInstance
 * );
 *
 * // Access the fetched data
 * const data = sharedPolling.getData();
 * console.log(data.temperature); // Example: 23.5
 *
 * // Unregister a device from polling
 * SharedPolling.unregisterPolling("environmentGroup", loggerInstance);
 * ```
 */
export class SharedPolling {
  private static pollingInstances: Map<string, { instance: SharedPolling; deviceCount: number }> = new Map();
  private intervalId?: NodeJS.Timeout;
  private data: SharedData = {};
 
  private constructor(private readonly url: string, private readonly log: Logger) {}
 
  // Register a shared polling instance
  static registerPolling(uniqueId: string, url: string, log: Logger): SharedPolling {
    if (SharedPolling.pollingInstances.has(uniqueId)) {
      const group = SharedPolling.pollingInstances.get(uniqueId)!;
      group.deviceCount += 1;
      log.info(`Device added to existing SharedPolling group: "${uniqueId}". Total devices: ${group.deviceCount}`);
      return group.instance;
    }
 
    log.info(`Registering new SharedPolling instance for group: "${uniqueId}"`);
    const instance = new SharedPolling(url, log);
    SharedPolling.pollingInstances.set(uniqueId, { instance, deviceCount: 1 });
    instance.startPolling();
    return instance;
  }
 
  // Unregister a device from shared polling
  static unregisterPolling(uniqueId: string, log: Logger): void {
    const group = SharedPolling.pollingInstances.get(uniqueId);
    if (group) {
      group.deviceCount -= 1;
      log.info(`Device removed from SharedPolling group: "${uniqueId}". Remaining devices: ${group.deviceCount}`);
 
      if (group.deviceCount === 0) {
        group.instance.stopPolling();
        SharedPolling.pollingInstances.delete(uniqueId);
        log.info(`Stopped polling for group: "${uniqueId}" as no devices remain.`);
      }
    }
  }
 
  private startPolling(): void {
    this.log.info(`Started polling for URL: ${this.url}`);
    this.fetchData();
    this.intervalId = setInterval(() => {
      this.fetchData();
    }, 5000); // Poll every 5 seconds
  }
 
  private stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.log.info(`Stopped polling for URL: ${this.url}`);
    }
  }
 
  private async fetchData(): Promise<void> {
    try {
      const response = await axios.get(this.url);
      this.data = response.data as SharedData;
      this.log.info(`Updated data for URL: ${this.url}`);
    } catch (error) {
      const errorMessage = (error as AxiosError).message;
      this.log.error(`Error fetching data for URL: ${this.url} - ${errorMessage}`);
    }
  }
 
  getData(): SharedData {
    return this.data;
  }
}
 
