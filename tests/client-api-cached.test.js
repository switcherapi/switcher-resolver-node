import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import { Config } from '../src/models/config';
import Component from '../src/models/component';
import { ConfigStrategy, StrategiesType, OperationsType } from '../src/models/config-strategy';
import { EnvType } from '../src/models/environment';
import { adminMasterAccountId, groupConfigDocument } from './fixtures/db_api';
import { Metric } from '../src/models/metric';
import * as graphqlUtils from './graphql-utils';
import { 
    setupDatabase,
    apiKey,
    keyConfig,
    configId,
    groupConfigId,
    domainId,
    domainDocument,
    configStrategyUSERId,
    component1,
    configStrategyUSERDocument,
    configStrategyCIDRDocument,
    configStrategyTIME_GREATDocument,
    configStrategyTIME_BETWEENDocument
} from './fixtures/db_client';
import Cache from '../src/helpers/cache';

const changeStrategy = async (strategyId, newOperation, status, environment) => {
    const strategy = await ConfigStrategy.findById(strategyId).exec();
    strategy.operation = newOperation || strategy.operation;
    strategy.activated.set(environment, status === undefined ? strategy.activated.get(environment) : status);
    strategy.updatedBy = adminMasterAccountId;
    await strategy.save();
};

const changeConfigStatus = async (configid, status, environment) => {
    const config = await Config.findById(configid).exec();
    config.activated.set(environment, status === undefined ? config.activated.get(environment) : status);
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
    groupConfig.activated.set(environment, status === undefined ? groupConfig.activated.get(environment) : status);
    groupConfig.updatedBy = adminMasterAccountId;
    await groupConfig.save();
};

const changeDomainStatus = async (domainid, status, environment) => {
    const domain = await Domain.findById(domainid).exec();
    domain.activated.set(environment, status === undefined ? domain.activated.get(environment) : status);
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

beforeAll(async () => {
    await setupDatabase();
    process.env.CACHE_SNAPSHOT_MS = 5000;
});

afterAll(async () => { 
    Cache.getInstance().stopScheduledUpdates();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing criteria [GraphQL]', () => {
    let token;

    beforeAll(async () => {
        await Cache.getInstance().initializeCache();
        const response = await createRequestAuth();
        token = response.body.token;
    });

    afterAll(setupDatabase);

    test('CLIENT_CACHED_SUITE - Should return success on a simple CRITERIA response', async () => {
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

    test('CLIENT_CACHED_SUITE - Should return success on a detailed CRITERIA response', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaDetailedQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'], 
                [StrategiesType.NETWORK, '10.0.0.3']]))
            );

        const expected = graphqlUtils.criteriaDetailedResult(
            'true',
            'Success',
            EnvType.DEFAULT,
            domainDocument,
            groupConfigDocument, [
                configStrategyUSERDocument,
                configStrategyCIDRDocument,
                configStrategyTIME_BETWEENDocument,
                configStrategyTIME_GREATDocument
            ]
        );
        
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_CACHED_SUITE - Should NOT return success on a simple CRITERIA response - Bad login input', async () => {
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

    test('CLIENT_CACHED_SUITE - Should NOT return success on a simple CRITERIA response - Missing input', async () => {
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

    test('CLIENT_CACHED_SUITE - Should NOT return success on a simple CRITERIA response - Invalid KEY', async () => {
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

    test('CLIENT_CACHED_SUITE - Should return config disabled for PRD environment while activated in QA', async () => {
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

    test('CLIENT_CACHED_SUITE - It will be deactivated on default environment', async () => {
        await changeConfigStatus(configId, false, EnvType.DEFAULT);
        await Cache.getInstance().refreshDomain(domainId);

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

    test('CLIENT_CACHED_SUITE - It will be activated on QA environment', async () => {
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
        await Cache.getInstance().refreshDomain(domainId);

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

    test('CLIENT_CACHED_SUITE - Should return false after changing strategy operation', async () => {
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
        await Cache.getInstance().refreshDomain(domainId);

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

    test('CLIENT_CACHED_SUITE - Should return success for default environment now, since the strategy has started being specific for QA environment', async () => {
        await changeConfigStatus(configId, true, EnvType.DEFAULT);
        await Cache.getInstance().refreshDomain(domainId);

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

    test('CLIENT_CACHED_SUITE - Should return false due to Group deactivation', async () => {
        await changeGroupConfigStatus(groupConfigId, false, EnvType.DEFAULT);
        await Cache.getInstance().refreshDomain(domainId);
        
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

    test('CLIENT_CACHED_SUITE - Should return false due to Domain deactivation', async () => {
        await changeGroupConfigStatus(groupConfigId, true, EnvType.DEFAULT);
        await changeDomainStatus(domainId, false, EnvType.DEFAULT);
        await Cache.getInstance().refreshDomain(domainId);
        
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

    test('CLIENT_CACHED_SUITE - Should not add to metrics when Config has disabled metric flag = true', async () => {
        // given
        await changeConfigStatus(configId, true, EnvType.DEFAULT);
        await Cache.getInstance().refreshDomain(domainId);

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
        await Cache.getInstance().refreshDomain(domainId);

        //call again
        await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        // test
        const afterNumMetricData = await Metric.find({ config: configId }).countDocuments().exec();
        expect(numMetricData === afterNumMetricData).toBe(true);
    });
});

describe('Testing criteria [REST] ', () => {
    let token;

    beforeAll(async () => {
        await Cache.getInstance().initializeCache();
        const response = await createRequestAuth();
        token = response.body.token;
    });

    test('CLIENT_CACHED_SUITE - Should return success on a entry-based CRITERIA response', async () => {
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

    test('CLIENT_CACHED_SUITE - Should NOT return success on a simple CRITERIA response - Missing input', async () => {
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

    test('CLIENT_CACHED_SUITE - Should NOT return success on a entry-based CRITERIA response - Missing entry', async () => {
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

    test('CLIENT_CACHED_SUITE - Should NOT return success on a entry-based CRITERIA response - Entry not an array', async () => {
        await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: {
                    strategy: StrategiesType.VALUE,
                    input: 'USER_1'
                }})
            .expect(422);
    });

    test('CLIENT_CACHED_SUITE - Should NOT return success on a entry-based CRITERIA response - Invalid Strategy', async () => {
        await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: 'INVALID_STRATEGY',
                        input: 'USER_1'
                    }
                ]})
            .expect(422);
    });

    test('CLIENT_CACHED_SUITE - Should NOT return success on a entry-based CRITERIA response - Missing key', async () => {
        await request(app)
            .post('/criteria?showReason=true&showStrategy=true')
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    }
                ]})
            .expect(422);
    });

    test('CLIENT_CACHED_SUITE - Should NOT return success on a entry-based CRITERIA response - Component not registered', async () => {
        // given
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

        // test
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

    test('CLIENT_CACHED_SUITE - Should NOT return success on a simple CRITERIA response - Bad login input', async () => {
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

    test('CLIENT_CACHED_SUITE - Should NOT return success on a simple CRITERIA response - Invalid KEY', async () => {
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

    test('CLIENT_CACHED_SUITE - Should NOT return due to a API Key change, then it should return after renewing the token', async () => {
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
});