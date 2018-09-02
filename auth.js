'use strict';

const bcrypt = require('bcryptjs');
const saltRounds = 12;

exports.hash = (password, callback) => {
  bcrypt.hash(password, saltRounds, (err, hash) => {
    callback(hash);
  });
}

exports.check = (inputPassword, storedPassword, callback) => {
  bcrypt.compare(inputPassword, storedPassword, (err, res) => {
    callback(res);
  });
}
