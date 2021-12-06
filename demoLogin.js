var app = angular.module('app', ['ui.router', 'ngCookies']);
app.config( ['$stateProvider', '$locationProvider', function( $stateProvider, $locationProvider){
    $locationProvider.hashPrefix('');
    $locationProvider.html5Mode(true);
    $stateProvider
    .state('home', {
        url : '/?code&state', // /t=<number>#callback?code
            // /callback?code=..&state=
        templateUrl : 'homeTemplate.html',
        controller : 'homeController'
    })
    .state('otherwiser', {
        url : '*path',
        template : '<strong>No Route available'
    });

}]);
// configure Auth0 Settings
app.value('domain', 'ranavishal2015.us.auth0.com');
app.value('client_id', 'ZhZYvFSkAVPbd8uHb6yeaeJpw6k3vfZe');
app.value('redirect_uri', 'http://localhost:5500');

// fatory method to make auth0Service, 
//this returns a promise which we can use to communicate with Auth0 
app.factory('auth0Service',['domain', 'client_id', function(domain, client_id){ 
    console.log("auth0Service constructor invoked.");
    var authPromise = createAuth0Client({
        domain: domain,
        client_id: client_id
    });
    return authPromise;
}]);

//homeController 
var homeController = function(
    $stateParams, 
    $state, 
    auth0Service, 
    $cookies, 
    domain,
    client_id,
    redirect_uri,
    $window,
    $scope){
    console.log("homeController constructor function.");
   // variables
    $scope.loadingHome = true; // initial loading home is true.
    $scope.errorInHome = false; // error while checking auth0.isAuthenticated.
    $scope.authenticated = false; // initially false. 
    $scope.hasCode = false; // if obtained from authorization server. 
    $scope.loadingAccessToken = false; // if hasCode is true, the client would request for accessToken from the code. 
    $scope.errorInLoadingAccessToken = false;
    $scope.code = undefined;
    $scope.state = undefined;
    $scope.accessToken = undefined;
    $scope.idToken = undefined;
    
    //functions
    $scope.loginWithPopup = loginWithPopup;
    $scope.loginWithCallback = loginWithCallback;
    $scope.logout = logout; 
    console.log($stateParams);
    console.log("code : ", $stateParams.code);
    if ( $stateParams.code){
        console.log("Code is present");
        $scope.code = $stateParams.code; 
        $scope.state = $stateParams.state; 
        $scope.hasCode = true;
        $scope.loadingHome = false; // home has been loaded.
        /*
         handleRedirectCallback is used to obtain access token using code and state
         */
       auth0Service.then(auth0 => { 
           auth0.handleRedirectCallback()
           .then(redirectResult => { 
               console.log("redirectResult : ", redirectResult);
               console.log(redirectResult);
               //Now the user is logged in, you can get the user profile
           })
           .catch(exp =>{
               console.log("Error using the code to login in user");
               $scope.errorInHome = exp;
               console.log(exp);
           })
           .finally( () => {
               $window.location.href ='http://localhost:5500'
           });
       } )
       .catch(exp => { 
           console.log("Excepiton while using auth0Serivce");
       })
    }
    else{
        //We are here, becuase server has not redirected us to this page
        console.log("code is not present in the url So, ");
        console.log("checking whether user is authenticated");
        // checking whether the user is authenticated or not. 
        auth0Service.then( auth0 =>{
            console.log("Calling isAuthenticated method.");
            // This method we obtain new access_token from the Authorization server silently. 
            auth0.isAuthenticated()
            .then( value => { 
                console.log("Is user Authenticated : " + value);
                $scope.authenticated = value;
                $scope.loadingHome = false;
                /* 
                    if value is ture, then get the access token from auth0Service and bind it
                    to the current scope 
                */
                //if ($scope.authenticated){
                //auth0.ZhZYvFSkAVPbd8uHb6yeaeJpw6k3vfZe.is.authenticated
                // You can also check whether the user is authenticated by reading value of a cookie named as given in the above line.
                var cookieName = 'auth0.' + client_id + '.is.authenticated';
                console.log("cookieName : ", cookieName);
                console.log("cookie value : ",  $cookies.get(cookieName))
                if ( $cookies.get(cookieName) == 'true' ){
                    // Get Token Silently
                    auth0.getTokenSilently()
                    .then( token =>{
                        console.log("access token : ", token);
                        $scope.accessToken = token;
                        $scope.$digest();
                    })
                    .catch( exp =>{ 
                        console.log("Exception thrown while retriving token : ", exp);
                    });
                    
                    //Getting Id Token Claims
                    auth0.getIdTokenClaims()
                    .then( claims =>{ 
                        console.log("claims : ", claims);
                        $scope.idToken = claims;
                        $scope.$digest();
                    })
                    .catch( exp => {
                        console.log("Exception thrown while obtaining id token : ", exp);
                    });

                    // Getting user info
                    auth0.getUser()
                    .then( user =>{
                        console.log("user : ", user);
                        $scope.user = user;
                        $scope.$digest();
                    })
                    .catch(exp => { 
                        console.log("Exception thrown while obtaining exception : " , exp);
                    });
                }
                $scope.$digest(); // refresh the ui.
                console.log("auth0 : ", auth0);
            })
            .catch( exp => { 
                console.log("Error while checking whether the user is authenticatd.");
                $scope.errorInHome = true; 
                $scope.$digest();
            });
        })
        .catch( exp => { 
            console.log("Error while working with auth0Service");
            errorInHome = true; 
            $scope.$digest();
        });

    }

    //Handler, when the user clicks on loginWithCallback button.
    function loginWithCallback(){
        console.log("User clicked on the 'Login With Callback' button.");
        auth0Service.then(auth0 => { 
            console.log("In then method of auth0Service promise", auth0);
            const options = {
                redirect_uri : redirect_uri
            }
            console.log("Redirecting user to authorization server.");
            auth0.loginWithRedirect(options);
        })
        .catch(exp => { 
            console.log("Exception thrown : " , exp);
        })
    }

    // Handler, when the user clicks on loginWithPopup button
    function loginWithPopup(){
        console.log("User clicked on 'Login With Popup' Button.");
        auth0Service.then( auth0 =>{
            const options = { 
                redirect_uri : redirect_uri
            }
            auth0.loginWithPopup(options)
            .then( result =>{
                console.log("loginWithpopup succeeded");
            })
            .catch( exp =>{
                console.log("Exception thrown : ", exp);
            });

        })
        .catch(exp => { 
            console.log("Something went wrong");
        });
        

    }

    // Handle logout 
    function logout(){
        console.log("User clicked on logout button.");
        if ( $scope.authenticated){
            console.log("Logging out...");
            auth0Service.then( auth0 =>{
                const options = { 
                    returnTo : 'http://localhost:5500'
                }
                auth0.logout(options)
                .then( result => { 
                    console.log("logging out result :  " , result);
                    }
                )
                .catch( exp => { 
                    console.log("Exception thrown : ", exp);
                });
            })
            .catch( exp => { 
                console.log( "Error while using Auth0Service");
            })
        }
        else{
            console.log("No user currently logged in.");
        }
    }
}
app.controller('homeController', ['$stateParams', 
'$state', 
'auth0Service',
'$cookies', 
'domain',
'client_id',
'redirect_uri',
'$window',
'$scope', homeController]);
