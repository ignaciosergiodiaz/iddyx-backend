const app = require('./app')
const log = require('./utils/logger')
const config = require('./config/index')

var session = require('express-session')
var port = 3945

//connect db
const https = require('https');

async function init() {
    await app.listen(config.puerto)
    log.info(`Leasting on port `+port)
}

init()