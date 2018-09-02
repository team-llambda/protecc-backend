'use strict';

// dependencies
const express = require('express');
const bodyParser = require('body-parser');
const routes = require("./routes");
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const sockets = require('./sockets');

// init express app
const app = express();

// define port of application
const port = 3000;

// init the http server with the express app
var server = require('http').Server(app);

// connect to mongodb w/ mongoose
var mongodbConnectionString = 'mongodb://admin:' + process.env.DB_PASSWORD + '@recordbookcluster0-shard-00-00-l24me.mongodb.net:27017,recordbookcluster0-shard-00-01-l24me.mongodb.net:27017,recordbookcluster0-shard-00-02-l24me.mongodb.net:27017/' + process.env.DB_NAME + '?ssl=true&replicaSet=RecordBookCluster0-shard-0&authSource=admin';
mongoose.Promise = global.Promise;
mongoose.connect(mongodbConnectionString);
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', async () => {
  console.log("MongoDB is connected!");
});

// initialize express sessions and cookie handling
var cookieExpire = 60 * 60 * 1000 * 24 * 7; //1 week
app.set('trust proxy', 1) // trust first proxy

// init the express sessions middleware w/ mongostore
var sessionMiddleware = session({
  name: "session_id",
  secret: "jKtebTAnME2PFC6qaWPJwD9RLF4v2tDk",
  resave: true,
  saveUninitialized: false,
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  }),
  cookie: {
    httpOnly: true,
    maxAge: cookieExpire,
    path: '/',
    secure: false // TODO: change this and test
  },
  rolling: true,
  unset: 'destroy'
});

sockets.init(server, sessionMiddleware, app)

app.use(sessionMiddleware);
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

routes(app);

server.listen(port, () => {
  console.log("HTTPS Listening on port " + port);
});
