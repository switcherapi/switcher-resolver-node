import TimedMatch from '../../src/helpers/timed-match';

describe('Test tryMatch', () => {

    const evilRE = '^(([a-z])+.)+[A-Z]([a-z])+$';
    const evilInput1 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const evilInput2 = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    beforeEach(() => {
        TimedMatch.initializeWorker();
        TimedMatch.clearBlackList();
    });

    afterEach(() => {
        TimedMatch.terminateWorker();
    });

    test('UNIT_TRY_MATCH - Should match value', () => {
        const result = TimedMatch.tryMatch(['USER_[0-9]{1,2}'], 'USER_1');
        expect(result).toBe(true);
    });

    test('UNIT_TRY_MATCH - Should fail for reDoS attempt - default 3000 ms', () => {
        let timer = Date.now();
        const result = TimedMatch.tryMatch([evilRE], evilInput1);
        timer = Date.now() - timer;

        expect(timer).not.toBeLessThan(3000);
        expect(result).toBe(false);
    });

    test('UNIT_TRY_MATCH - Should fail for reDoS attempt - 2000 ms', () => {
        TimedMatch.setMaxTimeLimit(2000);

        let timer = Date.now();
        const result = TimedMatch.tryMatch([evilRE], evilInput1);
        timer = Date.now() - timer;

        expect(timer).not.toBeLessThan(2000);
        expect(timer).not.toBeGreaterThan(2500);
        expect(result).toBe(false);
    });

    test('UNIT_TRY_MATCH - Should return from black list after fail to perfom match', () => {
        TimedMatch.setMaxTimeLimit(1000);
        let timer, result;

        timer = Date.now();
        result = TimedMatch.tryMatch([evilRE], evilInput1);
        timer = Date.now() - timer;

        expect(timer).not.toBeLessThan(1000);
        expect(timer).not.toBeGreaterThan(1500);
        expect(result).toBe(false);

        timer = Date.now();
        result = TimedMatch.tryMatch([evilRE], evilInput1);
        timer = Date.now() - timer;

        expect(timer).not.toBeGreaterThan(100);
        expect(result).toBe(false);
    });

    test('UNIT_TRY_MATCH - Should replace black listed failed match', () => {
        TimedMatch.setMaxTimeLimit(500);
        TimedMatch.setMaxBlackListed(1);
        let timer, result;

        timer = Date.now();
        result = TimedMatch.tryMatch([evilRE], evilInput1);
        timer = Date.now() - timer;

        expect(timer).not.toBeLessThan(500);
        expect(timer).not.toBeGreaterThan(1000);
        expect(result).toBe(false);

        timer = Date.now();
        result = TimedMatch.tryMatch([evilRE], evilInput2);
        timer = Date.now() - timer;

        expect(timer).not.toBeLessThan(500);
        expect(timer).not.toBeGreaterThan(1000);
        expect(result).toBe(false);

        timer = Date.now();
        result = TimedMatch.tryMatch([evilRE], evilInput2);
        timer = Date.now() - timer;

        expect(timer).not.toBeGreaterThan(100);
        expect(result).toBe(false);
    });

});

describe('Test tryMatch (unsafe)', () => {
    beforeAll(() => {
        TimedMatch.terminateWorker();
    });

    test('UNIT_TRY_MATCH - Should return true when using unsafe match', () => {
        const result = TimedMatch.tryMatch(['USER_[0-9]{1,2}'], 'USER_1');
        expect(result).toBe(true);
    });

    test('UNIT_TRY_MATCH - Should return false when using unsafe match', () => {
        const result = TimedMatch.tryMatch(['USER_[0-9]{1,2}'], 'USER_ABC');
        expect(result).toBe(false);
    });
});