export const domainQuery = (id) => `
    query {
        domain(_id: "${id}") {
            version
            statusByEnv {
                env
                value
            }
            group {
                statusByEnv {
                    env
                    value
                }
                config {
                    key
                    components
                    statusByEnv {
                        env
                        value
                    }
                    strategies {
                        strategy
                        operation
                        values
                        statusByEnv {
                            env
                            value
                        }
                    }
                    relay {
                        type
                        method
                        authPrefix
                        authTokenByEnv {
                            env
                            value
                        }
                        endpointByEnv {
                            env
                            value
                        }
                        statusByEnv {
                            env
                            value
                        }
                        verifiedByEnv {
                            env
                            value
                        }
                    }
                }
            }
        }
    }
`;

export function reduceSnapshot(snapshot) {
    const reduced = { ...snapshot };

    reduced.activated = reduced.statusByEnv.reduce((acc, { env, value }) => {
        acc[env] = value;
        return acc;
    }, {});
    delete reduced.statusByEnv;

    reduced.group = reduced.group?.map(group => {
        group.config = group.config?.map(config => {
            reduceConfig(config);
            reduceConfigStrategy(config);
            reduceRelay(config);

            return config;
        });

        group.activated = group.statusByEnv.reduce((acc, { env, value }) => {
            acc[env] = value;
            return acc;
        }, {});
        delete group.statusByEnv;

        return group;
    });

    return reduced;
}

function reduceConfig(config) {
    config.activated = config.statusByEnv.reduce((acc, { env, value }) => {
        acc[env] = value;
        return acc;
    }, {});
    delete config.statusByEnv;
}

function reduceConfigStrategy(config) {
    config.strategies = config.strategies?.map(strategy => {
        strategy.activated = strategy.statusByEnv.reduce((acc, { env, value }) => {
            acc[env] = value;
            return acc;
        }, {});
        delete strategy.statusByEnv;

        return strategy;
    });
}

function reduceRelay(config) {
    if (!config.relay) {
        return;
    }

    config.relay.auth_prefix = config.relay.authPrefix;
    delete config.relay.authPrefix;

    config.relay.activated = config.relay.statusByEnv.reduce((acc, { env, value }) => {
        acc[env] = value;
        return acc;
    }, {});
    delete config.relay.statusByEnv;

    config.relay.endpoint = config.relay.endpointByEnv.reduce((acc, { env, value }) => {
        acc[env] = value;
        return acc;
    }, {});
    delete config.relay.endpointByEnv;

    config.relay.auth_token = config.relay.authTokenByEnv.reduce((acc, { env, value }) => {
        acc[env] = value;
        return acc;
    }, {});
    delete config.relay.authTokenByEnv;

    config.relay.verified = config.relay.verifiedByEnv.reduce((acc, { env, value }) => {
        acc[env] = value;
        return acc;
    }, {});
    delete config.relay.verifiedByEnv;
}
