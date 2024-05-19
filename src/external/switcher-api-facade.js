import { Client } from 'switcher-client';
import { getDomainById } from '../services/domain.js';
import { DEFAULT_RATE_LIMIT } from '../middleware/limiter.js';

const apiKey = process.env.SWITCHER_API_KEY;
const environment = process.env.SWITCHER_API_ENVIRONMENT;
const domainName = process.env.SWITCHER_API_DOMAIN;
const url = process.env.SWITCHER_API_URL;
const logger = process.env.SWITCHER_API_LOGGER == 'true';
const throttle = process.env.SWITCHER_API_THROTTLE;
const certPath = process.env.SSL_CERT;
const component = 'switcherapi';

Client.buildContext({ url, apiKey, domain: domainName, component, environment }, { logger, certPath });

export const SwitcherKeys = Object.freeze({
    RATE_LIMIT: 'RATE_LIMIT',
    HTTPS_AGENT: 'HTTPS_AGENT'
});

function getFeatureFlag(feature) {
    const switcher = Client.getSwitcher(feature);

    if (throttle) {
        switcher.throttle(throttle);
    }

    return switcher.detail();
}

export async function getRateLimit(key, component) {
    if (process.env.SWITCHER_API_ENABLE === 'true' && key !== process.env.SWITCHER_API_KEY) {
        const domain = await getDomainById(component.domain);
        const featureFlag = await getFeatureFlag(SwitcherKeys.RATE_LIMIT)
            .checkValue(String(domain.owner))
            .isItOn();

        if (featureFlag.result) {
            return featureFlag.metadata.rate_limit;
        }
    }

    return parseInt(process.env.MAX_REQUEST_PER_MINUTE || DEFAULT_RATE_LIMIT);
}

export async function checkHttpsAgent(value) {
    if (process.env.SWITCHER_API_ENABLE != 'true') {
        return;
    }

    return getFeatureFlag(SwitcherKeys.HTTPS_AGENT)
        .checkRegex(value)
        .isItOn();
}