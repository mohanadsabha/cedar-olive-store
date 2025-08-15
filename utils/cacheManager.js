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
            const startTime = Date.now();
            const cachedData = await redisClient.get(key);
            const duration = Date.now() - startTime;

            if (process.env.NODE_ENV === 'development') {
                console.log(
                    `Cache GET [${cachedData ? 'HIT' : 'MISS'}]: ${key} (${duration}ms)`,
                );
            }

            return cachedData ? JSON.parse(cachedData) : null;
        } catch (error) {
            console.error(`Cache GET error for key ${key}:`, error);
            return null;
        }
    }

    async set(key, data, ttl) {
        try {
            await redisClient.setEx(key, ttl, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Cache SET error for key ${key}:`, error);
            return false;
        }
    }

    async del(key) {
        try {
            const result = await redisClient.del(key);
            return result > 0;
        } catch (error) {
            console.error(`Cache DELETE error for key ${key}:`, error);
            return false;
        }
    }

    // Delete cache entries by pattern
    async delPattern(pattern) {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
                return keys.length;
            }
            return 0;
        } catch (error) {
            console.error(
                `Cache DELETE PATTERN error for pattern ${pattern}:`,
                error,
            );
            return 0;
        }
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
            console.error('Error getting cache stats:', error);
            return null;
        }
    }
}

module.exports = new CacheManager();
