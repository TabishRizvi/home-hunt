/**
 * Created by tabishrizvi on 27/02/16.
 */

var config = require('./config');
var mysql      = require('mysql');
var mongoose  = require('mongoose');
var chalk = require('chalk');


mongoose.connect(config[env].db.mongodb.uri);

mongoose.connection.on('connected', function () {
    console.log(chalk.yellow('Mongoose\t\t===============>\t'),chalk.black.bgGreen('CONNECTED'));
});

mongoose.connection.on('error',function () {
    console.log(chalk.yellow('Mongoose\t\t===============>\t'),chalk.black.bgRed('ERROR IN CONNECTING'));

});

var connection = mysql.createConnection(config[env].db.mysql);

connection.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    console.log('connected as id ' + connection.threadId);
});





module.exports = connection;