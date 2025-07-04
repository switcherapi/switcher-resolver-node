const createInput = input => `${input[0]}: "${input[1]}"`;
const createStrategyInput = input => `{ strategy: "${input[0]}", input: "${input[1]}" }`;
const isActivated = (element) => element ? 'true' : 'false';

export const domainQuery = (where, group, config, strategy) => { 
    const query = `${where.map(createInput)}`;
    const elementQuery = (element) => 
        element != undefined ? `(activated: ${isActivated(element)})` : '';

    return { 
        query: `
            {
                domain(${query}) { 
                    name version description activated statusByEnv { env value }
                    group${group !== undefined ? elementQuery(group) : ''} { 
                        name description activated statusByEnv { env value }
                        config${config !== undefined ? elementQuery(config) : ''} { 
                            key description activated statusByEnv { env value }
                            strategies${strategy !== undefined ? elementQuery(strategy): ''} { 
                                strategy activated operation values
                            }
                            relay {
                                type
                                method
                                activated
                                endpointByEnv { env value }
                                statusByEnv { env value }
                                statusByEnv { env value }
                            }
                            components
                        }
                    }
                }
            }
    `};
};

export const criteriaQuery = (key, entries) => {
    return {
        query: `
            {
                criteria(
                    key: "${key}", 
                    entry: [${entries}]
                ) { response { result reason } }
            }  
    `};
};

export const criteriaDetailedQuery = (key, entries) => {
    return {
        query: `
            {
                criteria(
                    key: "${key}", 
                    entry: [${entries}]
                ) { 
                    response {
                        result
                        reason
                        domain {
                            name
                            activated
                            description
                        }
                        group {
                            name
                            activated
                            description
                        }
                        strategies {
                            strategy
                            activated
                            operation
                            values
                        }
                    }
                }
            }  
    `};
};

export const criteriaResult = (result, reason) => `
    {  "data": { "criteria": { "response": { "result": ${result}, "reason": "${reason}" } } } }`;

export const criteriaDetailedResult = (result, reason, environment, domain, group, strategies) => `
    {  "data": { "criteria": { "response": {
        "result": ${result},
        "reason": "${reason}",
        "domain": {
            "name": "${domain.name}",
            "activated": ${domain.activated.get(environment)},
            "description": "${domain.description}"
        },
        "group": {
            "name": "${group.name}",
            "activated": ${group.activated.get(environment)},
            "description": "${group.description}"
        },
        "strategies": [${strategies.map(s => `
            {
                "strategy": "${s.strategy}",
                "activated": ${s.activated.get(environment)},
                "operation": "${s.operation}",
                "values": [${s.values.map(v => `"${v}"`).join(', ')}]
            }`)}]
    } } } }`;

export const  buildEntries = (entries) => {
    return `${entries.map(createStrategyInput)}`;
};

export const permissionsQuery = (domainId, parentId, actions, router, environment) => {
    return { 
        query: `
            {
                permission(
                    domain: "${domainId}",
                    parent: "${parentId}",
                    actions: [${actions}],
                    router: "${router}",
                    environment: "${environment}"
                ) {
                    id,
                    name,
                    permissions { 
                        action 
                        result 
                    }
                }
            }  
    `};
};

export const expected102 = `
{
    "data":{
        "domain": {
            "name":"Domain",
            "description":"Test Domain",
            "activated":true,
            "group":[{
                "name":"Group Test",
                "description":"Test Group",
                "activated":true,
                "config":[{
                    "key":"TEST_CONFIG_KEY",
                    "description":"Test config 1",
                    "activated":true,
                    "strategies":[{
                        "strategy":"VALUE_VALIDATION",
                        "activated":true,
                        "operation":"EXIST",
                        "values":[
                            "USER_1",
                            "USER_2",
                            "USER_3"
                        ]
                    }, {
                        "strategy":"NETWORK_VALIDATION",
                        "activated":true,
                        "operation":"EXIST",
                        "values":[
                            "10.0.0.0/24"
                        ]
                    }],
                    "relay": {
                        "type": "NOTIFICATION",
                        "method": "POST",
                        "activated": false,
                        "endpointByEnv": [{
                            "env": "default",
                            "value": "http://localhost:3000"
                        }],
                        "statusByEnv": [{
                            "env": "default",
                            "value": false
                        }]
                    }
                }]
            }]
        }
    }
}`;

