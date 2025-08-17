const redisClient = require('./redisClient');

class CacheManager {
    // namespace:identifier:queryHash
    generateKey(namespace, identifier, query = null) {
        let key = namespace;
        if (identifier) {
            key += `:${identifier}`;
        }
        if (query && Object.keys(query).length > 0) {
            const sortedQuery = this.sortObject(query);
            const queryHash = Buffer.from(JSON.stringify(sortedQuery)).toString(
                'base64',
            );
            key += `:${queryHash}`;
        }
        return key;
    }

    // Sort object keys for consistent hashing --- Ai Generated
    sortObject(obj) {
        if (typeof obj !== 'object' || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map((item) => this.sortObject(item));

        const sortedObj = {};
        Object.keys(obj)
            .sort()
            .forEach((key) => {
                sortedObj[key] = this.sortObject(obj[key]);
            });
        return sortedObj;
    }

    async get(key) {
        try {
            const cachedData = await redisClient.get(key);
            return cachedData ? JSON.parse(cachedData) : null;
        } catch (error) {
            return null;
        }
    }

    async set(key, data, ttl) {
        try {
            await redisClient.setEx(key, ttl, JSON.stringify(data));
            return true;
        } catch (error) {
            return false;
        }
    }

    async del(key) {
        try {
            const result = await redisClient.del(key);
            return result > 0;
        } catch (error) {
            return false;
        }
    }

    // Delete cache entries by pattern
    async delPattern(pattern, { batchSize = 1000, useUnlink = true } = {}) {
        let total = 0;
        const size =
            Number.isInteger(batchSize) && batchSize > 0 ? batchSize : 1000;

        const pipeline = redisClient.multi();
        let batch = [];

        /**
         * REFACTOR THE LOOP LATER
         */
        for await (const key of redisClient.scanIterator({
            MATCH: pattern,
            COUNT: size,
        })) {
            batch.push(String(key));

            if (batch.length >= size) {
                if (batch.length > 0) {
                    if (useUnlink && typeof pipeline.unlink === 'function') {
                        pipeline.unlink(...batch);
                    } else {
                        pipeline.del(...batch);
                    }
                    total += batch.length;
                    batch = [];
                }
            }
        }

        if (batch.length > 0) {
            if (useUnlink && typeof pipeline.unlink === 'function') {
                pipeline.unlink(...batch);
            } else {
                pipeline.del(...batch);
            }
            total += batch.length;
        }

        if (total > 0) {
            await pipeline.exec();
        }
        return total;
    }

    async getStats() {
        try {
            const info = await redisClient.info('memory');
            const keyspace = await redisClient.info('keyspace');
            return {
                memoryInfo: info,
                keyspaceInfo: keyspace,
                isConnected: redisClient.isReady,
            };
        } catch (error) {
            return null;
        }
    }
}

module.exports = new CacheManager();
