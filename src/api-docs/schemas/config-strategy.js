import { OperationsType, StrategiesType } from '../../models/config-strategy';

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
        },
        config: {
            type: 'string',
            description: 'The config ID parent of the config strategy',
            format: 'uuid'
        },
        domain: {
            type: 'string',
            description: 'The domain ID parent of the config strategy',
            format: 'uuid'
        },
        owner: {
            type: 'string',
            description: 'The owner id of the config strategy'
        },
        admin: {
            type: 'object',
            properties: {
                _id: {
                    type: 'string',
                    description: 'The unique identifier of the admin'
                },
                name: {
                    type: 'string',
                    description: 'The name of the admin who created the config strategy'
                }
            }
        },
        createdAt: {
            type: 'string',
            description: 'The date when the config strategy was created'
        },
        updatedAt: {
            type: 'string',
            description: 'The date when the config strategy was updated'
        }
    }
};

export default {
    ConfigStrategy: configStrategy
};