'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  email: String,
  phone: String,
  name: String,
  profilePicture: String,
  currentParty: {
    type: Schema.Types.ObjectId,
    ref: 'Party'
  },
  passHashed: String,
  location: {
    lat: Number,
    lon: Number,
    time: Date
  }
}, { collection: 'users'});

var PartySchema = new Schema({
  roomCode: {
    type: String,
    unique: true
  },
  guardians: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{ // includes all the members, including the guardians (so there will be overlap, but this is more practical)
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  open: Boolean,
  headcount: {
    near: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    far: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    unresponsive: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  }
}, { collection: 'parties'});

var MessageSchema = new Schema({
  party: {
    type: Schema.Types.ObjectId,
    ref: 'Party'
  },
  index: {
    type: Number,
    unique: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  text: String
  // TODO: handle files in messages
})

var User = mongoose.model('User', UserSchema, 'users');
var Party = mongoose.model('Party', PartySchema, 'parties');
var Message = mongoose.model('Message', MessageSchema, 'messages');

module.exports = {
  User: User,
  Party: Party,
  Message: Message
};
