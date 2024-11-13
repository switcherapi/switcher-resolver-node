import { graphql } from 'graphql';
import schema from '../../client/schema.js';
import { getAllDomains } from '../../services/domain.js';
import { domainQuery, reduceSnapshot } from './query.js';

class Cache {
    constructor() {
        this.cache = new Map();
    }

    async initializeCache() {
        const domains = await getAllDomains();

        for (const domain of domains) {
            const result = await graphql({
                schema,
                source: domainQuery(domain._id),
                contextValue: { domain: domain._id }
            });
        
            this.#set(domain._id, reduceSnapshot(result.data.domain));
        }
    }

    #set(key, value) {
        this.cache.set(key, value);
    }

    get(key) {
        return this.cache.get(key);
    }

    getAll() {
        return this.cache;
    }
}

const cache = new Cache();

export default cache;