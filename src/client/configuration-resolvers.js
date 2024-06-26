import { getComponents } from '../services/component.js';

export async function resolveComponents(source) {
    const components = await getComponents({ _id: { $in: source.components } });
    return components.length ? components.map(component => component.name) : [];
}