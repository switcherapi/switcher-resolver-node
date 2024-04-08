import mongoose from 'mongoose';
import { 
    SwitcherKeys,
    getRateLimit
} from '../../src/external/switcher-api-facade';
import { 
    setupDatabase, 
    domainDocument,
    component1,
    component1Key
} from '../fixtures/db_api';
import { Switcher, checkValue } from 'switcher-client';
import ExecutionLogger from 'switcher-client/src/lib/utils/executionLogger';

import '../../src/db/mongoose';

afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
    process.env.SWITCHER_API_ENABLE = false;
});

describe('Testing Switcher API Facade', () => {
    beforeAll(setupDatabase);

    beforeEach(() => {
        process.env.SWITCHER_API_ENABLE = true;
    });

    test('UNIT_API_FACADE - Should read rate limit - 100 Request Per Minute', async () => {
        const call = async () => {
            Switcher.assume(SwitcherKeys.RATE_LIMIT).true();
            ExecutionLogger.add(
                { message: JSON.stringify({ rate_limit: 100 }) }, 
                SwitcherKeys.RATE_LIMIT,
                [checkValue(domainDocument.owner.toString())]
            );

            return getRateLimit(component1Key, component1);
        }; 

        await expect(call()).resolves.toBe(100);
    });

    test('UNIT_API_FACADE - Should NOT read rate limit - Default Request Per Minute', async () => {
        const call = async () => {
            Switcher.assume(SwitcherKeys.RATE_LIMIT).false();
            return getRateLimit(component1Key, component1);
        }; 

        await expect(call()).resolves.toBe(parseInt(process.env.MAX_REQUEST_PER_MINUTE));
    });

});