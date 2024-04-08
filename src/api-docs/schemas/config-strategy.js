import { OperationsType, StrategiesType } from '../../models/config-strategy.js';

const configStrategy = {
    type: 'object',
    properties: {
        _id: {
            type: 'string',
            description: 'The unique identifier of the config strategy'
        },
        description: {
            type: 'string',
            description: 'The description of the config strategy'
        },
        activated: {
            type: 'object',
            additionalProperties: {
                type: 'boolean',
                description: 'The environment status'
            }
        },
        strategy: {
            type: 'string',
            enum: Object.values(StrategiesType)
        },
        values: {
            type: 'array',
            items: {
                type: 'string'
            }
        },
        operation: {
            type: 'string',
            enum: Object.values(OperationsType)
        }
    }
};

export default {
    ConfigStrategy: configStrategy
};