'use strict';

// dependencies
const schemas = require('./schemas');
const User = schemas.User;
const Party = schemas.Party;
const Message = schemas.Message;
const auth = require('./auth');
const spaces = require('./spaces');
const hat = require('hat');
const sockets = require('./sockets');
const base64Img = require('base64-img');
const lambda = require('./lambda');

const VI = (...parameters) => {
  for (var i = 0; i < parameters.length; i++) {
    if (!parameters[i]) return false;
  }
  return true;
}

exports.login = async (_, res) => {

  var user = res.locals.user;

  if (user.currentParty) res.status(201).end();
  else res.status(200).end();
}

exports.reauthenticate = async (_, res) => {
  var user = res.locals.user;

  if (!user.currentParty) return res.status(200).end();

  try {
    const currentParty = await Party.findOne({
      _id: user.currentParty
    }).exec();

    if (!currentParty) return res.status(200).end();

    res.status(201).end();
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}

exports.createUser = async (req, res) => {
  var email = req.body.email,
    phone = req.body.phone,
    name = req.body.name,
    password = req.body.password,
    profilePicture = req.body.profilePicture;

  console.log(email);
  console.log(phone);
  console.log(name);
  console.log(password);
  console.log(profilePicture);

  if (!VI(email, phone, name, password, profilePicture) || password === '') res.status(400).end();

  try {
    // check if email or phone already exist
    const existingUsers = await User.find({}).select('email phone').exec();

    for (var i = 0; i < existingUsers.length; i++) {
      if (existingUsers[i].email == email || existingUsers[i].phone == phone) return res.status(409).end();
    }

    var profilePictureURL = '';
    if (profilePicture !== '') {
      var filepath = base64Img.imgSync(profilePicture, '', 'profilepicture');
      console.log(filepath);
      profilePictureURL = await spaces.uploadFile(filepath, 'profilepicture');
    } else {

    }

    // obtain password hashed
    auth.hash(password, async (hash) => {
      // create the new user object
      const newUser = new User({
        name: name,
        phone: phone,
        email: email,
        passHashed: hash,
        profilePicture: profilePictureURL
      });

      var userObject = await newUser.save();

      // store this session
      req.session._id = userObject._id;
      req.session.authenticated = true;

      res.status(200).end();
    })
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}

exports.logout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) res.status(500).end();
    else res.status(200).end();
  });
}

const roomCodeExists = (roomCode, existingParties) => {
  for (var i = 0; i < existingParties.length; i++) {
    if (existingParties[i].roomCode === roomCode) return true;
  }
  return false;
}

