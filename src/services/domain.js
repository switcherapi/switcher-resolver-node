import Domain from '../models/domain.js';

export async function getDomainById(id) {
    return Domain.findById(id).exec();
}

export async function getAllDomains() {
    return Domain.find().exec();
}