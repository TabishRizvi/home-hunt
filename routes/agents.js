var express = require('express');
var router = express.Router();

var _ =require('underscore');
var validator =require('validator');
var async =require('async');
var moment =require('moment');

var utils = require('../utils');
var DAO = require('../DAO');


validator.isNumber = function(value){
    return typeof value =="number" && !isNaN(value);
};

validator.isInteger =function(value){

    if(validator.isNumber(value)==false){
        return false;
    }

    return Math.floor(value)==value;
};


/* ============== Agent routes =====================*/


router.post('/register',
    upload.single('profile_pic'),
    function (req, res, next) {


        if (_.isUndefined(req.body.email) || _.isUndefined(req.body.name) || _.isUndefined(req.body.password) || _.isUndefined(req.body.phone)) {
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }

        if (!validator.isEmail(req.body.email)) {
            utils.sendResponse(res, 400, 'email is invalid', {});
            return;
        }

        if (!validator.isLength(req.body.password, {min: 6})) {
            utils.sendResponse(res, 400, 'password is invalid', {});
            return;
        }

        if (!validator.isLength(req.body.phone, {min: 10, max: 10})) {
            utils.sendResponse(res, 400, 'phone is invalid', {});
            return;
        }

        if(!_.isUndefined(req.file) && !utils.verifyMimeType(req.file,'image')){
            utils.sendResponse(res, 400, 'profile pic must be png,jpeg,bmp or gif file', {});
            return;
        }


        next();

    },
    function (req, res, next) {

        var payload = {
            email: validator.normalizeEmail(req.body.email),
            name: req.body.name,
            password: req.body.password,
            phone: req.body.phone,
            profilePic: _.isUndefined(req.file) ? null : req.file,
            companyName: _.isUndefined(req.body.company_name)? "" : req.body.company_name
        };



        async.waterfall([
                function (cb) {

                    var criteria = {
                        key: "email",
                        value : payload.email
                    };
                    DAO.agents.getAgents(criteria, cb);

                },
                function (agents, cb) {

                    if (agents.length > 0) {
                        cb({
                            code: 409,
                            message: 'Email is already registered'
                        });
                    }
                    else {
                        var criteria = {
                            key: "phone",
                            value : payload.phone
                        };
                        DAO.agents.getAgents(criteria, cb);
                    }

                },
                function(agents,cb){

                    if (agents.length > 0) {
                        cb({
                            code: 409,
                            message: 'Phone is already registered'
                        });
                    }
                    else {
                        cb(null);
                    }

                },
                function (cb) {

                    utils.hashPassword(payload.password, cb);

                },
                function (hashPassword, cb) {
                    payload.password = hashPassword;
                    cb(null);
                },
                function (cb) {

                    if(payload.profilePic==null){
                        cb(null,"");
                        return;
                    }

                    utils.uploadFile(payload.profilePic,'profile-pic',cb);

                },
                function(uploadURL,cb){

                    payload.uploadURL = uploadURL;


                    cb(null);
                },
                function (cb) {
                    DAO.agents.createAgent(payload, cb);
                },

                function (insertId, cb) {
                    cb(null, {
                        code: 201,
                        message: 'Agent registered.',
                        data: {
                            agent_id: insertId
                        }
                    });
                }
            ], function (err, result) {
                if (err) {
                    utils.sendResponse(res, err.code, err.message, {});
                }
                else {
                    utils.sendResponse(res, result.code, result.message, result.data)
                }


            }
        );
    }
);


