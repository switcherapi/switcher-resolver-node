import pathClient from './paths/path-client';

import { commonSchema } from './schemas/common';
import configStrategySchema from './schemas/config-strategy';
import info from './swagger-info';

export default {
    openapi: '3.0.1',
    info,
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Local'
        },
        {
            url: 'https://api.switcherapi.com',
            description: 'Cloud API'
        }
    ],
    consumes: ['application/json'],
    produces: ['application/json'],
    components: {
        securitySchemes: {
            appAuth: {
                type: 'http',
                scheme: 'bearer',
                name: 'JWT'
            },
            apiKey: {
                type: 'apiKey',
                in: 'header',
                name: 'switcher-api-key'
            }
        },
        schemas: {
            ...commonSchema,
            ...configStrategySchema
        }
    },
    paths: {
        ...pathClient
    }
};