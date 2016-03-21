/**
 * Created by tabishrizvi on 13/03/16.
 */
angular.module('hh', [
    'ngCookies'
]);

angular.module('hh').controller('MainCtrl',function($scope,$cookies,$http){


    $scope.init = function(){

        if(!_.isUndefined($cookies.get("accessToken"))){
            if($cookies.get('user_type')=='user'){
                window.location.href="/user/home";

            }
            else if($cookies.get('user_type')=='agent'){
                window.location.href="/agent/home";

            }
        }
        $scope.model = {
            email:'',
            name:'',
            phone:'',
            password:''
        };


        $scope.error = false;
        $scope.success = false;
        $scope.msg = '';

    };



    $scope.submitForm = function(form){


        if(form.$invalid){
            return false;
        }


        var fd = new FormData();

        for(var key in $scope.model){
            if($scope.model.hasOwnProperty(key)){
                fd.append(key,$scope.model[key]);
            }
        }

        $http({
            method:'POST',
            url:"/api/user/register",
            headers: {'Content-Type': undefined},
            transformRequest: angular.identity,
            data: fd
        }).then(
            function(response){
                window.location.href = "/user/login";

            },
            function(response){

                form.$setPristine();

                $scope.msg =response.data.message;
                $scope.error = true;

            }
        );



    };


    $scope.resetErrors = function(form){

        $scope.error = false;
        $scope.success = false;
        $scope.msg ='';

        form.$setPristine();
    };


    $scope.resetForm = function(form){

        $scope.init();

        $scope.resetErrors(form);
    };











    $scope.init();
});