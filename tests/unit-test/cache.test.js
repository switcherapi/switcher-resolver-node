import mongoose from 'mongoose';
import '../../src/db/mongoose';

import { domainId, setupDatabase } from '../fixtures/db_api';
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

});