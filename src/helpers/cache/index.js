import { graphql } from 'graphql';
import schema from '../../aggregator/schema.js';
import { getAllDomains } from '../../services/domain.js';
import { domainQuery, reduceSnapshot } from './query.js';

export default class Cache {
    #instance;

    constructor() {
        this.#instance = new Map();
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

    async #updateCache(domain) {
        const result = await graphql({
            schema,
            source: domainQuery(domain._id),
            contextValue: { domain: domain._id }
        });

        this.#set(domain._id, reduceSnapshot(result.data.domain));
    }

    #set(key, value) {
        this.#instance.set(String(key), value);
    }

    get(key) {
        return this.#instance.get(String(key));
    }

    getAll() {
        return this.#instance;
    }
}