import basicAuth from 'express-basic-auth';
import jwt from 'jsonwebtoken';
import { getComponentById } from '../services/component.js';
import { getEnvironmentByDomainAndName } from '../services/environment.js';
import { responseExceptionSilent } from '../exceptions/index.js';
import Component from '../models/component.js';
import { getRateLimit } from '../external/switcher-api-facade.js';

export function resourcesAuth() {
    return basicAuth({
        users: {
            admin: process.env.RESOURCE_SECRET || 'admin',
        },
        challenge: true,
    });
}

export async function appAuth(req, res, next) {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const component = await getComponentById(decoded.component);

        if (component?.apihash.substring(50, component.apihash.length - 1) !== decoded.vc) {
            throw new Error('Invalid API token');
        }

        req.token = token;
        req.domain = component.domain;
        req.component = component.name;
        req.componentId = component._id;
        req.environment = decoded.environment;
        req.rate_limit = decoded.rate_limit;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).send({ error: 'Token expired.' });
        }
        
        responseExceptionSilent(res, err, 401, 'Invalid API token.');
    }
}

export async function appGenerateCredentials(req, res, next) {
    try {
        const key = req.header('switcher-api-key');
        const { component, domain } = await Component.findByCredentials(req.body.domain, req.body.component, key);
        const environment = await getEnvironmentByDomainAndName(component.domain, req.body.environment);

        if (!environment) {
            throw new Error('Invalid environment');
        }

        const rate_limit = await getRateLimit(key, component);
        const token = await component.generateAuthToken(req.body.environment, rate_limit);

        req.token = token;
        req.domain = domain;
        req.environment = req.body.environment;
        req.rate_limit = rate_limit;
        next();
    } catch (err) {
        responseExceptionSilent(res, err, 401, 'Invalid token request.');
    }
}