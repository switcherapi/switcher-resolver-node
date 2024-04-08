import { Switcher, checkValue, checkRegex } from 'switcher-client';
import { getDomainById } from '../services/domain.js';
import { DEFAULT_RATE_LIMIT } from '../middleware/limiter.js';

const apiKey = process.env.SWITCHER_API_KEY;
const environment = process.env.SWITCHER_API_ENVIRONMENT;
const domainName = process.env.SWITCHER_API_DOMAIN;
const url = process.env.SWITCHER_API_URL;
const logger = process.env.SWITCHER_API_LOGGER == 'true';
const certPath = process.env.SSL_CERT;
const component = 'switcherapi';

Switcher.buildContext({ url, apiKey, domain: domainName, component, environment }, { logger, certPath });

export const SwitcherKeys = Object.freeze({
    RATE_LIMIT: 'RATE_LIMIT',
    HTTPS_AGENT: 'HTTPS_AGENT'
});

async function checkFeature(feature, params) {
    const switcher = Switcher.factory();
    return switcher.isItOn(feature, params, true);
}

export async function getRateLimit(key, component) {
    if (process.env.SWITCHER_API_ENABLE === 'true' && key !== process.env.SWITCHER_API_KEY) {
        const domain = await getDomainById(component.domain);
        const result = await checkFeature(SwitcherKeys.RATE_LIMIT, [
            checkValue(String(domain.owner))
        ]);

        if (result) {
            const log = Switcher.getLogger(SwitcherKeys.RATE_LIMIT)
                .find(log => log.input[0][1] === String(domain.owner));
            
            return JSON.parse(log.response.message).rate_limit;
        }
    }

    return parseInt(process.env.MAX_REQUEST_PER_MINUTE || DEFAULT_RATE_LIMIT);
}

export async function checkHttpsAgent(value) {
    if (process.env.SWITCHER_API_ENABLE != 'true')
        return;

    return checkFeature(SwitcherKeys.HTTPS_AGENT, [checkRegex(value)]);
}