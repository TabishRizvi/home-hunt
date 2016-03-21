/**
 * Created by tabishrizvi on 09/03/16.
 */


var mongoose = require('mongoose');


var messageSchema = new mongoose.Schema({
    message:String,
    by:String,
    datetime:Date,
    is_read:Boolean
});

var chatSchema = new mongoose.Schema({
    user_id:{type:String,required:true},
    property_id:{type:String,required:true},
    property_title:String,
    messages: [messageSchema]
});


chatSchema.index({"user_id":1,"property_id":1},{unique:true});

chatSchema.statics.getChatsOfProperty = function(userId,propertyId,cb){

    console.log("sad");
    this.findOne({
        'user_id':userId,
        'property_id':propertyId
    },null,{leans:true},function(err,chat){
        if(err){
            console.log("-------------- MongoDB error",err.stack);
            cb({
                code:500,
                message:'Internal Server Error'
            });
        }
        else{
            cb(null,chat);
        }
    });
};


chatSchema.statics.getAllChatsForUser = function(userId,cb){

    this.find({
        'user_id':userId
    },null,{leans:true},function(err,chats){
        if(err){
            console.log("-------------- MongoDB error",err.stack);
            cb({
                code:500,
                message:'Internal Server Error'
            });
        }
        else{
            cb(null,chats);
        }
    });
};


chatSchema.statics.getAllChatsForAgents = function(propertyIds,cb){

    this.find({
        'property_id': {$in :propertyIds}
    },null,{leans:true},function(err,chats){
        if(err){
            console.log("-------------- MongoDB error",err.stack);
            cb({
                code:500,
                message:'Internal Server Error'
            });
        }
        else{
            cb(null,chats);
        }
    });
};





chatSchema.statics.createChat = function(userId,propertyId,propertyTitle,cb){

    this.create({
        user_id:userId,
        property_id:propertyId,
        property_title:propertyTitle,
        messages:[]
    },function(err,chat){
        if(err){
            console.log("-------------- MongoDB error",err.stack);
            cb({
                code:500,
                message:'Internal Server Error'
            });
        }
        else{
            cb(null,chat);
        }
    });
};



chatSchema.statics.insertMessage = function(userId,propertyId,userType,message,datetime,cb){

    this.findOne({
        'user_id':userId,
        'property_id':propertyId
    },{},{leans:true},function(err,chat){
        if(err){
            console.log("-------------- MongoDB error",err.stack);
            cb({
                code:500,
                message:'Internal Server Error'
            });
        }
        else {

            if(chat==null){
                cb({
                    code:404,
                    message:'You have no chat history.'
                });
                return;
            }
            chat.messages.push({
                message :message,
                by: userType,
                datetime:datetime,
                is_read:false
            });

            chat.save(function(err,chat){
                if(err){
                    console.log("-------------- MongoDB error",err.stack);
                    cb({
                        code:500,
                        message:'Internal Server Error'
                    });
                }
                else{
                    cb(null,chat);
                }
            });
        }
    });
};

chatSchema.statics.readAllMessagesOfProperty = function(userId,propertyId,cb){

    this.findOne({
        'user_id':userId,
        'property_id':propertyId
    },null,{leans:true},function(err,chat){
        if(err){
            console.log("-------------- MongoDB error",err.stack);
            cb({
                code:500,
                message:'Internal Server Error'
            });
        }
        else{
            if(chat==null){
                cb({
                    code:404,
                    message:'You have no chat history.'
                });
                return;
            }

            chat.messages.forEach(function(elem){
                elem.is_read = true;
            });

            chat.save(function(err,chat){
                if(err){
                    console.log("-------------- MongoDB error",err.stack);
                    cb({
                        code:500,
                        message:'Internal Server Error'
                    });
                }
                else{
                    cb(null,chat);
                }
            });
        }
    });
};


module.exports = mongoose.model('Chats',chatSchema);