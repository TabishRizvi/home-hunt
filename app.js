env = process.env.ENV || 'live';


var express = require('express');
var path = require('path');
var morgan = require('morgan');
var bodyParser = require('body-parser');

var os = require('os');
var multer = require('multer');
upload = multer({dest: os.tmpdir()});


var routes = require('./routes');


var app = express();

// app.set
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('x-powered-by', false);

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
    next();
});

//app.use
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


/**
 * routes
 */

app.get('/', function (req, res, next) {
    res.render('index');
});

app.get('/user/login', function (req, res, next) {
    res.render('user/login');
});

app.get('/user/signup', function (req, res, next) {
    res.render('user/signup');
});


app.get('/user/home', function (req, res, next) {
    res.render('user/home');
});





app.use('/api/user', routes.users);
app.use('/api/agent', routes.agents);
app.use('/api/common', routes.common);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send({
        message: err.message,
        error: {}
    });
});


module.exports = app;
