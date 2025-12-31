import Domain from '../models/domain.js';
import GroupConfig from '../models/group-config.js';
import { Config} from '../models/config.js';
import { ConfigStrategy } from '../models/config-strategy.js';
import Component from '../models/component.js';

export const resolveConfigByKey = async (domain, key) => Config.findOne({ domain, key }, null, { lean: true });

export function resolveEnvValue(source, field, keys) {
    const arrValue = [];

    for (const k of keys) {
        arrValue.push({
            env: k,
            value: source[field][k]
        });
    }
    
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
        if (relay.activated?.[environment] !== undefined) { 
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