import { Environment } from '../models/environment.js';

export async function getEnvironmentByDomainAndName(domain, name) {
    const query = Environment.findOne();
    
    query.where('domain', domain)
        .where('name', name);
    
    return query.exec();
}