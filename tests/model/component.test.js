import '../../src/db/mongoose';

import mongoose from 'mongoose';
import { 
    setupDatabase,
    adminMasterAccountId,
    domainId,
    domainDocument
 } from '../fixtures/db_api';
import Component from '../../src/models/component';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing component authentication', () => {
    beforeAll(async () => await setupDatabase());

    test('COMPONENT_MODEL - Should authenticate component using new API key format', async () => {
        // given
        const componentId = new mongoose.Types.ObjectId();
        const component = new Component({
            _id: componentId,
            name: 'TestNewAPIKey',
            description: 'Test app with New API key',
            domain: domainId,
            owner: adminMasterAccountId
        });

        // That
        const generatedApiKey = await component.generateApiKey();
        
        // test
        const result = await Component.findByCredentials(domainDocument.name, component.name, generatedApiKey);
        expect(result.component).not.toBe(undefined);
    });

});
