import pathClient from './paths/path-client.js';

import info from './swagger-info.js';

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
    components: {
        securitySchemes: {
            appAuth: {
                type: 'http',
                scheme: 'bearer',
            },
            apiKey: {
                type: 'apiKey',
                in: 'header',
                name: 'switcher-api-key'
            }
        }
    },
    paths: {
        ...pathClient
    }
};