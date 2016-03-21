/**
 * Created by tabishrizvi on 08/03/16.
 */


connection  = require("../db");
moment = require('moment');
_ = require('underscore');

module.exports.getAgents = function(criteria,cb){

    var sql = "SELECT * FROM `agents` WHERE `"+criteria.key+"` =?";
    var params = [criteria.value];

    connection.query(sql,params,function(err,results){
        console.log(results);

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



module.exports.createAgent = function(arg,cb){

    var currentMoment = moment.utc();

    var sql = "INSERT INTO `agents`(`email`,`password`,`name`,`phone`,`pic`,`date_created`,`company_name`) VALUES(?,?,?,?,?,?,?)";
    var params = [arg.email,arg.password,arg.name,arg.phone,arg.uploadURL,currentMoment.format("YYYY-MM-DD HH:mm:ss"),arg.companyName];

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


module.exports.updateAgent = function(criteria,arg,cb){

    var sql = "UPDATE `agents` SET";
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

    console.log(arg);
    console.log(criteria);

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
