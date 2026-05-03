export function findDomainInCache(cache, domainId) {
    const domainCache = cache.get(domainId.toString());
    return domainCache?.data;
}

export function findGroupInCache(cache, domainId, groupId) {
    const domainCache = cache.get(domainId.toString());
    return domainCache?.data.group.find(group => String(group._id) === String(groupId?.toString()));
}

export function findConfigStrategiesInCache(cache, configKey, domainId, groupId) {
    const domainCache = cache.get(domainId.toString());
    const groupCache = domainCache?.data.group.find(group => String(group._id) === String(groupId?.toString()));
    const configCache = groupCache?.config.find(config => config.key === configKey);
    return configCache?.strategies;
}

export function getConfigFromCache(cache, domainId, key) {
    const domainCache = cache.get(domainId.toString());
    const groups = domainCache?.data.group || [];

    for (const group of groups) {
        const configFound = group.config.filter(c => c.key === key);
        if (configFound.length) {
             configFound[0].group = group._id;
            return configFound[0];
        }
    }

    return null;
}