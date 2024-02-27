import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import Admin from '../../src/models/admin';
import Domain from '../../src/models/domain';
import GroupConfig from '../../src/models/group-config';
import { Config } from '../../src/models/config';
import Component, { EncryptionSalts } from '../../src/models/component';
import { Metric } from '../../src/models/metric';
import { EnvType, Environment } from '../../src/models/environment';
import { ConfigStrategy, StrategiesType, OperationsType } from '../../src/models/config-strategy';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

export const adminMasterAccountId = new mongoose.Types.ObjectId();
export const adminMasterAccountToken = jwt.sign({ _id: adminMasterAccountId }, process.env.JWT_SECRET);
export const adminMasterAccount = {
    _id: adminMasterAccountId,
    name: 'Master Admin',
    email: 'master@mail.com',
    password: '123123123123',
    active: true
};

export const adminAccountId = new mongoose.Types.ObjectId();
export const adminAccountToken = jwt.sign({ _id: adminAccountId }, process.env.JWT_SECRET);
export const adminAccount = {
    _id: adminAccountId,
    name: 'Admin',
    email: 'admin@mail.com',
    password: 'asdasdasdasd',
    active: true
};

export const memberAccountId = new mongoose.Types.ObjectId();
export const memberAccountToken = jwt.sign({ _id: memberAccountId }, process.env.JWT_SECRET);
export const memberAccount = {
    _id: memberAccountId,
    name: 'Member',
    email: 'member@mail.com',
    password: 'asdasdasdasd',
    active: true
};

export const memberAccount2Id = new mongoose.Types.ObjectId();
export const memberAccount2Token = jwt.sign({ _id: memberAccount2Id }, process.env.JWT_SECRET);
export const memberAccount2 = {
    _id: memberAccount2Id,
    name: 'Member 2',
    email: 'member2@mail.com',
    password: 'asdasdasdasd',
    active: true
};

export const domainId = new mongoose.Types.ObjectId();
export const domainDocument = {
    _id: domainId,
    name: 'Domain',
    description: 'Test Domain',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId
};

export const component1Id = new mongoose.Types.ObjectId();
export const component1Key = randomUUID();
export const component1 = {
    _id: component1Id,
    name: 'TestApp',
    description: 'Test app',
    domain: domainId,
    owner: adminMasterAccountId
};

export const environment1Id = new mongoose.Types.ObjectId();
export const environment1 = {
    _id: environment1Id,
    name: EnvType.DEFAULT,
    domain: domainId,
    owner: adminMasterAccountId
};

export const environment2Id = new mongoose.Types.ObjectId();
export const environment2 = {
    _id: environment2Id,
    name: 'dev',
    domain: domainId,
    owner: adminMasterAccountId
};

export const environment3Id = new mongoose.Types.ObjectId();
export const environment3 = {
    _id: environment3Id,
    name: 'staging',
    domain: domainId,
    owner: adminMasterAccountId
};

export const groupConfigId = new mongoose.Types.ObjectId();
export const groupConfigDocument = {
    _id: groupConfigId,
    name: 'Group Test',
    description: 'Test Group',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    domain: domainId
};

export const configId1 = new mongoose.Types.ObjectId();
export const config1Document = {
    _id: configId1,
    key: 'TEST_CONFIG_KEY_1',
    description: 'Test config 1',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    group: groupConfigId,
    domain: domainId,
    components: [component1Id]
};

export const configId2 = new mongoose.Types.ObjectId();
export const config2Document = {
    _id: configId2,
    key: 'TEST_CONFIG_KEY_2',
    description: 'Test config 2',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    group: groupConfigId,
    domain: domainId
};

export const configStrategyId = new mongoose.Types.ObjectId();
export const configStrategyDocument = {
    _id: configStrategyId,
    description: 'Test config strategy',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    config: configId1,
    operation: OperationsType.EXIST,
    strategy: StrategiesType.VALUE,
    values: ['USER_1', 'USER_2', 'USER_3'],
    domain: domainId
};

export const setupDatabase = async () => {
    await ConfigStrategy.deleteMany().exec();
    await Config.deleteMany().exec();
    await GroupConfig.deleteMany().exec();
    await Domain.deleteMany().exec();
    await Admin.deleteMany().exec();
    await Environment.deleteMany().exec();
    await Component.deleteMany().exec();
    await Metric.deleteMany().exec();

    await new Admin(adminMasterAccount).save();
    await new Admin(adminAccount).save();
    await new Admin(memberAccount).save();
    await new Admin(memberAccount2).save();

    await new Environment(environment1).save();
    await new Environment(environment2).save();
    await new Environment(environment3).save();
    await new Domain(domainDocument).save();
    await new GroupConfig(groupConfigDocument).save();
    await new Config(config1Document).save();
    await new Config(config2Document).save();
    await new ConfigStrategy(configStrategyDocument).save();
    
    const hash = await bcryptjs.hash(component1Key, EncryptionSalts.COMPONENT);
    component1.apihash = hash;
    await new Component(component1).save();
};