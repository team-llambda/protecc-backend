let io;
const schemas = require('./schemas');

const User = schemas.User;
const Party = schemas.Party;

module.exports = {
  init: (server, sessionMiddleware, app) => {
    io = require('socket.io')(server)

    io.use(function (socket, next) {
      var req = socket.handshake;
      var res = {};
      sessionMiddleware(req, res, async function (err) {
        if (err) {
          console.error(err)
          let error = new Error('Internal Error');
          error.data = {
            type: 'internal_error'
          };
          return next(error);
        }

        var id = req.session._id;

        if (!id || !req.session.authenticated) {
          let error = new Error('Authentication error');
          error.data = {
            type: 'authentication_error'
          };
          return next(error);
        }

        try {
          const user = await User.findOne({
            _id: id
          }).exec();

          if (user && user.currentParty) {
            console.log('user ' + user.name + ' joined to group ' + user.currentParty.toString());
            socket.join(user.currentParty.toString());
            return next();
          }
        } catch (catcherr) {
          console.error(catcherr)
          let error = new Error('Internal error');
          error.data = {
            type: 'internal_error'
          };
          return next(error);
        }
      });
    });

    io.on('connection', function (socket) {
      console.log('socket connected!')
    });
  },
  pushLocationUpdate: (partyId, memberId, location) => {
    io.to(partyId.toString()).emit('locationUpdate', { id: memberId, location: location });
  },
  notifyHeadcount: (partyId, data) => {
    // data is the initial 'headcount' object calculated by the server
    // clients must call a route to check if they need to respond to the headcount or not (to decide if they need to show the dialog)
    io.to(partyId.toString()).emit('notifyHeadcount', data);
  },
  notifyHeadcountResponse: (partyId, memberId) => {
    io.to(partyId.toString()).emit('notifyHeadcountResponse', { id: memberId });
  },
  notifyHeadcountEnd: (partyId, data) => {
    // data is the final 'headcount' object recorded by the server
    io.to(partyId.toString()).emit('notifyHeadcountEnd', data);
  },
  sendMessage: (partyId, user, text) => {
    io.to(partyId.toString()).emit('sendMessage', { sender: user, text: text });
  },
  newUserAdded: (partyId, user) => {
    io.to(partyId.toString()).emit('newUserAdded', { member: user });
  }
}