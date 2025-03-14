import mongoose from 'mongoose';
import { payloadReader } from '../../src/helpers';
import { 
    processOperation,
    StrategiesType,
    OperationsType
} from '../../src/models/config-strategy';

import '../../src/app';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Processing strategy: NETWORK', () => {

    const fixture_values1 = [
        '10.0.0.0/30'
    ];

    const fixture_values2 = [
        '10.0.0.0/30', '192.168.0.0/30'
    ];

    const fixture_values3 = [
        '192.168.56.56',
        '192.168.56.57',
        '192.168.56.58'
    ];

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input range EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '10.0.0.3', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input range DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '10.0.0.4', fixture_values1);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input NOT_EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '10.0.0.4', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input IP EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '192.168.56.58', fixture_values3);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input IP DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '192.168.56.50', fixture_values3);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input range EXIST for multiple ranges', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '192.168.0.3', fixture_values2);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input range DOES NOT EXIST for multiple ranges', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '127.0.0.0', fixture_values2);
        expect(result).toBe(true);
    });

});

describe('Processing strategy: VALUE', () => {
    const fixture_values1 = [
        'USER_1'
    ];

    const fixture_values2 = [
        'USER_1', 'USER_2'
    ];

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input EXIST', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.EXIST, 'USER_1', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.EXIST, 'USER_123', fixture_values1);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.NOT_EXIST, 'USER_123', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is EQUAL', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.EQUAL, 'USER_1', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input is NOT EQUAL', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.EQUAL, 'USER_2', fixture_values1);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is NOT EQUAL', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.NOT_EQUAL, 'USER_123', fixture_values2);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input is NOT EQUAL', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.NOT_EQUAL, 'USER_2', fixture_values2);
        expect(result).toBe(false);
    });
});

describe('Processing strategy: NUMERIC', () => {
    const fixture_values1 = [
        '1'
    ];

    const fixture_values2 = [
        '1', '3'
    ];

    const fixture_values3 = [
        '1.5'
    ];

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input EXIST in values - String type', async () => {
        const result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.EXIST, '3', fixture_values2);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input EXIST in values - Number type', async () => {
        const result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.EXIST, 3, fixture_values2);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input exist but test as DOES NOT EXIST ', async () => {
        const result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.NOT_EXIST, '1', fixture_values2);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input DOES NOT EXIST in values', async () => {
        const result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.NOT_EXIST, '2', fixture_values2);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is EQUAL to value', async () => {
        const result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.EQUAL, '1', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input is not equal but test as EQUAL', async () => {
        const result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.EQUAL, '2', fixture_values1);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is NOT EQUAL to value', async () => {
        const result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.NOT_EQUAL, '2', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is GREATER than value', async () => {
        let result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.GREATER, '2', fixture_values1);
        expect(result).toBe(true);

        // test decimal
        result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.GREATER, '1.01', fixture_values1);
        expect(result).toBe(true);

        result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.GREATER, '1.55', fixture_values3);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input is lower but tested as GREATER than value', async () => {
        let result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.GREATER, '0', fixture_values1);
        expect(result).toBe(false);

        // test decimal
        result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.GREATER, '0.99', fixture_values1);
        expect(result).toBe(false);

        result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.GREATER, '1.49', fixture_values3);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is LOWER than value', async () => {
        let result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.LOWER, '0', fixture_values1);
        expect(result).toBe(true);

        // test decimal
        result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.LOWER, '0.99', fixture_values1);
        expect(result).toBe(true);

        result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.LOWER, '1.49', fixture_values3);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is BETWEEN values', async () => {
        let result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.BETWEEN, '1', fixture_values2);
        expect(result).toBe(true);

        // test decimal
        result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.BETWEEN, '2.99', fixture_values2);
        expect(result).toBe(true);

        result = await processOperation(
            StrategiesType.NUMERIC, OperationsType.BETWEEN, '1.001', fixture_values2);
        expect(result).toBe(true);
    });

});

