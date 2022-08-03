//Modulos
const       express = require('express');

const    bodyParser = require('body-parser');
const    mongoose = require('mongoose')
const  cookieParser = require('cookie-parser') ;
const       morgan  = require('morgan') ;
const          cors = require('cors');
const AWS  = require('aws-sdk');

const https = require('https');

require('dotenv').config();

const       session = require('express-session');
const MongoStore = require('connect-mongo')(session);
// const MongoUrlDev = "mongodb://localhost:27017/registrodeproductos";
const MongoUrlProd = process.env.MONGO_URI;

require("dotenv").config();

const app = express()

//Archivos
let passport = require('passport') 
     authJWT = require('./libs/auth')
     log     = require('./utils/logger');

passport.use(authJWT)
passport.initialize()

app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
})

app.use(cookieParser())
app.use(express.json({ extended: true}))
app.use(express.urlencoded({ extended: true}))
app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json({ limit: "10000mb", extended: true }));
app.use(bodyParser.urlencoded({ parameterLimit: "100000", limit:"1000mb", extended: true }));

// app.use(bodyParser.raw({type: 'image/*'}))

app.use(morgan('dev'))

log.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};

app.use(cors());

app.use(session({   
    secret: "esto_es_secreto",
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({
        url:MongoUrlDev,
        autoReconnect: true 
    })

}));


mongoose.Promise = global.Promise ;
mongoose.connect(MongoUrlDev, {
    useUnifiedTopology: true,
    useNewUrlParser: true
});

mongoose.connection.on('error', (err) => {
    throw err
    process.exit(1)
});

app.use((req, res, next) => {

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'x-www-form-urlencoded, Origin, X-Requested-With, Content-Type, Accept, Authorization, *');
  
    if (req.method === 'OPTIONS'){
        res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Credentials', true);
        return res.status(200).json({});
    }

    next();
});



app.use(require('./routes'))

module.exports = app
