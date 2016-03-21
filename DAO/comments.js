/**
 * Created by tabishrizvi on 10/03/16.
 */



var mongoose = require('mongoose');


var commentSchema = new mongoose.Schema({
    user_id:String,
    review:String,
    rating:Number,
    datetime:Date
});

var propertyComments = new mongoose.Schema({
    property_id:{type:String,unique:true},

    comments: [commentSchema]
});




propertyComments.statics.getCommentsOfProperty = function(propertyId,cb){

    this.findOne({
        'property_id':propertyId
    },null,{leans:true},function(err,comments){
        if(err){
            console.log("-------------- MongoDB error",err.stack);
            cb({
                code:500,
                message:'Internal Server Error'
            });
        }
        else{
            cb(null,comments);
        }
    });
};

propertyComments.statics.createCommentsOfProperty = function(propertyId,cb){


    this.create({
        property_id:propertyId,
        comments:[]
    },function(err,comments){
        if(err){
            console.log("-------------- MongoDB error",err.stack);
            cb({
                code:500,
                message:'Internal Server Error'
            });
        }
        else{
            cb(null,comments);
        }
    });

};









propertyComments.statics.insertComments = function(userId,propertyId,rating,review,datetime,cb){

    this.findOne({
        'property_id':propertyId
    },{},{leans:true},function(err,comments){
        if(err){
            console.log("-------------- MongoDB error",err.stack);
            cb({
                code:500,
                message:'Internal Server Error'
            });
        }
        else {

            if(comments==null){
                cb({
                    code:404,
                    message:'You have no comment history.'
                });
                return;
            }
            comments.comments.push({
                user_id :userId,
                review: review,
                datetime:datetime,
                rating:rating
            });

            comments.save(function(err,comments){
                if(err){
                    console.log("-------------- MongoDB error",err.stack);
                    cb({
                        code:500,
                        message:'Internal Server Error'
                    });
                }
                else{
                    cb(null,comments);
                }
            });
        }
    });
};



module.exports = mongoose.model('Comments',propertyComments);