export const expected102Default = `
{
    "data": {
        "domain": {
            "name": "Domain",
            "version": 5,
            "description": "Test Domain",
            "activated": true,
            "statusByEnv": [{
                "env": "default",
                "value": true
            }],
            "group": [{
                "name": "Group Test",
                "description": "Test Group",
                "activated": true,
                "statusByEnv": [{
                    "env": "default",
                    "value": true
                }],
                "config": [{
                    "key": "TEST_CONFIG_KEY",
                    "description": "Test config 1",
                    "activated": true,
                    "statusByEnv": [{
                        "env": "default",
                        "value": true
                    }],
                    "strategies": [{
                        "strategy": "VALUE_VALIDATION",
                        "activated": true,
                        "operation": "EXIST",
                        "values": [
                            "USER_1",
                            "USER_2",
                            "USER_3"
                        ]
                    }, {
                        "strategy": "NETWORK_VALIDATION",
                        "activated": true,
                        "operation": "EXIST",
                        "values": [
                            "10.0.0.0/24"
                        ]
                    }, {
                        "strategy": "TIME_VALIDATION",
                        "activated": false,
                        "operation": "BETWEEN",
                        "values": [
                            "13:00",
                            "14:00"
                        ]
                    }, {
                        "strategy": "DATE_VALIDATION",
                        "activated": false,
                        "operation": "GREATER",
                        "values": [
                            "2019-12-01T13:00"
                        ]
                    }],
                    "relay": {
                        "type": "NOTIFICATION",
                        "method": "POST",
                        "activated": false,
                        "endpointByEnv": [{
                            "env": "default",
                            "value": "http://localhost:3000"
                        }],
                        "statusByEnv": [ {
                            "env": "default",
                            "value": false
                        }]
                    },
                    "components": ["TestApp"]
                },
                {
                    "key": "TEST_CONFIG_KEY_PRD_QA",
                    "description": "Test config 2 - Off in PRD and ON in QA",
                    "activated": false,
                    "statusByEnv": [{
                        "env": "default",
                        "value": false
                    },{
                        "env": "QA",
                        "value": true
                    }],
                    "strategies": [],
                    "relay": null,
                    "components": []
                }]
            }]
        }
    }
}`;

export const expected103 = `
{
    "data": {
    "domain": {
        "name":"Domain",
        "description":"Test Domain",
        "activated":true,
        "group":[
            {
            "name":"Group Test",
            "description":"Test Group",
            "activated":true,
            "config":[{
                "key":"TEST_CONFIG_KEY",
                "description":"Test config 1",
                "activated":true,
                "strategies":[{
                    "strategy":"TIME_VALIDATION",
                    "activated":false,
                    "operation":"BETWEEN",
                    "values":[
                        "13:00",
                        "14:00"
                    ]} , {
                    "strategy":"DATE_VALIDATION",
                    "activated":false,
                    "operation":"GREATER",
                    "values":[
                        "2019-12-01T13:00"
                    ]}
                ]}
            ]}
        ]}
    }
}`;

export const expected104 = `
{
    "data":
    {
        "domain":
            {
                "name":"Domain",
                "description":"Test Domain",
                "activated":true,
                "group":[]
            }
    }
}`;

export const expected105 = (key) => `
{
    "data":{
        "domain": {
            "name":"Domain",
            "description":"Test Domain",
            "activated":true,
            "group":[{
                "name":"Group Test",
                "description":"Test Group",
                "activated":true,
                "config":[{
                    "key":"${key}",
                    "description":"Test config 2 - Off in PRD and ON in QA",
                    "activated":false,
                    "strategies":[]}
                ]
            }]
        }
    }
}`;

export const expected106 = `
    {"data":
    {"domain":{
        "name":"Domain","description":"Test Domain","statusByEnv":[{"env":"default","value":true}],
        "group":[{"name":"Group Test","description":"Test Group","statusByEnv":[{"env":"default","value":true}],
        "config":[
            {"key":"TEST_CONFIG_KEY","description":"Test config 1","statusByEnv":[{"env":"default","value":true}],
            "strategies":[
                {"strategy":"VALUE_VALIDATION","statusByEnv":[{"env":"default","value":true}],"operation":"EXIST","values":["USER_1","USER_2","USER_3"]},
                {"strategy":"NETWORK_VALIDATION","statusByEnv":[{"env":"default","value":true}],"operation":"EXIST","values":["10.0.0.0/24"]},
                {"strategy":"TIME_VALIDATION","statusByEnv":[{"env":"default","value":false}],"operation":"BETWEEN","values":["13:00","14:00"]},
                {"strategy":"DATE_VALIDATION","statusByEnv":[{"env":"default","value":false}],"operation":"GREATER","values":["2019-12-01T13:00"]}]},
            {"key":"TEST_CONFIG_KEY_PRD_QA","description":"Test config 2 - Off in PRD and ON in QA","statusByEnv":[{"env":"default","value":false},{"env":"QA","value":true}],
            "strategies":[]}]}]}}}`;

export const expected107 = `
    {"data":
    {"domain":{"name":"Domain","description":"Test Domain","statusByEnv":[{"env":"default","value":true}],
    "group":[
        {"name":"Group Test","description":"Test Group","statusByEnv":[{"env":"default","value":true}],
        "config":[
            {"key":"TEST_CONFIG_KEY","description":"Test config 1","statusByEnv":[{"env":"default","value":true}],"strategies":null},
            {"key":"TEST_CONFIG_KEY_PRD_QA","description":"Test config 2 - Off in PRD and ON in QA","statusByEnv":[{"env":"default","value":false},{"env":"QA","value":true}],"strategies":null}]}]}}}
    `;