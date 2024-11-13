import mongoose from 'mongoose';
import '../../src/db/mongoose';

import { setupDatabase } from '../fixtures/db_api';
import cache from '../../src/helpers/cache';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Test cache', () => {
    beforeAll(setupDatabase);

    test('UNIT_SUITE - Should initialize cache', async () => {
        await cache.initializeCache();

        const cacheData = cache.getAll();
        expect(cacheData.size).toBeGreaterThan(0);
        expect(cacheData.get(cacheData.keys().next().value)).toBeDefined();
    });

});