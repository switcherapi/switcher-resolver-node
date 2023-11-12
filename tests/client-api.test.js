import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import { Config } from '../src/models/config';
import Component from '../src/models/component';
import { ConfigStrategy, StrategiesType, OperationsType } from '../src/models/config-strategy';
import { EnvType } from '../src/models/environment';
import { adminMasterAccountId } from './fixtures/db_api';
import { Metric } from '../src/models/metric';
import * as graphqlUtils from './graphql-utils';
import { 
    setupDatabase,
    apiKey,
    keyConfig,
    keyConfigPrdQA,
    configId,
    groupConfigId,
    domainId,
    domainDocument,
    configStrategyUSERId,
    component1
} from './fixtures/db_client';

const changeStrategy = async (strategyId, newOperation, status, environment) => {
    const strategy = await ConfigStrategy.findById(strategyId).exec();
    strategy.operation = newOperation || strategy.operation;
    strategy.activated.set(environment, status !== undefined ? status : strategy.activated.get(environment));
    strategy.updatedBy = adminMasterAccountId;
    await strategy.save();
};

const changeConfigStatus = async (configid, status, environment) => {
    const config = await Config.findById(configid).exec();
    config.activated.set(environment, status !== undefined ? status : config.activated.get(environment));
    config.updatedBy = adminMasterAccountId;
    await config.save();
};

const changeConfigDisableMetricFlag = async (configid, status, environment) => {
    const config = await Config.findById(configid).exec();
    if (!config.disable_metrics)
        config.disable_metrics = new Map;

    config.disable_metrics.set(environment, status);
    config.updatedBy = adminMasterAccountId;
    await config.save();
};

const changeGroupConfigStatus = async (groupconfigid, status, environment) => {
    const groupConfig = await GroupConfig.findById(groupconfigid).exec();
    groupConfig.activated.set(environment, status !== undefined ? status : groupConfig.activated.get(environment));
    groupConfig.updatedBy = adminMasterAccountId;
    await groupConfig.save();
};

const changeDomainStatus = async (domainid, status, environment) => {
    const domain = await Domain.findById(domainid).exec();
    domain.activated.set(environment, status !== undefined ? status : domain.activated.get(environment));
    domain.updatedBy = adminMasterAccountId;
    await domain.save();
};

const createRequestAuth = async () => {
    return request(app)
        .post('/criteria/auth')
        .set('switcher-api-key', `${apiKey}`)
        .send({
            domain: domainDocument.name,
            component: component1.name,
            environment: EnvType.DEFAULT
        });
};

