import { EnvType } from '../models/environment.js';
import Domain from '../models/domain.js';
import GroupConfig from '../models/group-config.js';
import { Config, RelayTypes} from '../models/config.js';
import { addMetrics } from '../models/metric.js';
import { ConfigStrategy, processOperation } from '../models/config-strategy.js';
import { resolveNotification, resolveValidation } from '../services/relay.js';
import Component from '../models/component.js';
import Logger from '../helpers/logger.js';
import { isRelayVerified, isRelayValid } from '../services/config.js';

export const resolveConfigByKey = async (domain, key) => Config.findOne({ domain, key }, null, { lean: true });

export function resolveEnvValue(source, field, keys) {
    const arrValue = [];

    keys.forEach(k => {
        arrValue.push({
            env: k,
            value: source[field][k]
        });
    });
    
    return arrValue;
}

export async function resolveConfigStrategy(source, _id, strategy, operation, activated, context) {
    const args = {};

    if (_id) { args._id = _id; }
    if (strategy) { args.strategy = strategy; }
    if (operation) { args.operation = operation; }
    
    let strategies = await ConfigStrategy.find({ config: source._id, ...args }).lean().exec();
    const environment = context.environment;

    if (environment) {
        strategies = strategies.filter(s => s.activated[environment] !== undefined);
        if (activated !== undefined) {
            strategies = strategies.filter(s => s.activated[environment] === activated);
        }
    }

    return strategies;
}

export async function resolveRelay(source, context) {
    const { relay } = source;
    const { environment } = context;

    if (environment) {
        if (relay.activated && relay.activated[environment] !== undefined) { 
            return relay;
        }

        return null;
    }
    
    return relay.type ? relay : null;
}

export async function resolveConfig(source, _id, key, activated, context) {
    const args = {};

    if (_id) { args._id = _id; }
    if (key) { args.key = key; }
    if (context._component) { args.components = context._component; }

    let configs = await Config.find({ group: source._id, ...args }).lean().exec();

    if (activated !== undefined) {
        configs = configs.filter(config => config.activated[context.environment] === activated);
    }

    return configs;
}

export async function resolveGroupConfig(source, _id, name, activated, context) {
    const args = {};

    if (_id) { args._id = _id; }
    if (name) { args.name = name; }

    let groups = await GroupConfig.find({ domain: source._id, ...args }).lean().exec();

    if (activated !== undefined) {
        groups = groups.filter(group => group.activated[context.environment] === activated);
    }

    return resolveComponentsFirst(source, context, groups);
}

export async function resolveDomain(activated, context) {
    const domain = await Domain.findById(context.domain).lean().exec();
    if (activated !== undefined) {
        if (domain.activated[context.environment] !== activated) {
            return null;
        }
    }

    return domain;
}

export async function findDomain(domainId) {
    return Domain.findById(domainId).lean();
}

/**
 * Resolve components first is used by SDKs to filter only configurations in which the component
 * exists resulting in a snapshot size reduction.
 */
async function resolveComponentsFirst(source, context, groups) {
    if (context._component) {
        const component = await Component.findOne({ domain: source._id, name: context._component }).exec();
        const validGroups = [];

        context._component = component?._id;
        for (const group of groups) {
            let configsLength = await Config.find({
                 domain: source._id, 
                 group: group._id, 
                 components: context._component 
            }).countDocuments().exec();

            if (configsLength) {
                validGroups.push(group);
            }
        }
        return validGroups;
    }
    return groups;
}

async function findGroup(config) {
    return GroupConfig.findById(config.group).lean();
}

async function findConfigStrategies(configId, domainId, strategyFilter) {
    return ConfigStrategy.find({ config: configId, domain: domainId }, strategyFilter).lean();
}

async function checkRelay(config, environment, entry, response) {
    try {
        if (config.relay?.activated[environment]) {
            isRelayValid(config.relay);
            isRelayVerified(config.relay, environment);
            
            if (config.relay.type === RelayTypes.NOTIFICATION) {
                resolveNotification(config.relay, entry, environment);
            } else {
                const relayResponse = await resolveValidation(config.relay, entry, environment);
                
                response.result = relayResponse.result;
                response.reason = relayResponse.result ? 'Success' : 'Relay does not agree';
                response.message = relayResponse.message;
                response.metadata = relayResponse.metadata;
            }
        }
    } catch (e) {
        if (config.relay.type === RelayTypes.VALIDATION) {
            response.result = false;
            response.reason = `Relay service could not be reached: ${e.message}`;
            Logger.error(response.reason, e);
        }
    }
}

function isMetricDisabled(config, environment) {
    if (config.disable_metrics[environment] === undefined) {
        return true;
    }

    return config.disable_metrics[environment];
}

function checkFlags(config, group, domain, environment) {
    if (config.activated[environment] === undefined ? 
        !config.activated[EnvType.DEFAULT] : !config.activated[environment]) {
        throw new Error('Config disabled');
    } else if (group.activated[environment] === undefined ? 
        !group.activated[EnvType.DEFAULT] : !group.activated[environment]) {
        throw new Error('Group disabled');
    } else if (domain.activated[environment] === undefined ? 
        !domain.activated[EnvType.DEFAULT] : !domain.activated[environment]) {
        throw new Error('Domain disabled');
    }
}

async function checkStrategy(entry, strategies, environment) {
    if (strategies) {
        for (const strategy of strategies) {
            if (!strategy.activated[environment]) {
                continue;
            }
            
            await checkStrategyInput(entry, strategy);
        }
    }
}

async function checkStrategyInput(entry, { strategy, operation, values }) {
    if (entry?.length) {
        const strategyEntry = entry.filter(e => e.strategy === strategy);
        if (strategyEntry.length == 0 || !(await processOperation(strategy, operation, strategyEntry[0].input, values))) {
            throw new Error(`Strategy '${strategy}' does not agree`);
        }
    } else {
        throw new Error(`Strategy '${strategy}' did not receive any input`);
    }
}

export async function resolveCriteria(config, context, strategyFilter) {
    context.config_id = config._id;
    const environment = context.environment;
    let domain, group, strategies;

    await Promise.all([
        findDomain(context.domain), 
        findGroup(config), 
        findConfigStrategies(config._id, context.domain, strategyFilter)
    ]).then(result => {
        domain = result[0];
        group = result[1];
        strategies = result[2];
    });
    
    const response = {
        domain,
        group,
        strategies,
        result: true,
        reason: 'Success'
    };

    try {
        checkFlags(config, group, domain, environment);
        await checkStrategy(context.entry, strategies, environment);
        await checkRelay(config, environment, context.entry, response);
    } catch (e) {
        response.result = false;
        response.reason = e.message;
    } finally {
        const bypassMetric = context.bypassMetric ? context.bypassMetric === 'true' : false;
        if (!bypassMetric && process.env.METRICS_ACTIVATED === 'true' && 
            !isMetricDisabled(config, environment)) {
            addMetrics(context, response);
        }
    }

    return response;
}