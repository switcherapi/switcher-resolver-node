import Domain from '../models/domain.js';

export async function getDomainById(id) {
    return Domain.findById(id).exec();
}

export async function getAllDomains(select) {
    return Domain.find().select(select).exec();
}