beforeAll(setupDatabase);

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing criteria [GraphQL] ', () => {
    let token;

    beforeAll(async () => {
        const response = await createRequestAuth();
        token = response.body.token;
    });

    afterAll(setupDatabase);

    test('CLIENT_SUITE - Should return success on a simple CRITERIA response', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'], 
                [StrategiesType.NETWORK, '10.0.0.3']]))
            );

        const expected = graphqlUtils.criteriaResult('true', 'Success');
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should NOT authenticate invalid component', async () => {
        await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${apiKey}`)
            .send({
                domain: domainDocument.name,
                component: 'UNKNOWN COMPONENT',
                environment: EnvType.DEFAULT
            }).expect(401);
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Bad login input', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_4'], 
                [StrategiesType.NETWORK, '10.0.0.3']]))
            );

        const expected = graphqlUtils.criteriaResult('false', `Strategy '${StrategiesType.VALUE}' does not agree`);
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Missing input', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_2']]))
            );

        const expected = graphqlUtils.criteriaResult('false', `Strategy '${StrategiesType.NETWORK}' does not agree`);
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Invalid KEY', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery('INVALID_KEY', graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            );

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text).data.criteria).toEqual(null);
    });

    test('CLIENT_SUITE - Should return config disabled for PRD environment while activated in QA', async () => {
        // Config enabled
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('true', 'Success');
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - It will be deactivated on default environment', async () => {
        await changeConfigStatus(configId, false, EnvType.DEFAULT);
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('false', 'Config disabled');
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - It will be activated on QA environment', async () => {
        let qaToken;
        const responseToken = await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${apiKey}`)
            .send({
                domain: domainDocument.name,
                component: component1.name,
                environment: 'QA'
            }).expect(200);
        qaToken = responseToken.body.token;

        await changeConfigStatus(configId, true, 'QA');
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${qaToken}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('true', 'Success');
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should return false after changing strategy operation', async () => {
        let qaToken;
        const responseToken = await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${apiKey}`)
            .send({
                domain: domainDocument.name,
                component: component1.name,
                environment: 'QA'
            }).expect(200);
        qaToken = responseToken.body.token;

        await changeStrategy(configStrategyUSERId, OperationsType.NOT_EXIST, true, 'QA');
        await changeStrategy(configStrategyUSERId, undefined, false, EnvType.DEFAULT);
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${qaToken}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('false', `Strategy '${StrategiesType.VALUE}' does not agree`);
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should return success for default environment now, since the strategy has started being specific for QA environment', async () => {
        await changeConfigStatus(configId, true, EnvType.DEFAULT);
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('true', 'Success');
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should return false due to Group deactivation', async () => {
        await changeGroupConfigStatus(groupConfigId, false, EnvType.DEFAULT);
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('false', 'Group disabled');
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should return false due to Domain deactivation', async () => {
        await changeGroupConfigStatus(groupConfigId, true, EnvType.DEFAULT);
        await changeDomainStatus(domainId, false, EnvType.DEFAULT);
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('false', 'Domain disabled');
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should not add to metrics when Config has disabled metric flag = true', async () => {
        //given
        await changeConfigStatus(configId, true, EnvType.DEFAULT);

        //add one metric data
        await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        //get total of metric data
        const numMetricData = await Metric.find({ config: configId }).countDocuments().exec();

        //disable metrics
        await changeConfigDisableMetricFlag(configId, true, EnvType.DEFAULT);

        //call again
        await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        //test
        const afterNumMetricData = await Metric.find({ config: configId }).countDocuments().exec();
        expect(numMetricData === afterNumMetricData).toBe(true);
    });
});

describe('Testing domain', () => {
    let token;

    beforeAll(async () => {
        const response = await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${apiKey}`)
            .send({
                domain: domainDocument.name,
                component: component1.name,
                environment: EnvType.DEFAULT
            }).expect(200);

        token = response.body.token;
    });

    afterAll(setupDatabase);

    test('CLIENT_SUITE - Should return the Domain structure', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, true, true));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected102));
    });

    test('CLIENT_SUITE - Should return 2 switchers when NOT filtered by Component', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([
                ['name', domainDocument.name], 
                ['environment', EnvType.DEFAULT]])
            );
        
        const result = JSON.parse(req.text);
        expect(req.statusCode).toBe(200);
        expect(result.data.domain.group[0].config.length).toBe(2);
    });

    test('CLIENT_SUITE - Should return 1 switcher when filtered by Component', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([
                ['name', domainDocument.name], 
                ['environment', EnvType.DEFAULT],
                ['_component', 'TestApp']])
            );

        const result = JSON.parse(req.text);
        expect(req.statusCode).toBe(200);
        expect(result.data.domain.group[0].config.length).toBe(1);
    });

    test('CLIENT_SUITE - Should return the Domain structure - Just using environment', async () => {
        // Domain will be resolved while identifying the component
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([
                ['name', domainDocument.name], 
                ['environment', EnvType.DEFAULT]], true, true, true)
            );

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected102));
    });

    test('CLIENT_SUITE - Should return the Domain structure - Disabling strategies (resolver test)', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, true, false));
    
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected103));
    });

    test('CLIENT_SUITE - Should return the Domain structure - Disabling group config (resolver test)', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], false, false, false));
         
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected104));
    });

    test('CLIENT_SUITE - Should return the Domain structure - Disabling config (resolver test)', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, false, false));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected105(keyConfigPrdQA)));
    });
});

