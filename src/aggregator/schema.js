import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLNonNull } from 'graphql';
import { domainType } from './configuration-type.js';
import { strategyInputType, criteriaType } from './criteria-type.js';
import { resolveConfigByKey, resolveDomain } from './resolvers.js';

const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
        criteria: {
            type: criteriaType,
            args: {
                key: {
                    type: new GraphQLNonNull(GraphQLString)
                },
                entry: {
                    type: new GraphQLList(strategyInputType)
                },
                bypassMetric: {
                    type: GraphQLBoolean
                }
            },
            resolve: async (_source, { key, entry, bypassMetric }, context) => {
                context.entry = entry;
                context.bypassMetric = bypassMetric;
                return resolveConfigByKey(context.domain, key);
            }
        },
        domain: {
            type: domainType,
            args: {
                _id: {
                    type: GraphQLString
                },
                name: {
                    type: GraphQLString
                },
                activated: {
                    type: GraphQLBoolean
                },
                environment: {
                    type: GraphQLString
                },
                _component: {
                    type: GraphQLString
                }
            },
            resolve: async (_source, { activated, environment, _component }, context) => {
                if (environment) context.environment = environment;
                if (_component) context._component = _component;
                return resolveDomain(activated, context);
            }
        }
    }
});

const schema = new GraphQLSchema({
  query: queryType
});

export default schema;