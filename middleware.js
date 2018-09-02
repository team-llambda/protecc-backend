'use strict';

const schemas = require('./schemas');

const User = schemas.User;
const Party = schemas.Party;
const auth = require('./auth');

const VI = (...parameters) => {
  for (var i = 0; i < parameters.length; i++) {
    if (!parameters[i]) return false;
  }
  return true;
}

exports.verifySession = async (req, res, next) => {
  if (!req.session) return res.status(401).end();

  if (!req.session._id || req.session._id == '') return res.status(401).end();

  if (!req.session.authenticated) return res.status(401).end();

  try {
    const user = await User.findOne({_id: req.session._id}).exec();

    if (!user) {
      return res.status(401).end();
    }

    res.locals.user = user;

    next();
  } catch (error) {
    console.log('IS IN VERIFY SESSION');
    console.log(err);
    res.status(500).end();
  }
}

exports.verifyUserNotInParty = async (req, res, next) => {
  var user = res.locals.user;

  if (user.currentParty) return res.status(409).end();

  next();
}

exports.verifyUserInParty = async (req, res, next) => {
  var user = res.locals.user;

  if (!user.currentParty) {console.log("AHHHHH!"); return res.status(404).end()};

  try {
    const currentParty = await Party.findOne({_id: user.currentParty}).populate('members').populate('guardians').exec();

    if (!currentParty) {console.log("OEIFJSEOIFJOSEJFE"); return res.status(404).end()};

    res.locals.party = currentParty;

    next();
  } catch (error) {
    console.log('IS IN VERIFY USER IN PARTY');
    console.log(error);
    res.status(500).end();
  }
}

exports.verifyUserGuardian = async (req, res, next) => {
  var party = res.locals.party;
  var user = res.locals.user;

  for (var i = 0; i < party.guardians.length; i++) {
    if (party.guardians[i]._id.toString() === user._id.toString()) {
      return next();
    }
  }
  res.status(403).end();
}

exports.emaillessAuthenticate = async (req, res, next) => {
  var password = req.body.password;
  var user = res.locals.user;

  if (!password) return res.status(400).end();

  auth.check(password, user.passHashed, (valid) => {
    if (valid) {
      next();
    } else res.status(401).end();
  });
}

//signs in user using email and password, saves to res.locals.user
exports.authenticate = async (req, res, next) => {
  var email = req.body.email;
  var password = req.body.password;

  if (!VI(email, password)) return res.status(400).end();

  try {
    let user = await User.findOne({
      email: email
    });

    if (!user) return res.status(404).end();

    auth.check(password, user.passHashed, (valid) => {
      if (valid) {
        res.locals.user = user;
        req.session._id = user._id;
        req.session.authenticated = true;
        next();
      } else res.status(401).end();
    });
  } catch (err) {
    console.log(err);
    res.status(500).end();
  }
}