router.put('/login',
    function (req, res, next) {


        if ( (_.isUndefined(req.body.email) && _.isUndefined(req.body.phone) ) || _.isUndefined(req.body.password)) {
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }


        next();

    },
    function (req, res, next) {

        var payload = {
            email: _.isUndefined(req.body.email)?null:validator.normalizeEmail(req.body.email),
            phone: _.isUndefined(req.body.phone)?null:req.body.phone,
            password: req.body.password
        };


        async.waterfall([
                function(cb){

                    var criteria;
                    if(payload.email!=null){
                        criteria = {
                            key: "email",
                            value : payload.email
                        };
                        DAO.agents.getAgents(criteria,cb);
                    }
                    else{
                        criteria = {
                            key: "phone",
                            value : payload.phone
                        };
                        DAO.agents.getAgents(criteria,cb);
                    }
                },
                function(agents,cb){
                    if(agents.length==0){
                        cb({
                            code: 401,
                            message: (payload.email!=null?"Email":"Phone") + " is not registered."
                        });
                    }
                    else{
                        payload.agentInfo = agents[0];
                        utils.comparePassword(payload.password,payload.agentInfo.password,cb);
                    }
                },
                function(isSame,cb){

                    if(!isSame){
                        cb({
                            code: 401,
                            message: "Password is invalid."
                        });
                    }
                    else{
                        utils.createAccessToken({id:payload.agentInfo.id},cb);
                    }
                },
                function(accessToken,cb){
                    payload.accessToken = accessToken;

                    var criteria = {
                        key: "id",
                        value : payload.agentInfo.id
                    };
                    var arg = [
                        {
                            key:"access_token",
                            value:payload.accessToken
                        }
                    ];

                    DAO.agents.updateAgent(criteria,arg,cb);
                },
                function(affectedRows,cb){
                    if(affectedRows==0){
                        cb({
                            code: 401,
                            message: "Access token cannot be updated"
                        });
                    }
                    else{
                        cb(null,{
                            code:200,
                            message:"Logged in successfully.",
                            data:{
                                email: payload.agentInfo.email,
                                user_type:'agent',
                                access_token:payload.accessToken
                            }
                        });
                    }
                }

            ], function (err, result) {
                if (err) {
                    utils.sendResponse(res, err.code, err.message, {});
                }
                else {
                    utils.sendResponse(res, result.code, result.message, result.data)
                }


            }
        )
    }
);


router.put('/logout',
    function (req, res, next) {


        if (_.isUndefined(req.headers.authorization)) {
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }


        next();

    },
    function (req, res, next) {

        var payload = {
            accessToken: req.headers.authorization

        };


        async.waterfall([
                function (cb) {
                    utils.verifyAccessToken(payload.accessToken,'agent',cb);
                },
                function(agentId,cb){
                    payload.agentId = agentId;


                    var criteria = {
                        key: "id",
                        value : payload.agentId
                    };
                    var arg = [
                        {
                            key:"access_token",
                            value:""
                        }
                    ];

                    DAO.agents.updateAgent(criteria,arg,cb);
                },
                function(affectedRows,cb){
                    if(affectedRows==0){
                        cb({
                            code: 401,
                            message: "Access token cannot be updated"
                        });
                    }
                    else{
                        cb(null,{
                            code:200,
                            message:"Logged out successfully.",
                            data:{}

                        });
                    }
                }
            ], function (err, result) {
                if (err) {
                    utils.sendResponse(res, err.code, err.message, {});
                }
                else {
                    utils.sendResponse(res, result.code, result.message, result.data)
                }
            }
        );
    }
);


router.put('/profile-pic/update',
    upload.single('profile_pic'),
    function (req, res, next) {


        if (_.isUndefined(req.headers.authorization) || _.isUndefined(req.file)) {
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }

        if(!utils.verifyMimeType(req.file,'image')){
            utils.sendResponse(res, 400, 'profile pic must be png,jpeg,bmp or gif file', {});
            return;
        }


        next();

    },
    function (req, res, next) {

        var payload = {
            accessToken: req.headers.authorization,
            profilePic :req.file

        };


        async.waterfall([
                function (cb) {
                    utils.verifyAccessToken(payload.accessToken,'agent',cb);
                },
                function(agentId,cb){
                    payload.agentId = agentId;

                    utils.uploadFile(req.file,'profile-pic',cb);
                },
                function(uploadURL,cb){

                    payload.uploadURL = uploadURL;


                    var criteria = {
                        key: "id",
                        value : payload.agentId
                    };
                    var arg = [
                        {
                            key:"pic",
                            value:payload.uploadURL
                        }
                    ];

                    DAO.agents.updateAgent(criteria,arg,cb);

                },
                function(affectedRows,cb){
                    if(affectedRows==0){
                        cb({
                            code: 400,
                            message: "Profile pic cannot be updated"
                        });
                    }
                    else{
                        cb(null,{
                            code:200,
                            message:"Profile pic updated successfully.",
                            data:{}

                        });
                    }
                }
            ], function (err, result) {
                if (err) {
                    utils.sendResponse(res, err.code, err.message, {});
                }
                else {
                    utils.sendResponse(res, result.code, result.message, result.data)
                }
            }
        );
    }
);



