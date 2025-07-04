import mongoose from 'mongoose';
import { resolveValidation } from '../../../src/services/relay';
import sinon from 'sinon';
import axios from 'axios';
import { RelayMethods } from '../../../src/models/config';
import { StrategiesType } from '../../../src/models/config-strategy';
import { EnvType } from '../../../src/models/environment';
import { Client } from 'switcher-client';

import '../../../src/app';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing Client Relay', () => {

    let axiosStub;

    beforeAll(() => {
        process.env.SWITCHER_API_ENABLE = true;
    });

    test('CLIENT_RELAY_SUITE - Should resolve validation', async () => {
        // mock
        axiosStub = sinon.stub(axios, 'get');

        // given
        const mockRelayService = { data: { result: true, reason: 'Success' } };
        axiosStub.returns(Promise.resolve(mockRelayService));
        Client.assume('HTTPS_AGENT').true();

        const relay = {
            endpoint: {
                default: 'https://localhost'
            },
            method: RelayMethods.GET,
            auth_prefix: 'Bearer',
            auth_token: {
                default: 'token'
            }
        };

        const entry = [{
            strategy: StrategiesType.VALUE,
            input: 'test'
        }];

        const res = await resolveValidation(relay, entry, EnvType.DEFAULT);
        expect(res.result).toBe(true);
    });

});