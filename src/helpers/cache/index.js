import { graphql } from 'graphql';
import schema from '../../aggregator/schema.js';
import { getAllDomains } from '../../services/domain.js';
import { domainQuery, reduceSnapshot } from './query.js';
import { CacheWorkerManager } from './worker-manager.js';
import Logger from '../logger.js';

export default class Cache {
    static #instance;
    #snapshotCache;
    #componentCache;
    #workerManager;

    constructor() {
        this.#snapshotCache = new Map();
        this.#componentCache = new Map();
        this.#workerManager = null;
    }

    static getInstance() {
        if (!Cache.#instance) {
            Cache.#instance = new Cache();
        }
        
        return Cache.#instance;
    }

    isEnabled() {
        return process.env.CACHE_SNAPSHOT_MS !== undefined;
    }

    async initializeCache() {
        if (!this.isEnabled()) {
            Logger.info('Cache is disabled. Skipping cache initialization.');
            return;
        }

        Logger.info('Cache is enabled. Initializing cache...');
        const domains = await getAllDomains();

        for (const domain of domains) {
            await this.#updateCache(domain);
        }
    }

    async refreshDomain(domainId) {
        await this.#updateCache({ _id: domainId });
    }

    async startScheduledUpdates(options = {}) {
        if (!this.isEnabled()) {
            Logger.info('Cache is disabled. Skipping scheduled updates.');
            return;
        }

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
            this.#snapshotCache.delete(String(domainId));
        }
    }

    #handleCacheVersionRequest(domainId) {
        const cached = this.#snapshotCache.get(String(domainId));
        this.#workerManager.sendCacheVersionResponse(domainId, cached?.version);
    }

    #handleCachedDomainIdsRequest() {
        const domainIds = Array.from(this.#snapshotCache.keys());
        this.#workerManager.sendCachedDomainIdsResponse(domainIds);
    }

    #set(key, value) {
        this.#snapshotCache.set(String(key), value);
    }
    
    status() {
        return this.#workerManager?.getStatus();
    }

    get(key) {
        return this.#snapshotCache.get(String(key));
    }

    getAll() {
        return this.#snapshotCache;
    }

    // Component cache methods

    isComponentCacheEnabled() {
        return process.env.CACHE_COMPONENT_MS !== undefined;
    }

    refreshComponent(componentId, componentData) {
        this.#componentCache.set(String(componentId), {
            _id: componentId,
            domain: componentData.domain,
            name: componentData.name,
            apihash: componentData.apihash,
            cachedAt: Date.now()
        });
    }

    getComponent(componentId, getComponentByIdfn) {
        const entry = this.#componentCache.get(String(componentId));
        if (!entry) return undefined;

        if (Date.now() - entry.cachedAt > Number(process.env.CACHE_COMPONENT_MS)) {
            getComponentByIdfn(componentId)
                .then(component => this.refreshComponent(componentId, component))
                .catch(() => this.#componentCache.delete(String(componentId)));
        }

        return entry;
    }

}