router.get('/profile-pic/view',
    function (req, res, next) {


        if (_.isUndefined(req.headers.authorization)) {
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }


        next();

    },
    function (req, res, next) {

        var payload = {
            accessToken: req.headers.authorization

        };


        async.waterfall([
                function (cb) {
                    utils.verifyAccessToken(payload.accessToken,'agent',cb);
                },
                function(agentId,cb){
                    payload.agentId = agentId;
                    var criteria = {
                        key: "id",
                        value : payload.agentId
                    };
                    DAO.agents.getAgents(criteria,cb);
                },
                function(agents,cb){
                    if(agents.length==0){
                        cb({
                            code: 400,
                            message: "Agent not found"
                        });
                    }
                    else if(agents[0].pic==""){
                        cb({
                            code:404,
                            message:"Profile pic not found"
                        });
                    }
                    else{
                        cb(null,{
                            code:200,
                            message:"Profile pic retrieved successfully.",
                            data:{
                                profile_pic:agents[0].pic
                            }

                        });
                    }
                }
            ], function (err, result) {
                if (err) {
                    utils.sendResponse(res, err.code, err.message, {});
                }
                else {
                    utils.sendResponse(res, result.code, result.message, result.data)
                }
            }
        );
    }
);



router.put('/profile/update',
    function (req, res, next) {





        if (_.isUndefined(req.headers.authorization) ||  ( _.isUndefined(req.body.name) && _.isUndefined(req.body.company_name) && _.isUndefined(req.body.phone))) {
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }


        if (!_.isUndefined(req.body.phone) && !validator.isLength(req.body.phone, {min: 10, max: 10})) {
            utils.sendResponse(res, 400, 'phone is invalid', {});
            return;
        }


        next();

    },
    function (req, res, next) {

        var payload = {
            accessToken: req.headers.authorization,
            name : _.isUndefined(req.body.name)?null:req.body.name,
            companyName : _.isUndefined(req.body.company_name)?null:req.body.company_name,
            phone : _.isUndefined(req.body.phone)?null:req.body.phone

        };


        async.waterfall([
                function (cb) {
                    utils.verifyAccessToken(payload.accessToken,'agent',cb);
                },
                function(agentId,cb){
                    payload.agentId = agentId;


                    var criteria = {
                        key: "id",
                        value : payload.agentId
                    };
                    var arg = [];

                    if(payload.name!=null){
                        arg.push({key:'name',value:payload.name});
                    }

                    if(payload.companyName!=null){
                        arg.push({key:'company_name',value:payload.companyName});
                    }

                    if(payload.phone!=null){
                        arg.push({key:'phone',value:payload.phone});
                    }

                    DAO.agents.updateAgent(criteria,arg,cb);
                },
                function(changedRows,cb){
                    if(changedRows==0){
                        cb({
                            code: 400,
                            message: "Profile  cannot be updated"
                        });
                    }
                    else{
                        cb(null,{
                            code:200,
                            message:"Profile  updated successfully.",
                            data:{}

                        });
                    }
                }
            ], function (err, result) {
                if (err) {
                    utils.sendResponse(res, err.code, err.message, {});
                }
                else {
                    utils.sendResponse(res, result.code, result.message, result.data)
                }
            }
        );
    }
);


