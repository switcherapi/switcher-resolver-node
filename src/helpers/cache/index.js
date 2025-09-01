import { graphql } from 'graphql';
import schema from '../../aggregator/schema.js';
import { getAllDomains } from '../../services/domain.js';
import { domainQuery, reduceSnapshot } from './query.js';
import { CacheWorkerManager } from './worker-manager.js';
import Logger from '../logger.js';

export default class Cache {
    #instance;
    #workerManager;

    constructor() {
        this.#instance = new Map();
        this.#workerManager = null;
    }

    static getInstance() {
        if (!Cache.instance) {
            Cache.instance = new Cache();
        }
        
        return Cache.instance;
    }

    async initializeCache() {
        const domains = await getAllDomains();

        for (const domain of domains) {
            await this.#updateCache(domain);
        }
    }

    async startScheduledUpdates(options = {}) {
        this.#workerManager = new CacheWorkerManager({
            onCacheUpdates: (updates) => this.#handleCacheUpdates(updates),
            onCacheDeletions: (deletions) => this.#handleCacheDeletions(deletions),
            onCacheVersionRequest: (domainId) => this.#handleCacheVersionRequest(domainId),
            onCachedDomainIdsRequest: () => this.#handleCachedDomainIdsRequest(),
            onError: (error) => Logger.error('Cache worker error:', error)
        }, options);

        await this.#workerManager.start();
    }

    async stopScheduledUpdates() {
        await this.#workerManager?.stop();
        this.#workerManager = null;
    }

    async #updateCache(domain) {
        const result = await graphql({
            schema,
            source: domainQuery(domain._id),
            contextValue: { domain: domain._id }
        });

        this.#set(domain._id, {
            data: reduceSnapshot(result.data.domain),
            version: result.data.domain.version
        });
    }

    #handleCacheUpdates(updates) {
        for (const update of updates) {
            this.#set(update.domainId, {
                data: update.data,
                version: update.version
            });
        }
    }

    #handleCacheDeletions(deletions) {
        for (const domainId of deletions) {
            this.#instance.delete(String(domainId));
        }
    }

    #handleCacheVersionRequest(domainId) {
        const cached = this.#instance.get(String(domainId));
        this.#workerManager.sendCacheVersionResponse(domainId, cached?.version);
    }

    #handleCachedDomainIdsRequest() {
        const domainIds = Array.from(this.#instance.keys());
        this.#workerManager.sendCachedDomainIdsResponse(domainIds);
    }

    #set(key, value) {
        this.#instance.set(String(key), value);
    }
    
    status() {
        return this.#workerManager.getStatus();
    }

    get(key) {
        return this.#instance.get(String(key));
    }

    getAll() {
        return this.#instance;
    }
}