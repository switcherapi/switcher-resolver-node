import { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLFloat } from 'graphql';
import { resolveConfigStrategy, resolveConfig, resolveGroupConfig, resolveRelay, resolveEnvValue } from './resolvers.js';
import { EnvType } from '../models/environment.js';
import { 
    resolveComponents, 
} from './configuration-resolvers.js';

const envStatus = new GraphQLObjectType({
    name: 'EnvStatus',
    fields: {
        env: { 
            type: GraphQLString
        },
        value: { 
            type: GraphQLBoolean
        }
    }
});

const envValue = new GraphQLObjectType({
    name: 'EnvValue',
    fields: {
        env: { 
            type: GraphQLString
        },
        value: { 
            type: GraphQLString
        }
    }
});

export const strategyType = new GraphQLObjectType({
    name: 'Strategy',
    fields: {
        _id: {
            type: GraphQLString
        },
        strategy: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, _args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`];
            }
        },
        statusByEnv: {
            type: new GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvValue(source, 'activated', Object.keys(source.activated));
            }
        },
        operation: {
            type: GraphQLString
        },
        values: {
            type: new GraphQLList(GraphQLString)
        }
    }
});

export const relayType = new GraphQLObjectType({
    name: 'Relay',
    fields: {
        type: {
            type: GraphQLString,
        },
        method: {
            type: GraphQLString,
        },
        endpointByEnv: {
            type: new GraphQLList(envValue),
            resolve: (source) => {
                return resolveEnvValue(source, 'endpoint', Object.keys(source.endpoint));
            }
        },
        statusByEnv: {
            type: new GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvValue(source, 'activated', Object.keys(source.activated));
            }
        },
        auth_token: {
            type: new GraphQLList(envValue),
            resolve: (source) => {
                return resolveEnvValue(source, 'auth_token', Object.keys(source.auth_token));
            }
        },
        auth_prefix: {
            type: GraphQLString
        }
    }
});

export const configType = new GraphQLObjectType({
    name: 'Config',
    fields: {
        _id: {
            type: GraphQLString
        },
        key: {
            type: GraphQLString
        },
        description: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, _args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`];
            }
        },
        statusByEnv: {
            type: new GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvValue(source, 'activated', Object.keys(source.activated));
            }
        },
        strategies: {
            type: new GraphQLList(strategyType),
            args: {
                _id: {
                    type: GraphQLString
                },
                strategy: {
                    type: GraphQLString
                },
                operation: {
                    type: GraphQLString
                }, 
                activated: {
                    type: GraphQLBoolean
                }
            },
            resolve: async (source, { _id, strategy, operation, activated }, context) => {
                return resolveConfigStrategy(source, _id, strategy, operation, activated, context);
            }
        },
        components: {
            type: new GraphQLList(GraphQLString),
            resolve: async (source) => {
                return resolveComponents(source);
            }
        },
        relay: {
            type: relayType,
            resolve: (source, _args, context) => {
                return resolveRelay(source, context);
            }
        }
    }
});

export const groupConfigType = new GraphQLObjectType({
    name: 'Group',
    fields: {
        _id: {
            type: GraphQLString
        },
        name: {
            type: GraphQLString
        },
        description: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, _args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`];
            }
        },
        statusByEnv: {
            type: new GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvValue(source, 'activated', Object.keys(source.activated));
            }
        },
        config: {
            type: new GraphQLList(configType),
            args: {
                _id: {
                    type: GraphQLString
                },
                key: {
                    type: GraphQLString
                }, 
                activated: {
                    type: GraphQLBoolean
                }
            },
            resolve: async (source, { _id, key, activated }, context) => {
                return resolveConfig(source, _id, key, activated, context);
            }
        }
    }
});

export const domainType = new GraphQLObjectType({
    name: 'Domain',
    fields: {
        _id: {
            type: GraphQLString
        },
        version: {
            type: GraphQLFloat,
            resolve: (source) => source.lastUpdate
        },
        name: {
            type: GraphQLString
        },
        description: {
            type: GraphQLString
        },
        owner: {
            type: GraphQLString
        },
        transfer: {
            type: GraphQLBoolean
        },
        integrations: { 
            type: new GraphQLObjectType({
                name: 'Integrations',
                fields: {
                    slack: { 
                        type: GraphQLString
                    }
                }
            })
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, _args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`];
            }
        },
        statusByEnv: {
            type: new GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvValue(source, 'activated', Object.keys(source.activated));
            }
        },
        group: {
            type: new GraphQLList(groupConfigType),
            args: {
                _id: {
                    type: GraphQLString
                },
                name: {
                    type: GraphQLString
                }, 
                activated: {
                    type: GraphQLBoolean
                }
            },
            resolve: async (source, { _id, name, activated }, context) => {
                return resolveGroupConfig(source, _id, name, activated, context);
            }
        }
    }
});