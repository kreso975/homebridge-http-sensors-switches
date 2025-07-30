import mqtt, { IClientOptions, IClientPublishOptions, MqttClient } from 'mqtt';
import { EventEmitter } from 'events';
import { Logging } from 'homebridge';

type TopicCallback = (topic: string, message: string) => void;
type DeviceErrorHandler = (err: Error) => void;

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
  private isConnected = false;

  private deviceErrorHandlers: Map<string, DeviceErrorHandler> = new Map();
  private clientId: string;
  private emitter = new EventEmitter();

  private constructor(private readonly config: IClientOptions, private readonly log: Logging) {
    this.clientId = config.clientId ?? 'unknown-client';
  }

  static getInstance(config: IClientOptions, log: Logging): MQTTManager {
    const key = getBrokerKey(config);
    if (!this.registry.has(key)) {
      const manager = new MQTTManager(config, log);
      manager.connect();
      this.registry.set(key, manager);
      log.warn(`[MQTTManager] Created new instance for broker: ${key}`);
    } else {
      log.warn(`[MQTTManager] Reusing existing instance for broker: ${key}`);
    }

    log.warn(`[MQTTManager] Total MQTTManager instances: ${this.registry.size}`);
    return this.registry.get(key)!;
  }

  private connect(): void {
    if (this.client) {
      return;
    }

    this.client = mqtt.connect(this.config);

    this.client.on('connect', () => {
      this.isConnected = true;
      this.log.warn('[MQTTManager] Connected:', this.clientId);
      this.emitter.emit('connect', this.clientId);
    });

    this.client.on('reconnect', () => {
      this.log.warn('[MQTTManager] Reconnecting:', this.clientId);
      this.emitter.emit('reconnect', this.clientId);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.log.warn('[MQTTManager] Connection closed:', this.clientId);
      this.emitter.emit('disconnect', this.clientId);
    });

    this.client.on('offline', () => {
      this.isConnected = false;
      this.log.warn('[MQTTManager] Offline:', this.clientId);
      this.emitter.emit('offline', this.clientId);
    });

    this.client.on('error', (err: Error) => {
      this.isConnected = false;
      this.log.warn('[MQTTManager] Error:', this.clientId, err.message);
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
    const deviceHandler = this.deviceErrorHandlers.get(this.clientId);
    if (deviceHandler) {
      deviceHandler(err);
    }

    this.emitter.emit('error', this.clientId, err);
  }

  public registerDeviceErrorHandler(deviceId: string, handler: DeviceErrorHandler): void {
    this.deviceErrorHandlers.set(deviceId, handler);
    this.log.warn(`[MQTTManager] Registered device error handler for: ${deviceId}`);
    this.log.warn(`[MQTTManager] Total devices registered: ${this.deviceErrorHandlers.size}`);
  }

  public subscribeMultiple(deviceId: string, topics: string[], callback: TopicCallback): void {
    const newTopics: string[] = [];

    topics.forEach(topic => {
      const isNew = !this.topicHandlers.has(topic);
      if (isNew) {
        this.topicHandlers.set(topic, new Set<TopicCallback>());
        newTopics.push(topic);
      }

      this.topicHandlers.get(topic)?.add(callback);
      this.log.warn(`[MQTTManager] ${deviceId} added handler for topic: "${topic}"`);
      this.log.warn(`[MQTTManager] Total handlers for "${topic}": ${this.topicHandlers.get(topic)?.size}`);
    });

    if (newTopics.length > 0) {
      this.client?.subscribe(newTopics, (err) => {
        if (err) {
          this.log.warn(`[MQTTManager] Failed to subscribe to topics for ${deviceId}:`, err.message);
        } else {
          this.log.warn(`[MQTTManager] ${deviceId} subscribed to topics: ${newTopics.join(',')}`);
        }
      });
    } else {
      this.log.warn(`[MQTTManager] ${deviceId} already subscribed to all topics`);
    }

    this.log.warn(`[MQTTManager] Total devices using this instance: ${this.deviceErrorHandlers.size}`);
  }

  unsubscribe(topic: string, callback: TopicCallback): void {
    const handlers = this.topicHandlers.get(topic);
    if (handlers) {
      handlers.delete(callback);
      this.log.warn(`[MQTTManager] Unsubscribed one handler from topic: "${topic}"`);
      if (handlers.size === 0) {
        this.client?.unsubscribe(topic);
        this.topicHandlers.delete(topic);
        this.log.warn(`[MQTTManager] No more handlers, unsubscribed from topic: "${topic}"`);
      } else {
        this.log.warn(`[MQTTManager] Remaining handlers for "${topic}": ${handlers.size}`);
      }
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }

  public publish(topic: string, message: string, options?: IClientPublishOptions): void {
    if (!this.client || !this.isConnected) {
      this.log.warn(`[MQTTManager] Cannot publish, client not connected: ${this.clientId}`);
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
}