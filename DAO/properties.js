/**
 * Created by tabishrizvi on 08/03/16.
 */

connection  = require("../db");
moment = require('moment');
_ = require('underscore');


module.exports.getProperties= function(criteria,cb){

    var sql = "SELECT * FROM `properties` WHERE `"+criteria.key+"` =?";
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


module.exports.searchProperties = function(lat,lng,title,typeId,minArea,maxArea,rooms,furnishedTypeId,minPrice,maxPrice,agentId,orderBy,sortOrder,limit,offset,cb){

    var sql = "SELECT p.*, ( 6371 * acos( cos( radians(?) ) * cos( radians( p.`lat` ) )* cos( radians( p.`lng` ) - radians(?) ) + sin( radians(?) ) * sin(radians(p.`lat`)) ) ) AS distance " +
        "FROM `properties` as p WHERE ";
    var params = [lat,lng,lat];

    if(title!=null){
        sql += "p.`title` LIKE ? AND ";
        params.push(title);
    }

    if(typeId!=null){
        sql += "p.`type_id` = ? AND ";
        params.push(typeId);
    }

    if(minArea!=null){
        sql += "p.`area` >= ? AND ";
        params.push(minArea);
    }

    if(maxArea!=null){
        sql += "p.`area` <= ? AND ";
        params.push(maxArea);
    }


    if(rooms!=null){
        sql += "p.`rooms` = ? AND ";
        params.push(rooms);
    }

    if(minPrice!=null){
        sql += "p.`price` >= ? AND ";
        params.push(minPrice);
    }

    if(maxPrice!=null){
        sql += "p.`price` <= ? AND ";
        params.push(maxPrice);
    }



    if(furnishedTypeId!=null){
        sql += "p.`furnished_type_id` = ? AND ";
        params.push(furnishedTypeId);
    }


    if(agentId!=null){
        sql += "p.`agent_id` = ? AND ";
        params.push(agentId);
    }

    sql += "`p`.id=`p`.id HAVING distance<=50 ";

    sql += "ORDER BY "+orderBy+" "+sortOrder+" LIMIT ? OFFSET ?;";
    params.push(limit,offset);




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



module.exports.createProperty = function(arg,cb){

    var currentMoment = moment.utc();

    var sql = "INSERT INTO `properties`(`title`,`type_id`,`area`,`rooms`,`furnished_type_id`,`price`,`agent_id`,`description`,`lat`,`lng`,`formatted_address`,`date_added`) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)";
    var params = [arg.title,arg.typeId,arg.area,arg.rooms,arg.furnishedTypeId,arg.price,arg.agentId,arg.description,arg.lat,arg.lng,arg.formattedAddress,currentMoment.format("YYYY-MM-DD HH:mm:ss")];

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