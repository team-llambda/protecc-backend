'use strict';
const routeControllers = require('./controllers');
const routeMiddleware = require('./middleware');

module.exports = (app) => {

  // ping route
  app.get("/api/ping/", function (req, res) {
    res.status(200).json("pong");
  });

  // authentication related routes
  app.route('/api/login/').post(routeMiddleware.authenticate).post(routeControllers.login);
  app.route('/api/user/reauthenticate/').get(routeMiddleware.verifySession).get(routeControllers.reauthenticate);
  app.route('/api/logout/').post(routeMiddleware.verifySession).post(routeControllers.logout);

  // user routes
  app.route('/api/user/create/').post(routeControllers.createUser);
  app.route('/api/user/').get(routeMiddleware.verifySession).get(routeControllers.fetchUser);
  app.route('/api/update/password/').post(routeMiddleware.verifySession).post(routeMiddleware.emaillessAuthenticate).post(routeControllers.changePassword);
  app.route('/api/update/profile/').post(routeMiddleware.verifySession).post(routeControllers.updateProfile);
  app.route('/api/update/location/').post(routeMiddleware.verifySession).post(routeControllers.updateLocation);

  // party routes
  app.route('/api/party/create/').post(routeMiddleware.verifySession).post(routeMiddleware.verifyUserNotInParty).post(routeControllers.createParty);
  app.route('/api/party/join/').post(routeMiddleware.verifySession).post(routeMiddleware.verifyUserNotInParty).post(routeControllers.joinParty);
  app.route('/api/party/leave/').post(routeMiddleware.verifySession).post(routeMiddleware.verifyUserInParty).post(routeControllers.leaveParty);
  app.route('/api/party/destroy/').post(routeMiddleware.verifySession).post(routeMiddleware.verifyUserInParty).post(routeMiddleware.verifyUserGuardian).post(routeControllers.destroyParty);
  app.route('/api/party/open/').post(routeMiddleware.verifySession).post(routeMiddleware.verifyUserInParty).post(routeMiddleware.verifyUserGuardian).post(routeControllers.openParty);
  app.route('/api/party/close/').post(routeMiddleware.verifySession).post(routeMiddleware.verifyUserInParty).post(routeMiddleware.verifyUserGuardian).post(routeControllers.closeParty);
  app.route('/api/party/').get(routeMiddleware.verifySession).get(routeMiddleware.verifyUserInParty).get(routeControllers.fetchParty);
  app.route('/api/party/promote/').post(routeMiddleware.verifySession).post(routeMiddleware.verifyUserInParty).post(routeMiddleware.verifyUserGuardian).post(routeControllers.promoteMember);
  app.route('/api/party/demote/').post(routeMiddleware.verifySession).post(routeMiddleware.verifyUserInParty).post(routeMiddleware.verifyUserGuardian).post(routeControllers.demoteMember);
  app.route('/api/party/kick/').post(routeMiddleware.verifySession).post(routeMiddleware.verifyUserInParty).post(routeMiddleware.verifyUserGuardian).post(routeControllers.kickMember);

  app.route('/api/party/headcount/').post(routeMiddleware.verifySession).post(routeMiddleware.verifyUserInParty).post(routeMiddleware.verifyUserGuardian).post(routeControllers.startHeadcount);
  // app.route('/api/party/headcount/checkNecessary/').get(routeMiddleware.verifySession).get(routeMiddleware.verifyUserInParty).get(routeControllers.checkHeadcountResponseNecessary);
  app.route('/api/party/headcount/respond/').post(routeMiddleware.verifySession).post(routeMiddleware.verifyUserInParty).post(routeControllers.respondHeadcount);
  app.route('/api/party/headcount/stop/').post(routeMiddleware.verifySession).post(routeMiddleware.verifyUserInParty).post(routeMiddleware.verifyUserGuardian).post(routeControllers.stopHeadcount);

  app.route('/api/messages/send/').post(routeMiddleware.verifySession).post(routeMiddleware.verifyUserInParty).post(routeControllers.sendMessage);
}