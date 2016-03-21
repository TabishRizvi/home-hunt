/**
 * Created by tabishrizvi on 27/02/16.
 */

var fs = require('fs');
var _  = require('underscore');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var config = require('../config');
var AWS = require('aws-sdk');
var randomstring = require("randomstring");
var mime = require('mime-types');

var DAO = require("../DAO");


module.exports.constants = {

    google_places_key :"****************************"
};



/**
 * Send API response
 * @param res
 * @param status
 * @param message
 * @param data
 */

module.exports.sendResponse = function(res,status,message,data){

    var response =  {
        message:message,
        data:data
    };

    res.status(status).send(response);
};



/**
 * Generating hash of password using bcrypt
 * @param rawPass
 * @param cb
 */
module.exports.hashPassword = function(rawPass,cb){

    bcrypt.genSalt(10,function(err,salt){
        if(err){
            console.log("-------------- Error in hashing password",err.stack);
            cb({
                code:500,
                message:'Internal Server Error'
            });
        }
        else{
            bcrypt.hash(rawPass,salt,function(err,hash){
                if(err){
                    console.log("-------------- Error in hashing password",err.stack);
                    cb({
                        code:500,
                        message:'Internal Server Error'
                    });
                }
                else {
                    cb(null,hash);
                }
            });
        }
    });
};

/**
 * Compare password and its hash using bcrypt
 * @param pass
 * @param hash
 * @param cb
 */

module.exports.comparePassword = function(pass,hash,cb){

    bcrypt.compare(pass,hash,cb);
};



/**
 * Append expiration date to authenticationPayload and generate its access token using jwt
 * @param authenticationPayload
 * @param ttl
 * @param callback
 */
module.exports.createAccessToken = function(authenticationPayload,cb){




    jwt.sign(authenticationPayload,config[env].HMACKey,{},function(token){
        cb(null,token);
    });
};


/**
 * Validates access token by verifying it and checking againt the revoke list.If valid returns decoded authenticationPayload
 * @param token
 * @param callback
 */

module.exports.verifyAccessToken = function(token,userType,callback){

    jwt.verify(token,config[env].HMACKey,function(err,decoded){
        if(err){
            console.log("-------------- Error in decoding access token",err.stack);
            callback({
                code:401,
                message:'Invalid access token'
            });
        }
        else {


            var criteria = {
                key: "id",
                value : decoded.id
            };

            if(userType=='user'){
                DAO.users.getUsers(criteria,function(err,users){
                    if(err){
                        callback(err);
                    }
                    else{
                        if(users.length==0 || users[0].access_token != token){
                            callback({
                                code:401,
                                message:'Invalid access token'
                            });
                        }
                        else {
                            callback(null,decoded.id);
                        }
                    }
                });
            }
            else if(userType=='agent'){
                DAO.agents.getAgents(criteria,function(err,agents){
                    if(err){
                        callback(err);
                    }
                    else{
                        if(agents.length==0 || agents[0].access_token != token){
                            callback({
                                code:401,
                                message:'Invalid access token'
                            });
                        }
                        else {
                            callback(null,decoded.id);
                        }
                    }
                });
            }

        }
    });
};


/**
 * Upload file to S3 bucket
 * @param file
 * @param folder
 * @param callback
 */


module.exports.uploadFile = function(file,folder,callback) {


    AWS.config.update({
        accessKeyId: config[env].aws.accessKey,
        secretAccessKey: config[env].aws.secretKey
    });

    var S3 = new AWS.S3();

    fs.readFile(file.path,{},function(err,data){

        if(err){
            console.log("-------------- Error in reading uploaded file",err.stack);
            callback({
                code:500,
                message:'Internal Server Error'
            });
        }
        else{
            var key = folder+"/"+randomstring.generate(7)+ "."+mime.extension(file.mimetype);

            var params = {
                Bucket:config[env].aws.bucket,
                ACL:'public-read',
                Key:key,
                Body:data,
                ContentType:file.mimetype
            };

            S3.upload(params,function(err,data){

                if(err){
                    console.log("-------------- Error in uploading file",err.stack);
                    callback({
                        code:500,
                        message:'Internal Server Error'
                    });
                }
                else{
                    callback(null,data.Location);
                }

                fs.unlinkSync(file.path);

            })
        }
    });


};


module.exports.verifyMimeType = function(file,expectedType){

    if(expectedType=="image"){
        return _.indexOf(['image/png','image/bmp','image/jpeg','image/gif'],file.mimetype)!=-1;
    }
};









