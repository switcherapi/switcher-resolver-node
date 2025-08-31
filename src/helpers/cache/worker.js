import { parentPort, workerData } from 'node:worker_threads';
import Logger from '../logger.js';
import { CacheWorkerManager, EVENT_TYPE } from './worker-manager.js';

const { interval = CacheWorkerManager.DEFAULT_INTERVAL } = workerData;

let isRunning = false;
let intervalId = null;
let dbInitialized = false;
let getAllDomains = null;

// Initialize worker and send ready signal
(async () => {
    await initializeWorker();
    if (dbInitialized) {
        parentPort.postMessage({ type: EVENT_TYPE.READY });
    }
})();

async function initializeWorker() {
    try {
        await import('../../db/mongoose.js');
        const domainService = await import('../../services/domain.js');
        getAllDomains = domainService.getAllDomains;
        dbInitialized = true;
        Logger.info('Worker database connection initialized');
    } catch (error) {
        Logger.error('Failed to initialize worker database connection:', error);
        parentPort.postMessage({
            type: EVENT_TYPE.ERROR,
            error: `Database initialization failed: ${error.message}`
        });
    }
}

async function checkForUpdates() {
    if (isRunning || !dbInitialized) {
        return;
    }
    
    isRunning = true;
    
    try {
        const domains = await getAllDomains();
        const updates = [];
        
        for (const domain of domains) {
            try {
                const cacheCheckResult = await fetchCacheVersion(domain);
                const dbVersion = domain.lastUpdate;
                const cachedVersion = cacheCheckResult;
                
                if (isCacheOutdated(cachedVersion, dbVersion)) {
                    await updateDomainCacheSnapshot(domain, updates);
                }
            } catch (domainError) {
                Logger.error(`Error processing domain ${domain._id}:`, domainError.message);
                // Continue with next domain instead of failing completely
            }
        }
        
        if (updates.length > 0) {
            parentPort.postMessage({
                type: EVENT_TYPE.CACHE_UPDATES,
                updates
            });
        }
    } catch (error) {
        Logger.error('Worker checkForUpdates error:', error);
        parentPort.postMessage({
            type: EVENT_TYPE.ERROR,
            error: error.message
        });
    } finally {
        isRunning = false;
    }
}

function isCacheOutdated(cachedVersion, dbVersion) {
    return !cachedVersion || dbVersion !== cachedVersion;
}

async function updateDomainCacheSnapshot(domain, updates) {
    const { graphql } = await import('graphql');
    const { domainQuery, reduceSnapshot } = await import('./query.js');
    const schemaModule = await import('../../aggregator/schema.js');

    const result = await graphql({
        schema: schemaModule.default,
        source: domainQuery(domain._id),
        contextValue: { domain: domain._id }
    });

    if (result.data?.domain) {
        updates.push({
            domainId: domain._id.toString(),
            data: reduceSnapshot(result.data.domain),
            lastUpdate: domain.lastUpdate,
            version: result.data.domain.version
        });
    }
}

async function fetchCacheVersion(domain) {
    return await new Promise((resolve) => {
        const timeout = setTimeout(() => {
            parentPort.off('message', messageHandler);
            resolve(null);
        }, 1000);

        const messageHandler = (message) => {
            if (message.type === EVENT_TYPE.CACHE_VERSION_RESPONSE && message.domainId === domain._id.toString()) {
                clearTimeout(timeout);
                parentPort.off('message', messageHandler);
                resolve(message.cachedVersion);
            }
        };

        parentPort.on('message', messageHandler);
        parentPort.postMessage({
            type: EVENT_TYPE.REQUEST_CACHE_VERSION,
            domainId: domain._id.toString()
        });
    });
}

// Handle messages from main thread
parentPort.on('message', async (message) => {
    try {
        switch (message.type) {
            case EVENT_TYPE.START:
                if (!intervalId && dbInitialized) {
                    intervalId = setInterval(() => checkForUpdates(), interval);
                    parentPort.postMessage({ type: EVENT_TYPE.STARTED });
                } else if (!dbInitialized) {
                    parentPort.postMessage({ 
                        type: EVENT_TYPE.ERROR, 
                        error: 'Database not initialized' 
                    });
                }
                break;

            case EVENT_TYPE.STOP:
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                parentPort.postMessage({ type: EVENT_TYPE.STOPPED });
                break;
        }
    } catch (error) {
        Logger.error('Worker message handler error:', error);
        parentPort.postMessage({
            type: EVENT_TYPE.ERROR,
            error: error.message
        });
    }
});