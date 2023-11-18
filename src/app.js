import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { createHandler } from 'graphql-http/lib/use/express';
import cors from 'cors';
import helmet from 'helmet';

require('./db/mongoose');

import mongoose from 'mongoose';
import swaggerDocument from './api-docs/swagger-document';
import clientApiRouter from './routers/client-api';
import schema from './client/schema';
import { appAuth, resourcesAuth } from './middleware/auth';
import { clientLimiter, defaultLimiter } from './middleware/limiter';
import { createServer } from './app-server';

const app = express();
app.use(express.json());

/**
 * Cors configuration
 */
app.use(cors());
app.use(helmet());
app.disable('x-powered-by');

/**
 * API Routes
 */
app.use(clientApiRouter);

/**
 * GraphQL Routes
 */

const handler = (req, res, next) => 
    createHandler({ schema, context: req })(req, res, next);

// Component: Client API
app.use('/graphql', appAuth, clientLimiter, handler);

/**
 * API Docs and Health Check
 */

app.use('/api-docs', resourcesAuth(),
    swaggerUi.serve, 
    swaggerUi.setup(swaggerDocument)
);

app.get('/swagger.json', resourcesAuth(), (_req, res) => {
    res.status(200).send(swaggerDocument);
});

app.get('/check', defaultLimiter, (req, res) => {
    const showDetails = req.query.details === '1';
    const response = {
        status: 'UP'
    };

    if (showDetails) {
        response.attributes = {
            release_time: process.env.RELEASE_TIME,
            env: process.env.ENV,
            db_state: mongoose.connection.readyState,
            switcherapi: process.env.SWITCHER_API_ENABLE,
            switcherapi_logger: process.env.SWITCHER_API_LOGGER,
            relay_bypass_https: process.env.RELAY_BYPASS_HTTPS,
            relay_bypass_verification: process.env.RELAY_BYPASS_VERIFICATION,
            metrics: process.env.METRICS_ACTIVATED,
            max_rpm: process.env.MAX_REQUEST_PER_MINUTE,
            regex_max_timeout: process.env.REGEX_MAX_TIMEOUT,
            regex_max_blacklist: process.env.REGEX_MAX_BLACLIST
        };
    }

    res.status(200).send(response);
});

app.get('*', (_req, res) => {
    res.status(404).send({ error: 'Operation not found' });
});

export default createServer(app);