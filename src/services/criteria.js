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

    // Check flags
    if (!checkFlags(config, environment, response)) {
        return addMetricsAndReturn(context, config, environment, response);
    }

    // Check strategy
    if (!checkStrategy(context.entry, environment, response)) {
        return addMetricsAndReturn(context, config, environment, response);
    }

    // Check relay
    await checkRelay(config, environment, context.entry, response);

    return addMetricsAndReturn(context, config, environment, response);
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

function checkFlags(config, environment, response) {
    const { domain, group } = response;

    if (config.activated[environment] === undefined ? 
        !config.activated[EnvType.DEFAULT] : !config.activated[environment]) {
        response.result = false;
        response.reason = 'Config disabled';
        return false;
    } else if (group.activated[environment] === undefined ? 
        !group.activated[EnvType.DEFAULT] : !group.activated[environment]) {
        response.result = false;
        response.reason = 'Group disabled';
        return false;
    } else if (domain.activated[environment] === undefined ? 
        !domain.activated[EnvType.DEFAULT] : !domain.activated[environment]) {
        response.result = false;
        response.reason = 'Domain disabled';
        return false;
    }

    return true;
}

function checkStrategy(entry, environment, response) {
    const { strategies } = response;

    if (strategies) {
        for (const strategy of strategies) {
            if (!strategy.activated[environment]) {
                continue;
            }
            
            if (!checkStrategyInput(entry, strategy, response)) {
                return false;
            }
        }
    }

    return true;
}

function checkStrategyInput(entry, { strategy, operation, values }, response) {
    if (!entry?.length) {
        response.result = false;
        response.reason = `Strategy '${strategy}' did not receive any input`;
        return false;
    }
    
    const strategyEntry = entry.filter(e => e.strategy === strategy);
    if (strategyEntry.length == 0 || !processOperation(strategy, operation, strategyEntry[0].input, values)) {
        response.result = false;
        response.reason = `Strategy '${strategy}' does not agree`;
        return false;
    }
    
    return true;
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

function addMetricsAndReturn(context, config, environment, response) {
    const systemMetricActivated = process.env.METRICS_ACTIVATED === 'true';
    const bypassMetric = context.bypassMetric ? context.bypassMetric === 'true' : false;
    
    if (systemMetricActivated && !bypassMetric && isMetricEnabled(config, environment)) {
        addMetrics(context, response);
    }

    return response;
}

function isMetricEnabled(config, environment) {
    if (config.disable_metrics[environment] === undefined) {
        return false;
    }

    return !config.disable_metrics[environment];
}