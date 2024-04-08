import Component from '../models/component.js';

export async function getComponentById(id) {
    return Component.findById(id).exec();
}

export async function getComponents(where, projection, options) {
    return Component.find(where, projection, options);
}