import Logger from '../helpers/logger.js';
import { ConfigStrategy, processOperation } from '../models/config-strategy.js';
import { RelayTypes } from '../models/config.js';
import Domain from '../models/domain.js';
import { EnvType } from '../models/environment.js';
import GroupConfig from '../models/group-config.js';
import { addMetrics } from '../models/metric.js';
import { isRelayValid, isRelayVerified } from './config.js';
import { resolveNotification, resolveValidation } from './relay.js';

export async function evaluateCriteria(config, context, strategyFilter) {
    context.config_id = config._id;
    const environment = context.environment;
    let domain, group, strategies;

    // Fetch domain, group and strategies in parallel
    await Promise.all([
        findDomain(context.domain), 
        findGroup(config), 
        findConfigStrategies(config._id, context.domain, strategyFilter)
    ]).then(result => {
        domain = result[0];
        group = result[1];
        strategies = result[2];
    });
    
    // Prepare response object
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

async function findDomain(domainId) {
    return Domain.findById(domainId).lean();
}

async function findGroup(config) {
    return GroupConfig.findById(config.group).lean();
}

async function findConfigStrategies(configId, domainId, strategyFilter) {
    return ConfigStrategy.find({ config: configId, domain: domainId }, strategyFilter).lean();
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