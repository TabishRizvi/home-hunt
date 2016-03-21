/**
 * Created by tabishrizvi on 27/02/16.
 */


module.exports = {


    test:{
        port:5001,
        db:{
            mysql:{
                host:'localhost',
                port:3306,
                user:'user',
                password:'************',
                database:'home-hunt',
                dateStrings:true
            },
            mongodb:{
                uri:"mongodb://user:***********@localhost:27017/home-hunt"

            }

        },
        aws:{
            accessKey:'************',
            secretKey:'**********************',
            bucket:'home-hunt'
        },
        HMACKey:'****************',
        secret:'************'

    },

    live:{
        port:4001,
        db:{
            mysql:{
                host:'localhost',
                port:3306,
                user:'user',
                password:'************',
                database:'home-hunt',
                dateStrings:true
            },
            mongodb:{
                uri:"mongodb://user:***********@localhost:27017/home-hunt"

            }

        },
        aws:{
            accessKey:'************',
            secretKey:'**********************',
            bucket:'home-hunt'
        },
        HMACKey:'****************',
        secret:'************'

    }
};

