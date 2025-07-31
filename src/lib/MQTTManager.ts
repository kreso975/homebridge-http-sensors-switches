import mqtt, { IClientOptions, IClientPublishOptions, MqttClient } from 'mqtt';
import { EventEmitter } from 'events';
import { Logging } from 'homebridge';

type TopicCallback = (topic: string, message: string) => void;

type MQTTEvents = {
  connect: [string];
  disconnect: [string];
  error: [string, Error];
  reconnect: [string];
  offline: [string];
};

function getBrokerKey(config: IClientOptions): string {
  return `${config.host}:${config.port}:${config.username ?? ''}`;
}

export class MQTTManager {
  private static registry: Map<string, MQTTManager> = new Map();
  private client: MqttClient | null = null;
  private topicHandlers: Map<string, Set<TopicCallback>> = new Map();
  private accessoryMap: Map<TopicCallback, string[]> = new Map(); // 🆕 added registry
  private isConnected = false;

  private static globalDeviceCounter = 0;
  private readonly mqttInstanceID: string;
  private emitter = new EventEmitter();

  private constructor(private readonly config: IClientOptions, private readonly log: Logging) {
    this.mqttInstanceID = `mqttInstance-${++MQTTManager.globalDeviceCounter}`;
  }

  public static getInstance(config: IClientOptions, log: Logging): MQTTManager {
    const key = getBrokerKey(config);
    if (!this.registry.has(key)) {
      const manager = new MQTTManager(config, log);
      manager.connect();
      this.registry.set(key, manager);
      log.warn(`[MQTTManager] Created and registered new device: ${manager.mqttInstanceID}`);
    } else {
      log.warn(`[MQTTManager] Reusing existing instance for broker: ${key}`);
    }

    log.warn(`[MQTTManager] Total MQTTManager instances: ${this.registry.size}`);
    return this.registry.get(key)!;
  }

  public get instanceID(): string {
    return this.mqttInstanceID;
  }

  private connect(): void {
    if (this.client) {
      return;
    }

    this.client = mqtt.connect(this.config);

    this.client.on('connect', () => {
      this.isConnected = true;
      this.log.warn('[MQTTManager] Connected:', this.mqttInstanceID);
      this.emitter.emit('connect', this.mqttInstanceID);
    });

    this.client.on('reconnect', () => {
      this.log.warn('[MQTTManager] Reconnecting:', this.mqttInstanceID);
      this.emitter.emit('reconnect', this.mqttInstanceID);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.log.warn('[MQTTManager] Connection closed:', this.mqttInstanceID);
      this.emitter.emit('disconnect', this.mqttInstanceID);
    });

    this.client.on('offline', () => {
      this.isConnected = false;
      this.log.warn('[MQTTManager] Offline:', this.mqttInstanceID);
      this.emitter.emit('offline', this.mqttInstanceID);
    });

    this.client.on('error', (err: Error) => {
      this.isConnected = false;
      this.log.warn('[MQTTManager] Error:', this.mqttInstanceID, err.message);
      this.handleError(err);
    });

    this.client.on('message', (topic: string, message: Buffer) => {
      const payload = message.toString();
      const handlers = this.topicHandlers.get(topic);
      if (handlers) {
        handlers.forEach(cb => cb(topic, payload));
      }
    });
  }

  private handleError(err: Error): void {
    this.emitter.emit('error', this.mqttInstanceID, err);
  }

  public subscribeMultiple(topics: string[], callback: TopicCallback): void {
    const newTopics: string[] = [];

    for (const topic of topics) {
      const isNew = !this.topicHandlers.has(topic);
      if (isNew) {
        this.topicHandlers.set(topic, new Set<TopicCallback>());
        newTopics.push(topic);
      }

      this.topicHandlers.get(topic)!.add(callback);
      this.log.warn(`[MQTTManager] ${this.mqttInstanceID} added handler for topic: "${topic}"`);
      this.log.warn(`[MQTTManager] Total handlers for "${topic}": ${this.topicHandlers.get(topic)!.size}`);
    }

    this.accessoryMap.set(callback, topics); // 🆕 save callback-to-topic map

    if (newTopics.length > 0) {
      this.client?.subscribe(newTopics, (err) => {
        if (err) {
          this.log.warn('[MQTTManager] Failed to subscribe to topics:', err.message);
        } else {
          this.log.warn(`[MQTTManager] ${this.mqttInstanceID} subscribed to: ${newTopics.join(',')}`);
        }
      });
    } else {
      this.log.warn(`[MQTTManager] ${this.mqttInstanceID} already subscribed to all topics`);
    }
  }

  public removeAccessory(callback: TopicCallback): void {
    this.log.warn(`[MQTTManager] Removing accessory callback from instance: ${this.mqttInstanceID}`);

    const topics = this.accessoryMap.get(callback);
    if (topics) {
      for (const topic of topics) {
        const handlers = this.topicHandlers.get(topic);
        if (handlers) {
          handlers.delete(callback);
          this.log.warn(`[MQTTManager] Removed callback from topic: "${topic}"`);

          if (handlers.size === 0) {
            this.client?.unsubscribe(topic);
            this.topicHandlers.delete(topic);
            this.log.warn(`[MQTTManager] No more handlers, unsubscribed from: "${topic}"`);
          }
        }
      }
      this.accessoryMap.delete(callback); // 🆕 cleanup
    }
  }

  public isReady(): boolean {
    return this.isConnected;
  }

  public publish(topic: string, message: string, options?: IClientPublishOptions): void {
    if (!this.client || !this.isConnected) {
      this.log.warn(`[MQTTManager] Cannot publish, client not connected: ${this.mqttInstanceID}`);
      return;
    }

    this.client.publish(topic, message, options ?? {}, (err) => {
      if (err) {
        this.log.warn(`[MQTTManager] Failed to publish to "${topic}":`, err.message);
        this.handleError(err);
      } else {
        this.log.warn(`[MQTTManager] Published to "${topic}":`, message);
      }
    });
  }

  public on<K extends keyof MQTTEvents>(event: K, listener: (...args: MQTTEvents[K]) => void): void {
    this.emitter.on(event, listener);
  }

  public off<K extends keyof MQTTEvents>(event: K, listener: (...args: MQTTEvents[K]) => void): void {
    this.emitter.off(event, listener);
  }

  public onDeviceError(listener: (id: string, err: Error) => void): void {
    this.emitter.on('error', listener);
  }

  public offDeviceError(listener: (id: string, err: Error) => void): void {
    this.emitter.off('error', listener);
  }
}