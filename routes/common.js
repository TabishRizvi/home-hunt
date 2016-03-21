var express = require('express');
var router = express.Router();

var _ =require('underscore');
var validator =require('validator');
var async =require('async');
var moment =require('moment');
var request =require('request');

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




router.get('/places/autocomplete',
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

        if (_.isUndefined(req.query.user_type) || _.isUndefined(req.query.input) ) {
            utils.sendResponse(res, 400, 'Some parameters missing', {});
            return;
        }


        if( _.indexOf(['user','agent','admin'],req.query.user_type)==-1){
            utils.sendResponse(res, 400, 'user_type is invalid', {});
            return;
        }

        if(req.query.input==""){
            utils.sendResponse(res, 400, 'input is invalid', {});
            return;
        }

        if (    (_.isUndefined(req.query.lat) && !_.isUndefined(req.query.lng)) ||
                (!_.isUndefined(req.query.lat) && _.isUndefined(req.query.lng))) {
            utils.sendResponse(res, 400, 'lat,lng are invalid', {});
            return;
        }

        if( (!_.isUndefined(req.query.lat) && (!validator.isNumber(req.query.lat) || req.query.lat<-90 || req.query.lat>90))
            || (!_.isUndefined(req.query.lng) && (!validator.isNumber(req.query.lng) || req.query.lng<-180 || req.query.lng>180 ))){
            utils.sendResponse(res, 400, 'lat,lng are invalid', {});
            return;
        }


        next();

    },
    function (req, res, next) {

        var payload = {
            accessToken: req.headers.authorization,
            userType : req.query.user_type,
            input : req.query.input,
            lat : _.isUndefined(req.query.lat)?null:req.query.lat,
            lng : _.isUndefined(req.query.lng)?null:req.query.lng
        };


        async.waterfall([
                function (cb) {
                    utils.verifyAccessToken(payload.accessToken,payload.userType,cb);
                },
                function(id,cb){


                    var options = {
                        method: 'GET',
                        url: 'https://maps.googleapis.com/maps/api/place/autocomplete/json',
                        qs:{
                            key:utils.constants.google_places_key,
                            input:payload.input,
                            components:"country:in",
                            json:true
                        }
                    };

                    if(payload.lat!=null){
                        options.qs.location = payload.lat+","+payload.lng;
                        options.qs.radius = 25*1000;

                    }

                    request(options,cb);

                },
                function(response,body,cb){

                    body = JSON.parse(body);

                    if(body.status!="OK" &&  body.status!="ZERO_RESULTS"){
                        console.log("++++++++++++++++++++++++ Google places API error",body.status);
                    }

                   _.each(body.predictions,function(element,index,list){
                        list[index] = _.pick(element,["description","place_id"]);
                    });

                    cb(null,{
                        code:200,
                        message:"Predictions retrieved successfully.",
                        data:{
                            predictions : body.predictions
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