router.get('/profile/view',
    function (req, res, next) {


        if (_.isUndefined(req.headers.authorization)) {
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }


        next();

    },
    function (req, res, next) {

        var payload = {
            accessToken: req.headers.authorization

        };


        async.waterfall([
                function (cb) {
                    utils.verifyAccessToken(payload.accessToken,'agent',cb);
                },
                function(agentId,cb){
                    payload.agentId = agentId;
                    var criteria = {
                        key: "id",
                        value : payload.agentId
                    };
                    DAO.agents.getAgents(criteria,cb);
                },
                function(agents,cb){
                    if(agents.length==0){
                        cb({
                            code: 400,
                            message: "User not found"
                        });
                    }
                    else{
                        cb(null,{
                            code:200,
                            message:"Profile  retrieved successfully.",
                            data:{
                                email: agents[0].email,
                                name: agents[0].name,
                                phone: agents[0].phone,
                                profile_pic: agents[0].pic,
                                is_email_verified: agents[0].is_email_verified,
                                is_phone_verified: agents[0].is_phone_verified,
                                date_created: (moment.utc(agents[0].date_created)).toISOString(),
                                company_name: agents[0].company_name
                            }

                        });
                    }
                }
            ], function (err, result) {
                if (err) {
                    utils.sendResponse(res, err.code, err.message, {});
                }
                else {
                    utils.sendResponse(res, result.code, result.message, result.data)
                }
            }
        );
    }
);


router.post('/property/add',
    function (req, res, next) {

        console.log(req.body);

        console.log(validator.isNumber(32));



        if (_.isUndefined(req.headers.authorization) ||
            _.isUndefined(req.body.title) || _.isUndefined(req.body.type_id) ||
            _.isUndefined(req.body.area)  || _.isUndefined(req.body.rooms) ||
            _.isUndefined(req.body.furnished_type_id)  || _.isUndefined(req.body.price) ||
            _.isUndefined(req.body.description)  || _.isUndefined(req.body.lat) ||
            _.isUndefined(req.body.lng)  || _.isUndefined(req.body.formatted_address) ) {
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }


        if(_.indexOf([1,2],req.body.type_id)==-1){
            utils.sendResponse(res, 400, 'type_id is invalid', {});
            return;
        }


        if(!validator.isInteger(req.body.area) || req.body.area<=0 || !validator.isInteger(req.body.rooms) || req.body.rooms<=0 || !validator.isInteger(req.body.price) || req.body.price<=0){
            utils.sendResponse(res, 400, 'area,rooms adn price must be positive integers', {});
            return;
        }


        if(_.indexOf([1,2,3],req.body.furnished_type_id)==-1){
            utils.sendResponse(res, 400, 'furnished_type_id is invalid', {});
            return;
        }

        if(!validator.isNumber(req.body.lat) || req.body.lat<-90 || req.body.lat>90 || !validator.isNumber(req.body.lng) || req.body.lng<-180 || req.body.lng>180 ){
            utils.sendResponse(res, 400, 'lat,lng are invalid', {});
            return;
        }




        next();

    },
    function (req, res, next) {

        var payload = {
            accessToken: req.headers.authorization,
            title :req.body.title ,
            typeId :req.body.type_id ,
            area :req.body.area ,
            rooms :req.body.rooms ,
            furnishedTypeId :req.body.furnished_type_id ,
            price :req.body.price ,
            description :req.body.description ,
            lat :req.body.lat ,
            lng :req.body.lng ,
            formattedAddress :req.body.formatted_address
        };


        async.waterfall([
                function (cb) {
                    utils.verifyAccessToken(payload.accessToken,'agent',cb);
                },
                function(agentId,cb){
                    payload.agentId = agentId;


                    DAO.properties.createProperty(payload,cb);
                },
                function(insertId,cb){
                    cb(null, {
                        code: 201,
                        message: 'Property added.',
                        data: {
                            property_id: insertId
                        }
                    });
                }
            ], function (err, result) {
                if (err) {
                    utils.sendResponse(res, err.code, err.message, {});
                }
                else {
                    utils.sendResponse(res, result.code, result.message, result.data)
                }
            }
        );
    }
);


module.exports = router;

