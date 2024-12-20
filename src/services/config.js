import { Config } from '../models/config.js';
import { BadRequestError } from '../exceptions/index.js';

export async function getConfig(where, lean = false) {
    const query = Config.findOne();

    query.where('domain', where.domain);
    query.where('key', where.key);

    if (lean) query.lean();
    
    return query.exec();
}

export async function getConfigs(where) {
    const query = Config.find();
    
    query.where('domain', where.domain);
    query.where('components', where.components);

    return query.exec();
}

export function isRelayValid(relay) {
    const bypass = process.env.RELAY_BYPASS_HTTPS === 'true' || false;

    if (bypass || !relay.endpoint) {
        return;
    }

    const foundNotHttps = Object.values(relay.endpoint)
        .filter(endpoint => !endpoint.toLowerCase().startsWith('https'));
    
    if (foundNotHttps.length) {
        throw new BadRequestError('HTTPS required');
    }
}

export function isRelayVerified(relay, environment) {
    const bypass = process.env.RELAY_BYPASS_VERIFICATION === 'true' || false;

    if (bypass) {
        return;
    }
    
    if (!relay.verified[environment]) {
        throw new BadRequestError('Relay not verified');
    }
}