exports.createParty = async (req, res) => {
  var user = res.locals.user;

  try {
    const existingParties = await Party.find({}).select('roomCode').exec();

    var roomCode = hat(24);

    while (roomCodeExists(roomCode, existingParties)) {
      roomCode = hat(24);
    }

    var newParty = new Party({
      roomCode: roomCode,
      guardians: [user._id],
      members: [user._id],
      open: true,
      headcount: {
        near: [],
        far: [],
        unresponsive: []
      }
    });

    const partyObject = await newParty.save();

    await User.updateOne({
      _id: user._id
    }, {
      currentParty: partyObject._id
    }).exec();

    res.status(200).json({
      roomCode: roomCode
    });
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}

exports.joinParty = async (req, res) => {
  var user = res.locals.user;
  var roomCode = req.body.roomCode;

  if (!roomCode) return res.status(400).end();

  try {
    const party = await Party.findOne({
      roomCode: roomCode
    }).exec();

    if (!party) return res.status(404).end();

    if (!party.open) return res.status(403).end();

    // add user to party
    await Party.updateOne({
      _id: party._id
    }, {
      $push: {
        members: user._id
      }
    }).exec();

    // add party to user
    await User.updateOne({
      _id: user._id
    }, {
      $set: {
        currentParty: party._id
      }
    }).exec();

    sockets.newUserAdded(party._id, user);

    res.status(200).end();
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}

exports.leaveParty = async (req, res) => {
  var user = res.locals.user;

  try {
    const party = res.locals.party;

    if (party.members.length > 1) {
      // check if the user is the last guardian
      if (party.guardians.length < 2 && party.guardians[0]._id.toString() == user._id.toString()) { // user is the last guardian
        // find the next member in line for guardian status
        var promoteMemberId;
        for (var i = 0; i < party.members.length; i++) {
          if (party.members[i]._id.toString() !== user._id.toString()) { // promote this member to guardian
            promoteMemberId = party.members[i];
            break;
          }
        }

        // promote this member to guardian
        await Party.updateOne({
          _id: party._id
        }, {
          $push: {
            guardians: promoteMemberId
          }
        }).exec();
      }

      // remove user from party
      await Party.updateOne({
        _id: party._id
      }, {
        $pull: {
          members: user._id,
          guardians: user._id
        }
      });
    } else { // last person in party, destroy
      await Party.deleteOne({
        _id: party._id
      }).exec();
    }

    // set user's currentparty to null
    await User.updateOne({
      _id: user._id
    }, {
      $set: {
        currentParty: null
      }
    }).exec();

    res.status(200).end();
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}

exports.destroyParty = async (req, res) => {
  var party = res.locals.party;

  try {
    // kick all the people out
    party.members.forEach(async (member) => {
      await User.updateOne({
        _id: member._id
      }, {
        $set: {
          currentParty: null
        }
      }).exec();
    });

    await Party.deleteOne({
      _id: party._id
    }).exec();

    res.status(200).end();
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}

exports.openParty = async (req, res) => {
  var party = res.locals.party;

  try {
    await Party.updateOne({
      _id: party._id
    }, {
      open: true
    }).exec();

    res.status(200).end();
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}

exports.closeParty = async (req, res) => {
  var party = res.locals.party;

  try {
    await Party.updateOne({
      _id: party._id
    }, {
      open: false
    }).exec();

    res.status(200).end();
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}

exports.fetchParty = async (req, res) => {
  res.status(200).json(res.locals.party);
}

exports.promoteMember = async (req, res) => {
  var id = req.body.id;
  var party = res.locals.party;

  if (!id) res.status(400).end();

  // check if id is already a guardian
  for (var i = 0; i < party.guardians.length; i++) {
    if (party.guardians[i]._id.toString() === id) return res.status(200).end();
  }

  for (i = 0; i < party.members.length; i++) {
    if (party.members[i]._id.toString() === id) {
      // match, add to guardians
      await Party.updateOne({
        _id: party._id
      }, {
        $push: {
          guardians: id
        }
      }).exec();
      return res.status(200).end();
    }
  }

  return res.status(404).end();
}

exports.demoteMember = async (req, res) => {
  var id = req.body.id;
  var party = res.locals.party;

  if (!id || id === res.locals.user._id.toString()) return res.status(400).end();

  await Party.updateOne({
    _id: party._id
  }, {
    $pull: {
      guardians: id
    }
  }).exec();

  res.status(200).end();
}

exports.kickMember = async (req, res) => {
  var id = req.body.id;
  var party = res.locals.party;

  if (!id || id === res.locals.user._id.toString()) return res.status(400).end();

  await Party.updateOne({
    _id: party._id
  }, {
    $pull: {
      guardians: id,
      members: id
    }
  }).exec();

  await User.updateOne({
    _id: id
  }, {
    $set: {
      currentParty: null
    }
  }).exec();

  return res.status(200).end();
}

exports.changePassword = async (req, res) => {
  var user = res.locals.user;
  var newPassword = req.body.newPassword;

  if (!newPassword) return res.status(400).end();

  auth.hash(newPassword, async (hash) => {
    try {
      await User.updateOne({
        _id: user._id
      }, {
        $set: {
          passHashed: hash
        }
      }).exec();

      res.status(200).end();
    } catch (error) {
      console.log(error);
      res.status(500).end();
    }
  });
}

exports.updateProfile = async (req, res) => {
  var user = res.locals.user;
  var type = req.body.type;
  var payload = req.body.payload;

  if (!VI(type, payload)) return res.status(400).end();

  if (type !== 'picture' && type !== 'name' && type !== 'email' && type !== 'phone') return res.status(400).end();

  try {
    if (type === 'picture') {
      var profilePicture = payload;

      var filepath = base64Img.imgSync(profilePicture, '', 'profilepicture');
      await spaces.overwriteFile(filepath, 'profilepicture', user.profilePicture);

      res.status(200).end();
    } else {
      var updateObject = {};
      updateObject[type] = payload;

      await User.updateOne({
        _id: user._id
      }, {
        $set: updateObject
      }).exec();
    }

    res.status(200).end();
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}

exports.updateLocation = async (req, res) => {
  var lat = req.body.lat;
  var lon = req.body.lon;
  var user = res.locals.user;

  if (!VI(lat, lon) || isNaN(lat) || isNaN(lon)) return res.status(400).end();
  if (lat > 90 || lat < -90 || lon > 180 || lon < -180) return res.status(400).end();

  try {
    var locationTime = new Date();
    var newLocation = {
      lat: lat,
      lon: lon,
      time: locationTime
    }
    await User.updateOne({
      _id: user._id
    }, {
      $set: {
        location: newLocation
      }
    }).exec();

    if (user.currentParty) {
      sockets.pushLocationUpdate(user.currentParty, user._id, {
        lat: lat,
        lon: lon,
        time: locationTime
      });
    }

    res.status(200).end();
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}

exports.startHeadcount = async (req, res) => {
  var party = res.locals.party;
  var user = res.locals.user;

  try {
    // check if headcount is already underway
    if (party.headcount.near.length > 0 ||
        party.headcount.far.length > 0 ||
        party.headcount.unresponsive.length > 0) return res.status(409).end();

    var dataset = [];
    var userIndex = -1;
    party.members.forEach((member, index) => {
      if (member._id.toString() === user._id.toString()) userIndex = index;
      dataset.push([member.location.lon, member.location.lat]);
    });

    console.log(dataset);
    var data = await lambda.densityClustering(dataset);
    console.log(data);
    data = await data.json();
    console.log(data);
    var clusters = data.clusters;
    var noise = data.noise;

    noise.forEach((n) => {
      clusters.push([n]);
    })

    var near = [];
    var unresponsive = [];

    for (var i = 0; i < clusters.length; i++) {
      if (clusters[i].includes(userIndex)) { // this is the cluster that is near the headcount
        clusters[i].forEach((memberIndex) => {
          near.push(party.members[memberIndex]._id.toString());
        });
      } else {
        clusters[i].forEach((memberIndex) => {
          unresponsive.push(party.members[memberIndex]._id.toString());
        });
      }
    }

    var headcountObject = {
      near: near,
      far: [],
      unresponsive: unresponsive
    };

    await Party.updateOne({
      _id: party._id
    }, {
      $set: {
        headcount: headcountObject
      }
    }).exec();

    sockets.notifyHeadcount(party._id.toString(), headcountObject.near);
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}

// exports.checkHeadcountResponseNecessary = async (req, res) => {
//   var party = res.locals.party;
//   var user = res.locals.user;

//   if (!party.headcount) return res.status(404).end();

//   for (var i = 0; i < party.headcount.unresponsive.length; i++) {
//     if (party.headcount.unresponsive[i].toString() === user._id.toString()) {
//       return res.status(201).end();
//     }
//   }

//   res.status(200).end();
// }

exports.respondHeadcount = async (req, res) => {
  var user = res.locals.user;
  var party = res.locals.party;

  if (!party.headcount) return res.status(404).end();

  // check if user is in near; break if so
  if (party.headcount.near.includes(user._id)) res.status(409).end();

  // add user's id to far if not already there
  if (!party.headcount.far.includes(user._id))
    await Party.updateOne({
      _id: party._id
    }, {
      $push: {
        'headcount.far': user._id
      }
    }).exec();

  // remove user's id from unresponsive if still there
  await Party.updateOne({
    _id: party._id
  }, {
    $pull: {
      'headcount.unresponsive': user._id
    }
  }).exec();

  sockets.notifyHeadcountResponse(party._id, user._id);

  res.status(200).end();
}

exports.stopHeadcount = async (req, res) => {
  var party = res.locals.party;

  if (!party.headcount) return res.status(404).end();

  sockets.notifyHeadcountEnd(party._id, party.headcount);

  await Party.updateOne({
    _id: party._id
  }, {
    $set: {
      headcount: {
        near: [],
        far: [],
        unresponsive: []
      }
    }
  }).exec();

  res.status(200).json(party.headcount);
}

exports.sendMessage = async (req, res) => {
  var user = res.locals.user;
  var party = res.locals.party;
  var text = req.body.text;

  try {
    sockets.sendMessage(party._id, user, text);

    let existingMessages = await Message.find({
      party: party._id
    }).sort('index', -1).exec();

    // TODO:
    var newMessage = new Message({
      index: existingMessages.length,
      party: party._id,
      sender: user._id,
      text: text
    });

    await newMessage.save();

    res.status(200).end();
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}

exports.getRecentMessages = async (req, res) => {
  var party = res.locals.party;
  var lastIndex = req.body.last;

  try {
    if (!lastIndex) { // literally get the last 20
      const messages = await Message.find({party: party._id}).sort(-1).limit(20).exec();
  
      res.status(200).json(messages);
    } else {
      const messages = await Message.find({party: party._id, index: { $lt: lastIndex }}).sort(-1).limit(20).exec();
  
      res.status(200).json(messages);
    }
  } catch (error) {
    console.log(error);
    res.status(500).end();
  }
}

exports.fetchUser = async (req, res) => {
  res.status(200).json(res.locals.user);
}
