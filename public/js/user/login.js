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
            phone:'',
            password:'',
            loginType:'1'
        };


        $scope.error = false;
        $scope.success = false;
        $scope.msg = '';

    };



    $scope.submitForm = function(form){

        if($scope.model.loginType=="1" && ( form.email.$invalid || form.password.$invalid)){
            return false;
        }

        if($scope.model.loginType=="2" && ( form.phone.$invalid || form.password.$invalid)){
            return false;
        }



        var params;

        if($scope.model.loginType=="1"){
            params = _.pick($scope.model,["email","password"]);
        }
        else{
            params = _.pick($scope.model,["phone","password"]);

        }

        $http({
            method:'PUT',
            url:"/api/user/login",
            headers: {'Content-Type': "application/json"},
            data: params
        }).then(
            function(response){
                $cookies.put("accessToken",response.data.data.access_token);
                $cookies.put("email",response.data.data.email);
                $cookies.put("user_type",response.data.data.user_type);

                window.location.href="/user/home";
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