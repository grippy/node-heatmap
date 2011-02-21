exports.development = {
    redis_db:1,
    redis_host:'127.0.0.1',
    redis_port:6379,
    app_port:8888
}

exports.testing = {
    redis_db:15,
    redis_host:'127.0.0.1',
    redis_port:6379,
    app_port:5000,
}

exports.production = {
    redis_db:1,
    redis_host:'127.0.0.1',
    redis_port:6379,
    app_port:8888,
    app_slaves:1     // only recognized when using node scripts/production.js
}