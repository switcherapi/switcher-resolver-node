import { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLNonNull, GraphQLInputObjectType } from 'graphql';
import { domainType, groupConfigType, strategyType } from './configuration-type.js';
import { EnvType } from '../models/environment.js';
import { evaluateCriteria } from '../services/criteria.js';

export const strategyInputType = new GraphQLInputObjectType({
    name: 'StrategyInput',
    fields: {
        strategy: {
            type: new GraphQLNonNull(GraphQLString)
        },
        input: {
            type: new GraphQLNonNull(GraphQLString)
        }
    }
});

export const responseType = new GraphQLObjectType({
    name: 'Result',
    fields: {
        result: {
            type: GraphQLBoolean  
        },
        reason: {
            type: GraphQLString
        },
        domain: {
            type: domainType,
            resolve: (source) => {
                return {
                    name: source.domain.name,
                    activated: source.domain.activated,
                    description: source.domain.description
                };
            }
        },
        group: {
            type: groupConfigType,
            resolve: (source) => {
                return {
                    name: source.group.name,
                    activated: source.group.activated,
                    description: source.group.description
                };
            }
        },
        strategies: {
            type: new GraphQLList(strategyType)
        }
    }
});

export const criteriaType = new GraphQLObjectType({
    name: 'Criteria',
    fields: {
        key: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, _args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`];
            }
        },
        response: {
            type: responseType,
            resolve: (source, _params, context) => {
                return evaluateCriteria(source, context);
            }
        }
    }
});