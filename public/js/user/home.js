/**
 * Created by tabishrizvi on 13/03/16.
 */
angular.module('hh', [
    'ngCookies'
]);

angular.module('hh').controller('MainCtrl',function($scope,$cookies,$http){


    $scope.init = function(){


        if(_.isUndefined($cookies.get("accessToken"))){
            window.location.href="/";
        }
        else if($cookies.get('user_type')=='agent'){
            window.location.href="/agent/home";

        }

    };







    $scope.init();
});