import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { createHandler } from 'graphql-http/lib/use/express';
import cors from 'cors';
import helmet from 'helmet';

import './db/mongoose.js';

import mongoose from 'mongoose';
import swaggerDocument from './api-docs/swagger-document.js';
import clientApiRouter from './routers/client-api.js';
import TimedMatch from './helpers/timed-match/index.js';
import Cache from './helpers/cache/index.js';
import schema from './aggregator/schema.js';
import { appAuth, resourcesAuth } from './middleware/auth.js';
import { clientLimiter, defaultLimiter } from './middleware/limiter.js';
import { createServer } from './app-server.js';

/**
 * Initialize TimedMatch Worker
 */
TimedMatch.initializeWorker();

/**
 * Initialize cache
 */
const cache = Cache.getInstance();
await cache.initializeCache();
cache.startScheduledUpdates({ interval: Number.parseInt(process.env.CACHE_SNAPSHOT_MS) });

/**
 * Express app instance
 */
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
            version: swaggerDocument.info.version,
            release_time: process.env.RELEASE_TIME,
            env: process.env.ENV,
            db_state: mongoose.connection.readyState,
            switcherapi: isEnabled('SWITCHER_API_ENABLE'),
            switcherapi_logger: isEnabled('SWITCHER_API_LOGGER'),
            relay_bypass_https: isEnabled('RELAY_BYPASS_HTTPS'),
            relay_bypass_verification: isEnabled('RELAY_BYPASS_VERIFICATION'),
            metrics: isEnabled('METRICS_ACTIVATED'),
            max_rpm: process.env.MAX_REQUEST_PER_MINUTE,
            regex_max_timeout: process.env.REGEX_MAX_TIMEOUT,
            regex_max_blacklist: process.env.REGEX_MAX_BLACKLIST,
            cache_snapshot_ms: process.env.CACHE_SNAPSHOT_MS,
        };
    }

    res.status(200).send(response);
});

function isEnabled(feature) {
    return process.env[feature]?.toLowerCase() === 'true';
}

export default createServer(app);