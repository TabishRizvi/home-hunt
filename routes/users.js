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


/* ============== User routes =====================*/


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
            profilePic: _.isUndefined(req.file) ? null : req.file
        };



        async.waterfall([
                function (cb) {

                    var criteria = {
                        key: "email",
                        value : payload.email
                    };
                    DAO.users.getUsers(criteria, cb);

                },
                function (users, cb) {

                    if (users.length > 0) {
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
                        DAO.users.getUsers(criteria, cb);
                    }

                },
                function(users,cb){

                    if (users.length > 0) {
                        cb({
                            code: 409,
                            message: 'Phone is already registered.'
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
                    DAO.users.createUser(payload, cb);
                },

                function (insertId, cb) {
                    cb(null, {
                        code: 201,
                        message: 'User registered.',
                        data: {
                            user_id: insertId
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
                        }
                        DAO.users.getUsers(criteria,cb);
                    }
                    else{
                        criteria = {
                            key: "phone",
                            value : payload.phone
                        };
                        DAO.users.getUsers(criteria,cb);
                    }
                },
                function(users,cb){
                    if(users.length==0){
                        cb({
                            code: 401,
                            message: (payload.email!=null?"Email":"Phone") + " is not registered."
                        });
                    }
                    else{
                        payload.userInfo = users[0];
                        utils.comparePassword(payload.password,payload.userInfo.password,cb);
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
                        utils.createAccessToken({id:payload.userInfo.id},cb);
                    }
                },
                function(accessToken,cb){
                    payload.accessToken = accessToken;

                    var criteria = {
                        key: "id",
                        value : payload.userInfo.id
                    };
                    var arg = [
                        {
                            key:"access_token",
                            value:payload.accessToken
                        }
                    ];

                    DAO.users.updateUser(criteria,arg,cb);
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
                                email: payload.userInfo.email,
                                user_type:'user',
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
                    utils.verifyAccessToken(payload.accessToken,'user',cb);
                },
                function(userId,cb){
                    payload.userId = userId;


                    var criteria = {
                        key: "id",
                        value : payload.userId
                    };
                    var arg = [
                        {
                            key:"access_token",
                            value:""
                        }
                    ];

                    DAO.users.updateUser(criteria,arg,cb);
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
                    utils.verifyAccessToken(payload.accessToken,'user',cb);
                },
                function(userId,cb){
                    payload.userId = userId;

                    utils.uploadFile(req.file,'profile-pic',cb);
                },
                function(uploadURL,cb){

                    payload.uploadURL = uploadURL;


                    var criteria = {
                        key: "id",
                        value : payload.userId
                    };
                    var arg = [
                        {
                            key:"pic",
                            value:payload.uploadURL
                        }
                    ];

                    DAO.users.updateUser(criteria,arg,cb);

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
                    utils.verifyAccessToken(payload.accessToken,'user',cb);
                },
                function(userId,cb){
                    payload.userId = userId;
                    var criteria = {
                        key: "id",
                        value : payload.userId
                    };
                    DAO.users.getUsers(criteria,cb);
                },
                function(users,cb){
                    if(users.length==0){
                        cb({
                            code: 400,
                            message: "User not found"
                        });
                    }
                    else if(users[0].pic==""){
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
                                profile_pic:users[0].pic
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



router.put('/password/update',
    function (req, res, next) {





        if (_.isUndefined(req.headers.authorization) ||   _.isUndefined(req.body.old_password) ||  _.isUndefined(req.body.new_password)) {
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }


        if (!validator.isLength(req.body.new_password, {min: 6})) {
            utils.sendResponse(res, 400, 'new_password is invalid', {});
            return;
        }


        next();

    },
    function (req, res, next) {

        var payload = {
            accessToken: req.headers.authorization,
            oldPassword:req.body.old_password,
            newPassword : req.body.new_password

        };


        async.waterfall([
                function (cb) {
                    utils.verifyAccessToken(payload.accessToken,'user',cb);
                },
                function(userId,cb){
                    payload.userId = userId;


                    var criteria = {
                        key: "id",
                        value : payload.userId
                    };

                    DAO.users.getUsers(criteria,cb);
                },
                function(users,cb){
                    if(users.length==0){
                        cb({
                            code: 400,
                            message: "User not found"
                        });
                        return;
                    }


                    async.waterfall([
                        function(cb1){
                            utils.comparePassword(payload.oldPassword,users[0].password,cb1);
                        },
                        function(isSame,cb1){
                            if(!isSame){
                                cb1({
                                    code: 401,
                                    message: "Old password is invalid"
                                });
                                return;
                            }

                            utils.comparePassword(payload.newPassword,users[0].password,cb1);
                        },
                        function(isSame,cb1){
                            if(isSame){
                                cb1({
                                    code: 401,
                                    message: "New password must be different from old password"
                                });
                                return;
                            }

                            utils.hashPassword(payload.newPassword,cb1);
                        },

                        function(hashPassword,cb1){

                            var criteria = {
                                key: "id",
                                value : payload.userId
                            };
                            var arg = [{key:'password',value:hashPassword}];



                            DAO.users.updateUser(criteria,arg,cb1);
                        }
                    ],function(err,data){
                        if(err){
                            cb(err);
                        }
                        else{
                            cb(null,data);
                        }
                    });

                },
                function(changedRows,cb){
                    if(changedRows==0){
                        cb({
                            code: 400,
                            message: "Password  cannot be updated"
                        });
                    }
                    else{
                        cb(null,{
                            code:200,
                            message:"Password  updated successfully.",
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
                    utils.verifyAccessToken(payload.accessToken,'user',cb);
                },
                function(userId,cb){
                    payload.userId = userId;
                    var criteria = {
                        key: "id",
                        value : payload.userId
                    };
                    DAO.users.getUsers(criteria,cb);
                },
                function(users,cb){
                    if(users.length==0){
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
                                email: users[0].email,
                                name: users[0].name,
                                phone: users[0].phone,
                                profile_pic: users[0].pic,
                                is_email_verified: users[0].is_email_verified,
                                is_phone_verified: users[0].is_phone_verified,
                                date_created: (moment.utc(users[0].date_created)).toISOString()
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





        if (_.isUndefined(req.headers.authorization) ||  ( _.isUndefined(req.body.name) && _.isUndefined(req.body.phone))) {
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
            phone : _.isUndefined(req.body.phone)?null:req.body.phone

        };


        async.waterfall([
                function (cb) {
                    utils.verifyAccessToken(payload.accessToken,'user',cb);
                },
                function(userId,cb){
                    payload.userId = userId;


                    var criteria = {
                        key: "id",
                        value : payload.userId
                    };
                    var arg = [];

                    if(payload.name!=null){
                        arg.push({key:'name',value:payload.name});
                    }

                    if(payload.phone!=null){
                        arg.push({key:'phone',value:payload.phone});
                    }

                    DAO.users.updateUser(criteria,arg,cb);
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



router.get('/properties/search',
    function (req, res, next) {


        for(var key in req.query){
            if(!isNaN(req.query[key])){
                req.query[key]= Number(req.query[key]);
            }
        }

        if (_.isUndefined(req.headers.authorization)) {
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }

        if(_.isUndefined(req.query.lat) || _.isUndefined(req.query.lng || _.isUndefined(req.query.limit) || _.isUndefined(req.query.offset)) ){
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }


        if(!validator.isNumber(req.query.lat) || req.query.lat<-90 || req.query.lat>90 || !validator.isNumber(req.query.lng) || req.query.lng<-180 || req.query.lng>180 ){
            utils.sendResponse(res, 400, 'lat,lng are invalid', {});
            return;
        }


        if(!validator.isInteger(req.query.limit) ){
            utils.sendResponse(res, 400, 'limit is invalid', {});
            return;
        }


        if(!validator.isInteger(req.query.offset) ){
            utils.sendResponse(res, 400, 'offset is invalid', {});
            return;
        }




        if(!_.isUndefined(req.query.type_id) && _.indexOf([1,2],req.query.type_id)==-1){
            utils.sendResponse(res, 400, 'type_id is invalid', {});
            return;
        }

        if(!_.isUndefined(req.query.min_area) && (!validator.isInteger(req.query.min_area) || req.query.min_area<=0 )){
            utils.sendResponse(res, 400, 'min_area is invalid', {});
            return;
        }

        if(!_.isUndefined(req.query.max_area) && (!validator.isInteger(req.query.max_area) || req.query.max_area<=0 )){
            utils.sendResponse(res, 400, 'max_area is invalid', {});
            return;
        }

        if(!_.isUndefined(req.query.max_area) && !_.isUndefined(req.query.min_area) && req.query.min_area>req.query.max_area){
            utils.sendResponse(res, 400, 'area range is invalid', {});
            return;
        }


        if(!_.isUndefined(req.query.min_price) && (!validator.isInteger(req.query.min_price) || req.query.min_price<=0 )){
            utils.sendResponse(res, 400, 'min_price is invalid', {});
            return;
        }

        if(!_.isUndefined(req.query.max_price) && (!validator.isInteger(req.query.max_price) || req.query.max_price<=0 )){
            utils.sendResponse(res, 400, 'max_price is invalid', {});
            return;
        }

        if(!_.isUndefined(req.query.max_price) && !_.isUndefined(req.query.min_price) && req.query.min_price>req.query.max_price){
            utils.sendResponse(res, 400, 'price range is invalid', {});
            return;
        }



        if(!_.isUndefined(req.query.rooms) && (!validator.isInteger(req.query.rooms) || req.query.rooms<=0 )){
            utils.sendResponse(res, 400, 'rooms is invalid', {});
            return;
        }


        if(!_.isUndefined(req.query.furnished_type_id) && _.indexOf([1,2,3],req.query.furnished_type_id)==-1){
            utils.sendResponse(res, 400, 'furnished_type_id is invalid', {});
            return;
        }


        if(!_.isUndefined(req.query.order_by) && _.indexOf(['area','rooms','price','distance'],req.query.order_by)==-1){
            utils.sendResponse(res, 400, 'order_by is invalid', {});
            return;
        }

        if(!_.isUndefined(req.query.sort_order) && _.indexOf(['ASC','DESC'],req.query.sort_order)==-1){
            utils.sendResponse(res, 400, 'sort_order is invalid', {});
            return;
        }


        next();

    },
    function (req, res, next) {

        var payload = {
            accessToken: req.headers.authorization,
            lat : req.query.lat,
            lng : req.query.lng,
            limit : req.query.limit,
            offset : req.query.offset,
            typeId : _.isUndefined(req.query.type_id)?null:req.query.type_id,
            minArea : _.isUndefined(req.query.min_area)?null:req.query.min_area,
            maxArea : _.isUndefined(req.query.max_area)?null:req.query.max_area,
            minPrice : _.isUndefined(req.query.min_price)?null:req.query.min_price,
            maxPrice : _.isUndefined(req.query.max_price)?null:req.query.max_price,
            rooms : _.isUndefined(req.query.rooms)?null:req.query.rooms,
            agentId : _.isUndefined(req.query.agent_id)?null:req.query.agent_id,
            furnishedTypeId : _.isUndefined(req.query.furnished_type_id)?null:req.query.furnished_type_id,
            orderBy : _.isUndefined(req.query.order_by)?'distance':req.query.order_by,
            sortOrder:_.isUndefined(req.query.sort_order)?'ASC':req.query.sort_order,
        };


        async.waterfall([
                function (cb) {
                    utils.verifyAccessToken(payload.accessToken,'user',cb);
                },
                function(userId,cb){
                    payload.userId = userId;


                    DAO.properties.searchProperties(payload.lat,payload.lng,
                                    payload.title,payload.typeId,
                                    payload.minArea,payload.maxArea,
                                    payload.rooms,payload.furnishedTypeId,
                                    payload.minPrice,payload.maxPrice,
                                    payload.agentId,payload.orderBy,payload.sortOrder,
                                    payload.limit,payload.offset,cb);
                },
                function(properties,cb){
                    if(properties.length==0){
                        cb({
                            code: 404,
                            message: "No properties found."
                        });
                    }
                    else{

                        _.each(properties,function(element,index,list){
                            list[index] = _.omit(element,["distance"]);
                        });
                        cb(null,{
                            code:200,
                            message: properties.length+" property(s) found.",
                            data:properties

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


router.get('/chats',
    function (req, res, next) {



        if (_.isUndefined(req.headers.authorization)) {
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }

        if(_.isUndefined(req.query.property_id)  ){
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }



        next();

    },
    function (req, res, next) {

        var payload = {
            accessToken: req.headers.authorization,
            propertyId:req.query.property_id
        };


        async.waterfall([
                function (cb) {
                    utils.verifyAccessToken(payload.accessToken,'user',cb);
                },
                function(userId,cb){
                    payload.userId = userId;

                    var criteria = {
                        key: "id",
                        value : payload.propertyId
                    };
                    DAO.properties.getProperties(criteria,cb);


                },
                function(properties,cb){
                    if(properties.length==0){
                        cb({
                            code: 400,
                            message: "Invalid property_id"
                        });
                        return;
                    }

                    payload.propertyTitle = properties[0].title;

                    DAO.chats.getChatsOfProperty(payload.userId,payload.propertyId,cb);


                },
                function(chats,cb){
                    if(chats==null){

                        DAO.chats.createChat(payload.userId,payload.propertyId,payload.propertyTitle,function(err,chats){
                            if(err){
                                cb(err)
                            }
                            else{
                                cb(null,chats);
                            }
                        });
                    }
                    else{
                        cb(null,chats);
                    }


                },
                function(chats,cb){

                    chats = chats.toObject();
                    chats = _.omit(chats,["__v","user_id","_id"]);

                    cb(null,{
                        code:200,
                        message: "Chats retrieved successfully",
                        data:chats

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