describe('Processing strategy: TIME', () => {
    const fixture_values1 = [
        '08:00'
    ];

    const fixture_values2 = [
        '08:00', '10:00'
    ];

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is LOWER', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '06:00', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is LOWER or SAME', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '08:00', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input is NOT LOWER', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '10:00', fixture_values1);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is GREATER', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '10:00', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is GREATER or SAME', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '08:00', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input is NOT GREATER', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '06:00', fixture_values1);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is in BETWEEN', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.BETWEEN, '09:00', fixture_values2);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input is NOT in BETWEEN', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.BETWEEN, '07:00', fixture_values2);
        expect(result).toBe(false);
    });
});

describe('Processing strategy: DATE', () => {
    const fixture_values1 = [
        '2019-12-01'
    ];

    const fixture_values2 = [
        '2019-12-01', '2019-12-05'
    ];

    const fixture_values3 = [
        '2019-12-01T08:30'
    ];

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is LOWER', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-11-26', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is LOWER or SAME', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input is NOT LOWER', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-02', fixture_values1);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is GREATER', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-02', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is GREATER or SAME', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-01', fixture_values1);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input is NOT GREATER', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-11-10', fixture_values1);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is in BETWEEN', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.BETWEEN, '2019-12-03', fixture_values2);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input is NOT in BETWEEN', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.BETWEEN, '2019-12-12', fixture_values2);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is LOWER including time', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01T07:00', fixture_values3);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when input is NOT LOWER including time', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01T07:00', fixture_values1);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when input is GREATER including time', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-01T08:40', fixture_values3);
        expect(result).toBe(true);
    });
});

describe('Processing strategy: REGEX', () => {
    const fixture_values1 = [
        '\\bUSER_[0-9]{1,2}\\b'
    ];

    const fixture_values2 = [
        '\\bUSER_[0-9]{1,2}\\b', '\\buser-[0-9]{1,2}\\b'
    ];

    const fixture_values3 = [
        'USER_[0-9]{1,2}'
    ];

    test('UNIT_STRATEGY_SUITE - Should return TRUE when expect to exist using EXIST operation', async () => {
        let result = await processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'USER_1', fixture_values1);
        expect(result).toBe(true);

        result = await processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'user-01', fixture_values2);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when expect to exist using EXIST operation', async () => {
        let result = await processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'USER_123', fixture_values1);
        expect(result).toBe(false);

        //fixture_values3 does not require exact match
        result = await processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'USER_123', fixture_values3);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when expect to not exist using NOT_EXIST operation', async () => {
        let result = await processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EXIST, 'USER_123', fixture_values1);
        expect(result).toBe(true);

        result = await processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EXIST, 'user-123', fixture_values2);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when expect to not exist using NOT_EXIST operation', async () => {
        const result = await processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EXIST, 'USER_12', fixture_values1);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when expect to be equal using EQUAL operation', async () => {
        const result = await processOperation(
            StrategiesType.REGEX, OperationsType.EQUAL, 'USER_11', fixture_values3);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when expect to be equal using EQUAL operation', async () => {
        const result = await processOperation(
            StrategiesType.REGEX, OperationsType.EQUAL, 'user-11', fixture_values3);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should return TRUE when expect to not be equal using NOT_EQUAL operation', async () => {
        const result = await processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EQUAL, 'USER_123', fixture_values3);
        expect(result).toBe(true);
    });

    test('UNIT_STRATEGY_SUITE - Should return FALSE when expect to not be equal using NOT_EQUAL operation', async () => {
        const result = await processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EQUAL, 'USER_1', fixture_values3);
        expect(result).toBe(false);
    });

    test('UNIT_STRATEGY_SUITE - Should fail for reDoS attempt', async () => {
        const result = await processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!', 
            ['^(([a-z])+.)+[A-Z]([a-z])+$']);
            
        expect(result).toBe(false);
    });
});

