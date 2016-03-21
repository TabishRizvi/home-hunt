/**
 * Created by tabishrizvi on 03/03/16.
 */

connection  = require("../db");
moment = require('moment');
_ = require('underscore');

module.exports.getUsers = function(criteria,cb){

    var sql = "SELECT * FROM `users` WHERE `"+criteria.key+"` =?";
    var params = [criteria.value];

    connection.query(sql,params,function(err,results){

        if(err){
            console.log("-------------- MySQL error",err.stack);
            cb({
                code:500,
                message:'Internal Server Error'
            });
        }
        else{
            cb(null,results);
        }
    });

};



module.exports.createUser = function(arg,cb){

    var currentMoment = moment.utc();

    var sql = "INSERT INTO `users`(`email`,`password`,`name`,`phone`,`pic`,`date_created`) VALUES(?,?,?,?,?,?)";
    var params = [arg.email,arg.password,arg.name,arg.phone,arg.uploadURL,currentMoment.format("YYYY-MM-DD HH:mm:ss")];

    connection.query(sql,params,function(err,result){

        if(err){
            console.log("-------------- MySQL error",err.stack);
            cb({
                code:500,
                message:'Internal Server Error'
            });
        }
        else{
            cb(null,result.insertId);
        }
    });
};


module.exports.updateUser = function(criteria,arg,cb){

    var sql = "UPDATE `users` SET";
    var params = [];
    _.each(arg,function(element,index,list){
        sql += " `"+element.key+"` = ?";

        if(index<list.length-1){
            sql += ",";
        }

        params.push(element.value);
    });

    sql += " WHERE `"+criteria.key+"` = ?";
    params.push(criteria.value);

    connection.query(sql,params,function(err,result){
        if(err){
            console.log("-------------- MySQL error",err.stack);
            cb({
                code:500,
                message:'Internal Server Error'
            });
        }
        else{
            cb(null,result.affectedRows);
        }
    });
};



