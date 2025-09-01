import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const EVENT_TYPE = {
    START: 'start',
    STARTED: 'started',
    STOP: 'stop',
    STOPPED: 'stopped',
    READY: 'ready',
    CACHE_UPDATES: 'cache-updates',
    CACHE_DELETIONS: 'cache-deletions',
    REQUEST_CACHE_VERSION: 'request-cache-version',
    CACHE_VERSION_RESPONSE: 'cache-version-response',
    REQUEST_CACHED_DOMAIN_IDS: 'request-cached-domain-ids',
    CACHED_DOMAIN_IDS_RESPONSE: 'cached-domain-ids-response',
    ERROR: 'error'
};

export const STATUS_TYPE = {
    RUNNING: 'running',
    STOPPED: 'stopped',
    STOPPING: 'stopping',
    ERROR: 'error'
};

export class CacheWorkerManager {
    DEFAULT_INTERVAL = 5000;

    constructor(options = {}) {
        this.worker = null;
        this.status = STATUS_TYPE.STOPPED;
        this.onCacheUpdates = null;
        this.onCacheDeletions = null;
        this.onCachedDomainIdsRequest = null;
        this.onError = null;
        this.options = {
            interval: this.DEFAULT_INTERVAL,
            ...options
        };
    }

    #buildEvents(resolve) {
        return new Map([
            [EVENT_TYPE.READY, () => {
                this.worker.postMessage({ type: EVENT_TYPE.START });
            }],
            [EVENT_TYPE.STARTED, () => {
                this.status = STATUS_TYPE.RUNNING;
                resolve();
            }],
            [EVENT_TYPE.STOPPED, () => {
                this.status = STATUS_TYPE.STOPPED;
            }],
            [EVENT_TYPE.CACHE_UPDATES, (message) => {
                if (this.onCacheUpdates) {
                    this.onCacheUpdates(message.updates);
                }
            }],
            [EVENT_TYPE.CACHE_DELETIONS, (message) => {
                if (this.onCacheDeletions) {
                    this.onCacheDeletions(message.deletions);
                }
            }],
            [EVENT_TYPE.REQUEST_CACHE_VERSION, (message) => {
                if (this.onCacheVersionRequest) {
                    this.onCacheVersionRequest(message.domainId);
                }
            }],
            [EVENT_TYPE.REQUEST_CACHED_DOMAIN_IDS, () => {
                if (this.onCachedDomainIdsRequest) {
                    this.onCachedDomainIdsRequest();
                }
            }],
            [EVENT_TYPE.ERROR, (message) => {
                if (this.onError) {
                    this.onError(new Error(message.error));
                }
            }]
        ]);
    }

    start() {
        return new Promise((resolve, reject) => {
            const workerPath = join(__dirname, 'worker.js');
            const eventHandlers = this.#buildEvents(resolve);

            this.worker = new Worker(workerPath, {
                workerData: this.options
            });

            this.worker.on('message', (message) => {
                const handler = eventHandlers.get(message.type);
                if (handler) {
                    handler(message);
                }
            });

            this.worker.on('error', (error) => {
                this.status = STATUS_TYPE.ERROR;
                if (this.onError) {
                    this.onError(error);
                }
                reject(error);
            });

            this.worker.on('exit', (code) => {
                const wasTerminating = this.status === STATUS_TYPE.STOPPING;
                this.status = STATUS_TYPE.STOPPED;
                this.worker = null;
                
                // Only report error if exit code is not 0 and worker wasn't being intentionally stopped
                if (code !== 0 && !wasTerminating) {
                    const error = new Error(`Worker stopped with exit code ${code}`);
                    if (this.onError) {
                        this.onError(error);
                    }
                }
            });
        });
    }

    stop() {
        this.status = STATUS_TYPE.STOPPING;

        return new Promise((resolve) => {
            const cleanup = () => {
                if (this.worker) {
                    this.worker.terminate();
                    this.worker = null;
                }
                this.status = STATUS_TYPE.STOPPED;
                resolve();
            };

            // Set up listeners for graceful shutdown
            const onMessage = (message) => {
                if (message.type === STATUS_TYPE.STOPPED) {
                    if (this.worker) {
                        this.worker.off('message', onMessage);
                    }
                    // Give worker a moment to exit gracefully
                    setTimeout(cleanup, 100);
                }
            };

            this.worker.on('message', onMessage);
            this.worker.postMessage({ type: EVENT_TYPE.STOP });
        });
    }

    getStatus() {
        return this.status;
    }

    setOnCacheUpdates(callback) {
        this.onCacheUpdates = callback;
    }

    setOnCacheDeletions(callback) {
        this.onCacheDeletions = callback;
    }

    setOnCacheVersionRequest(callback) {
        this.onCacheVersionRequest = callback;
    }

    setOnCachedDomainIdsRequest(callback) {
        this.onCachedDomainIdsRequest = callback;
    }

    sendCacheVersionResponse(domainId, cachedVersion) {
        if (this.worker && this.status === STATUS_TYPE.RUNNING) {
            this.worker.postMessage({
                type: EVENT_TYPE.CACHE_VERSION_RESPONSE,
                domainId,
                cachedVersion
            });
        }
    }

    sendCachedDomainIdsResponse(domainIds) {
        if (this.worker && this.status === STATUS_TYPE.RUNNING) {
            this.worker.postMessage({
                type: EVENT_TYPE.CACHED_DOMAIN_IDS_RESPONSE,
                domainIds
            });
        }
    }

    setOnError(callback) {
        this.onError = callback;
    }
}
