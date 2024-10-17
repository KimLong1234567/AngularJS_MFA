var app = angular.module('authApp', ['ngRoute']);

app.config([
  '$routeProvider',
  function ($routeProvider) {
    $routeProvider
      .when('/login', {
        templateUrl: 'login.html',
        controller: 'LoginController',
      })
      .when('/mfa', {
        templateUrl: 'mfa.html',
        controller: 'MFAController',
      })
      .when('/dashboard', {
        templateUrl: 'dashboard.html',
        controller: 'DashboardController',
        resolve: {
          auth: function (AuthService, $location) {
            if (!AuthService.isAuthenticated()) {
              $location.path('/login');
            }
          },
        },
      })
      .otherwise({
        redirectTo: '/login',
      });
  },
]);

app.factory('AuthService', [
  '$http',
  '$window',
  function ($http, $window) {
    var auth = {};

    auth.setTokens = function (longToken, shortToken) {
      $window.localStorage.setItem('longToken', longToken);
      $window.sessionStorage.setItem('shortToken', shortToken);

      setTimeout(function () {
        $window.sessionStorage.removeItem('shortToken');
      }, 5 * 60 * 1000);
    };

    auth.getLongToken = function () {
      return $window.localStorage.getItem('longToken');
    };

    auth.getShortToken = function () {
      return $window.sessionStorage.getItem('shortToken');
    };

    auth.clearTokens = function () {
      $window.localStorage.removeItem('longToken');
      $window.sessionStorage.removeItem('shortToken');
    };

    // Kiểm tra người dùng đã đăng nhập chưa
    auth.isAuthenticated = function () {
      return !!auth.getShortToken();
    };

    return auth;
  },
]);

app.controller('LoginController', [
  '$scope',
  '$http',
  '$location',
  'AuthService',
  function ($scope, $http, $location, AuthService) {
    $scope.loginData = {
      user_email: '',
      user_password: '',
    };
    $scope.errorMessage = '';

    $scope.login = function () {
      console.log($scope.loginData);
      $http
        .post('http://localhost:5000/api/users/login', $scope.loginData)
        .then(function (response) {
          console.log(response.data);
          if (response.data.requiresMFA) {
            localStorage.setItem('user_id', response.data.userId);

            $location.path('/mfa');
          }
        })
        .catch(function (error) {
          $scope.errorMessage = error.data.message || 'Đăng nhập thất bại.';
        });
    };
  },
]);

app.controller('MFAController', [
  '$scope',
  '$http',
  '$location',
  'AuthService',
  function ($scope, $http, $location, AuthService) {
    $scope.mfaData = {
      mfa_code: '',
      user_id: localStorage.getItem('user_id'),
    };
    $scope.errorMessage = '';

    $scope.verifyMFA = function () {
      var payload = {
        user_id: localStorage.getItem('user_id'),
        mfa_code: $scope.mfaData.mfa_code,
      };

      $http
        .post('http://localhost:5000/api/users/mfa/verify', payload)
        .then(function (response) {
          AuthService.setTokens(
            response.data.longToken,
            response.data.shortToken
          );
          $location.path('/dashboard');
        })
        .catch(function (error) {
          $scope.errorMessage = error.data.message || 'Xác thực MFA thất bại.';
        });
    };
  },
]);

app.controller('DashboardController', [
  '$scope',
  '$location',
  'AuthService',
  function ($scope, $location, AuthService) {
    $scope.logout = function () {
      AuthService.clearTokens();
      $location.path('/login');
    };
  },
]);
