import { validationResult } from 'express-validator';
import { getConfig } from '../services/config';

export async function checkConfig(req, res, next) {
    const config = await getConfig({ domain: req.domain, key: String(req.query.key) }, true);

    if (!config) {
        return res.status(404).send({ 
            error: `Unable to load a key ${String(req.query.key)}` });
    }
    
    req.config = config;
    next();
}

export async function checkConfigComponent(req, res, next) {
    const hasComponent = req.config.components.filter((c) => 
        c.toString() === req.componentId.toString()).length > 0;

    if (!hasComponent) {
        return res.status(401).send({ 
            error: `Component ${req.component} is not registered to ${req.config.key}` });
    }

    next();
}

export function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    next();
}