describe('Testing criteria [REST] ', () => {
    let token;

    beforeAll(async () => {
        const response = await createRequestAuth();
        token = response.body.token;
    });

    test('CLIENT_SUITE - Should return success on a entry-based CRITERIA response', async () => {
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]})
            .expect(200);

        expect(req.statusCode).toBe(200);
        expect(req.body.strategies.length).toEqual(4);
        expect(req.body.reason).toEqual('Success');
        expect(req.body.result).toBe(true);
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Missing input', async () => {
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    }]})
            .expect(200);

        expect(req.statusCode).toBe(200);
        expect(req.body.strategies.length).toEqual(4);
        expect(req.body.reason).toEqual(`Strategy '${StrategiesType.NETWORK}' does not agree`);
        expect(req.body.result).toBe(false);
    });

    test('CLIENT_SUITE - Should NOT return success on a entry-based CRITERIA response - Missing entry', async () => {
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({})
            .expect(200);

        expect(req.statusCode).toBe(200);
        expect(req.body.strategies.length).toEqual(4);
        expect(req.body.reason).toEqual(`Strategy '${StrategiesType.VALUE}' did not receive any input`);
        expect(req.body.result).toBe(false);
    });

    test('CLIENT_SUITE - Should NOT return success on a entry-based CRITERIA response - Component not registered', async () => {
        // Given
        const component = new Component({
            _id: new mongoose.Types.ObjectId(),
            name: 'Temp Component',
            description: 'Temporary component',
            domain: domainId,
            owner: adminMasterAccountId
        });
        
        const generatedApiKey = await component.generateApiKey();
        const response = await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${generatedApiKey}`)
            .send({
                domain: domainDocument.name,
                component: component.name,
                environment: EnvType.DEFAULT
            }).expect(200);

        const tempToken = response.body.token;

        // Test
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${tempToken}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]});

        expect(req.statusCode).toBe(401);
        expect(req.body.error).toEqual(`Component ${component.name} is not registered to ${keyConfig}`);
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Bad login input', async () => {
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_4'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]});

        expect(req.statusCode).toBe(200);
        expect(req.body.strategies).toBe(undefined);
        expect(req.body.reason).toEqual(`Strategy '${StrategiesType.VALUE}' does not agree`);
        expect(req.body.result).toBe(false);
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Invalid KEY', async () => {
        const req = await request(app)
            .post('/criteria?key=INVALID_KEY&showReason=true')
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]});

        expect(req.statusCode).toBe(404);
    });

    test('CLIENT_SUITE - Should NOT return due to a API Key change, then it should return after renewing the token', async () => {
        const firstResponse = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]})
            .expect(200);
    
        expect(firstResponse.body.strategies.length).toEqual(4);
        expect(firstResponse.body.reason).toEqual('Success');
        expect(firstResponse.body.result).toBe(true);

        // Change API Key
        const component = await Component.findById(component1._id);
        const newApiKey = await component.generateApiKey();

        const secondResponse = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]})
            .expect(401);

        expect(secondResponse.body.error).toEqual('Invalid API token.');

        const responseNewToken = await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${newApiKey}`)
            .send({
                domain: domainDocument.name,
                component: component1.name,
                environment: EnvType.DEFAULT
            }).expect(200);

        token = responseNewToken.body.token;

        await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]})
            .expect(200);
        
    });

    test('CLIENT_SUITE - Should NOT return due to invalid API key provided', async () => {
        await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', 'INVALID_API_KEY')
            .send({
                domain: domainDocument.name,
                component: component1.name,
                environment: EnvType.DEFAULT
            }).expect(401);
    });

    test('CLIENT_SUITE - Should return that snapshot version is outdated - status = false', async () => {
        const req = await request(app)
            .get('/criteria/snapshot_check/1')
            .set('Authorization', `Bearer ${token}`)
            .send();

        expect(req.statusCode).toBe(200);
        expect(req.body.status).toEqual(false);
    });

    test('CLIENT_SUITE - Should return that snapshot version is updated - status = true', async () => {
        const req = await request(app)
            .get('/criteria/snapshot_check/5')
            .set('Authorization', `Bearer ${token}`)
            .send();

        expect(req.statusCode).toBe(200);
        expect(req.body.status).toEqual(true);
    });

    test('CLIENT_SUITE - Should return error when validating snapshot version - Version is not a number', async () => {
        const req = await request(app)
            .get('/criteria/snapshot_check/ONLY_NUMBER_ALLOWED')
            .set('Authorization', `Bearer ${token}`)
            .send();

        expect(req.statusCode).toBe(400);
        expect(req.body.error).toEqual('Wrong value for domain version');
    });

    test('CLIENT_SUITE - Should return error when validating snapshot version - Invalid token', async () => {
        const req = await request(app)
            .get('/criteria/snapshot_check/5')
            .set('Authorization', 'Bearer INVALID_TOKEN')
            .send();

        expect(req.statusCode).toBe(401);
        expect(req.body.error).toEqual('Invalid API token.');
    });

    test('CLIENT_SUITE - Should return an empty list of switchers - all switchers queried found', async () => {
        const req = await request(app)
            .post('/criteria/switchers_check')
            .set('Authorization', `Bearer ${token}`)
            .send({
                switchers: [
                    'TEST_CONFIG_KEY'
                ]
            });

        expect(req.statusCode).toBe(200);
        expect(req.body.not_found).toEqual([]);
    });

    test('CLIENT_SUITE - Should return the switcher queried - not found', async () => {
        const req = await request(app)
            .post('/criteria/switchers_check')
            .set('Authorization', `Bearer ${token}`)
            .send({
                switchers: [
                    'TEST_CONFIG_KEY',
                    'I_DO_NOT_EXIST'
                ]
            });

        expect(req.statusCode).toBe(200);
        expect(req.body.not_found).toEqual(['I_DO_NOT_EXIST']);
    });

    test('CLIENT_SUITE - Should NOT return list of switchers - Invalid body attribute', async () => {
        await request(app)
            .post('/criteria/switchers_check')
            .set('Authorization', `Bearer ${token}`)
            .send({
                switchers: 'TEST_CONFIG_KEY'
            })
            .expect(422);

        await request(app)
            .post('/criteria/switchers_check')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(422);
    });
});

describe('Testing criteria [REST] Rate Limit ', () => {
    let token;

    beforeAll(async () => {
        process.env.MAX_REQUEST_PER_MINUTE = 1;
        
        await setupDatabase();
        const response = await createRequestAuth();
        token = response.body.token;
    });

    afterAll(() => {
        process.env.MAX_REQUEST_PER_MINUTE = 0;
    });

    test('CLIENT_SUITE - Should limit run to 1 execution', async () => {
        await request(app)
            .post(`/criteria?key=${keyConfig}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200);

        const req = await request(app)
            .post(`/criteria?key=${keyConfig}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(429);

        expect(req.body.error).toBe('API request per minute quota exceeded');
    });
});