import { CacheWorkerManager } from '../../../src/helpers/cache/worker-manager';

describe('Test worker manager', () => {

    test('CACHE_SUITE - Should start/stop worker manager', async () => {
        const workerManager = new CacheWorkerManager({
            onCacheUpdates: () => {},
            onCacheDeletions: () => {},
            onCacheVersionRequest: () => {},
            onCachedDomainIdsRequest: () => {},
            onError: () => {}
        }, { interval: 500 });

        // Start the worker manager
        await workerManager.start();
        await new Promise(resolve => setTimeout(resolve, 500));

        let status = workerManager.getStatus();
        expect(status).toBeDefined();
        expect(status).toBe('running');

        // Stop the worker manager
        await workerManager.stop();
        await new Promise(resolve => setTimeout(resolve, 500));

        status = workerManager.getStatus();
        expect(status).toBeDefined();
        expect(status).toBe('stopped');
    });

    test('CACHE_SUITE - Should handle error when cache response is invalid', async () => {
        let error = false;
        const workerManager = new CacheWorkerManager({
            onCacheUpdates: () => {},
            onCacheDeletions: () => {},
            onCacheVersionRequest: () => {},
            onCachedDomainIdsRequest: () => badCacheResponse(workerManager),
            onError: () => {
                error = true;
            }
        }, { interval: 500 });

        // Start the worker manager
        await workerManager.start();
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Stop the worker manager
        await workerManager.stop();
        expect(error).toBe(true);
    });
});

function badCacheResponse(workerManager) {
    workerManager.sendCachedDomainIdsResponse(null);
}