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

    test('UNIT_SUITE - Should update cache when new Domain version is available', async () => {
        // test
        cache = Cache.getInstance();
        await cache.initializeCache();
        await cache.startScheduledUpdates({ interval: 500 });

        // assert
        expect(cache.status()).toBe('running');
        const domain = cache.get(domainId);

        // update DB Domain version
        await Domain.findByIdAndUpdate(domainId, { $inc: { lastUpdate: 1 } });
        const { updatedSuccessfully, domainFromCache } = await waitForDomainUpdate(domainId, domain.version, 10, 500);

        expect(domainFromCache).toBeDefined();
        expect(updatedSuccessfully).toBe(true);
    }, 20000);

    test('UNIT_SUITE - Should update cache when new Domain is created', async () => {
        // test
        cache = Cache.getInstance();
        await cache.initializeCache();
        await cache.startScheduledUpdates({ interval: 500 });

        // assert
        expect(cache.status()).toBe('running');

        // create new DB Domain
        const newDomain = await Domain.create({ name: 'New Domain', lastUpdate: 1, owner: new mongoose.Types.ObjectId() });
        await Domain.findByIdAndUpdate(newDomain._id, { $inc: { lastUpdate: 1 } });
        const { updatedSuccessfully, domainFromCache } = await waitForDomainUpdate(newDomain._id, newDomain.lastUpdate, 10, 500);

        expect(domainFromCache).toBeDefined();
        expect(updatedSuccessfully).toBe(true);
    }, 20000);

    test('UNIT_SUITE - Should update cache when Domain is deleted', async () => {
        // test
        cache = Cache.getInstance();
        await cache.initializeCache();
        await cache.startScheduledUpdates({ interval: 500 });

        // assert
        expect(cache.status()).toBe('running');

        // create new DB Domain
        const newDomain = await Domain.create({ name: 'Delete Me', lastUpdate: 1, owner: new mongoose.Types.ObjectId() });
        await Domain.findByIdAndUpdate(newDomain._id, { $inc: { lastUpdate: 1 } });
        let { updatedSuccessfully, domainFromCache } = await waitForDomainUpdate(newDomain._id, newDomain.lastUpdate, 10, 500);

        expect(domainFromCache).toBeDefined();
        expect(updatedSuccessfully).toBe(true);

        // delete DB Domain
        await Domain.findByIdAndDelete(newDomain._id);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        domainFromCache = cache.get(newDomain._id);
        expect(domainFromCache).toBeUndefined();
    }, 20000);
});

// Helpers

async function waitForDomainUpdate(domainId, currentVersion, maxAttempts, delay) {
    let domainFromCache;
    let attempt = 0;
    let updatedSuccessfully = false;

    while (!updatedSuccessfully && attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;

        domainFromCache = cache.get(domainId)
        if (domainFromCache != null) {
            if (domainFromCache.version != currentVersion) {
                updatedSuccessfully = true;
            }
        }
    }

    return { updatedSuccessfully, domainFromCache };
}
