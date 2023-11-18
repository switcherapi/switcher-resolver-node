export const queryParameter = (name, description, required, type) => ({
    in: 'query',
    name,
    description,
    required,
    schema: {
        type: type || 'string'
    }
});

export const pathParameter = (name, description, required) => ({
    in: 'path',
    name,
    description,
    required,
    schema: {
        type: 'string'
    }
});
