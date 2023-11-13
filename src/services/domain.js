import Domain from '../models/domain';

export async function getDomainById(id) {
    return Domain.findById(id).exec();
}