describe('Processing strategy: PAYLOAD', () => {

    const fixture_1 = JSON.stringify({
        id: '1',
        login: 'petruki'
    });

    const fixture_values2 = JSON.stringify({
        product: 'product-1',
        order: {
            qty: 1,
            deliver: {
                expect: '2019-12-10',
                tracking: [
                    {
                        date: '2019-12-09',
                        status: 'sent'
                    },
                    {
                        date: '2019-12-10',
                        status: 'delivered',
                        comments: 'comments'
                    }
                ]
            }
        }
    });

    const fixture_values3 = JSON.stringify({
        description: 'Allowed IP address',
        strategy: 'NETWORK_VALIDATION',
        values: ['10.0.0.3/24'],
        operation: 'EXIST',
        env: 'default'
    });

    test('UNIT_PAYLOAD_SUITE - Should read keys from payload #1', () => {
        const keys = payloadReader(JSON.parse(fixture_values2));
        expect(keys).toEqual([                
            'product',
            'order',
            'order.qty',
            'order.deliver',
            'order.deliver.expect',        
            'order.deliver.tracking',      
            'order.deliver.tracking.date', 
            'order.deliver.tracking.status',
            'order.deliver.tracking.comments'
        ]);
    });

    test('UNIT_PAYLOAD_SUITE - Should read keys from payload #2', () => {
        const keys = payloadReader(JSON.parse(fixture_values3));
        expect(keys).toEqual([                
            'description',
            'strategy',
            'values',
            'operation',
            'env'
        ]);
    });

    test('UNIT_PAYLOAD_SUITE - Should read keys from payload with array values', () => {
        const keys = payloadReader({
            order: {
                items: ['item_1', 'item_2']
            }
        });
        expect(keys).toEqual([                
            'order',
            'order.items'
        ]);
    });

    test('UNIT_PAYLOAD_SUITE - Should return TRUE when payload has field', async () => {
        expect(await processOperation(
            StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_1, ['login'])
        ).toBe(true);
    });

    test('UNIT_PAYLOAD_SUITE - Should return FALSE when payload does not have field', async () => {
        expect(await processOperation(
            StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_1, ['user'])
        ).toBe(false);
    });

    test('UNIT_PAYLOAD_SUITE - Should return TRUE when payload has nested field', async () => {
        expect(await processOperation(
            StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_values2, [
                'order.qty', 'order.total'
            ])
        ).toBe(true);
    });

    test('UNIT_PAYLOAD_SUITE - Should return TRUE when payload has nested field with arrays', async () => {
        expect(await processOperation(
            StrategiesType.PAYLOAD, OperationsType.HAS_ONE, fixture_values2, [
                'order.deliver.tracking.status'
            ])
        ).toBe(true);
    });

    test('UNIT_PAYLOAD_SUITE - Should return TRUE when payload has all', async () => {
        expect(await processOperation(
            StrategiesType.PAYLOAD, OperationsType.HAS_ALL, fixture_values2, [
                'product',
                'order',
                'order.qty',
                'order.deliver',
                'order.deliver.expect',        
                'order.deliver.tracking',      
                'order.deliver.tracking.date', 
                'order.deliver.tracking.status'
            ])
        ).toBe(true);
    });

    test('UNIT_PAYLOAD_SUITE - Should return FALSE when payload does not have all', async () => {
        expect(await processOperation(
            StrategiesType.PAYLOAD, OperationsType.HAS_ALL, fixture_values2, [
                'product',
                'order',
                'order.NOT_EXIST_KEY',
            ])
        ).toBe(false);
    });

    test('UNIT_PAYLOAD_SUITE - Should return FALSE when payload is not a JSON string', async () => {
        expect(await processOperation(
            StrategiesType.PAYLOAD, OperationsType.HAS_ALL, 'NOT_JSON', [])
        ).toBe(false);
    });
});