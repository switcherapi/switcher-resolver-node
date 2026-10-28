import { getComponents } from '../services/component.js';

export async function resolveComponents(source) {
    const componentIds = source.components.map(id => id.toString());
    const components = await getComponents({ _id: { $in: componentIds } });
    return components.length ? components.map(component => component.name) : [];
}