const redis = require('redis');

const client = redis.createClient({
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASS,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    },
});

client.on('error', (err) => console.log('Redis Client Error', err));

client.connect();

module.exports = client;
