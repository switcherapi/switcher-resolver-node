import mongoose from 'mongoose';
import '../../src/db/mongoose';

import { domainId, setupDatabase } from '../fixtures/db_api';
import Domain from '../../src/models/domain';
import Cache from '../../src/helpers/cache';

let cache;

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Test cache', () => {

    beforeAll(setupDatabase);

    beforeEach(() => {
        cache = Cache.getInstance();
    });

    afterEach(async () => {
        await cache.stopScheduledUpdates();
    });

    test('UNIT_SUITE - Should initialize cache', async () => {
        // test
        cache = Cache.getInstance();
        await cache.initializeCache();

        //assert
        const cacheData = cache.getAll();
        const cacheSingle = cache.get(domainId);
        
        expect(cacheData.size).toBeGreaterThan(0);
        expect(cacheSingle).toBeDefined();
    });

    test('UNIT_SUITE - Should initialize schduled cache update', async () => {
        // test
        cache = Cache.getInstance();
        await cache.initializeCache();
        await cache.startScheduledUpdates();

        // assert
        expect(cache.status()).toBe('running');
    });

    test('UNIT_SUITE - Should update cache when new domain version is available', async () => {
        // test
        cache = Cache.getInstance();
        await cache.initializeCache();
        await cache.startScheduledUpdates();

        // assert
        expect(cache.status()).toBe('running');
        const domain = cache.get(domainId);

        // update DB Domain version
        await Domain.findByIdAndUpdate(domainId, { $inc: { lastUpdate: 1 } });
        const { updatedSuccessfully, domainFromCache } = await waitForDomainUpdate(domain.version, 10, 1000);

        expect(domainFromCache).toBeDefined();
        expect(updatedSuccessfully).toBe(true);
    }, 20000);

});

// Helpers

async function waitForDomainUpdate(currentDomainVersion, maxAttempts, delay) {
    let domainFromCache;
    let attempt = 0;
    let updatedSuccessfully = false;

    while (!updatedSuccessfully && attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;

        domainFromCache = cache.get(domainId);
        if (domainFromCache.version != currentDomainVersion) {
            updatedSuccessfully = true;
        }
    }
    return { updatedSuccessfully, domainFromCache };
}
