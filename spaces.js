'use strict';

const keyID = process.env.SPACES_KEY;
const secret = process.env.SPACES_SECRET;
const aws = require('aws-sdk');
const hat = require('hat');
const fs = require('fs');

aws.config.update({
  accessKeyId: keyID,
  secretAccessKey: secret
});

var s3 = new aws.S3({
  "region" : "nyc3",
  "endpoint": "https://nyc3.digitaloceanspaces.com"
});

exports.uploadFile = async function (path, name) {
  try{
      var fileContent = fs.readFileSync(path);
      var sections = path.split('.');
      var ext = sections[sections.length - 1];
      name = name += '.' + ext;
      var url = await sendToSpace(name, fileContent, ext);
      return url;
  } catch (error) {
      console.log(error);
  }
}

async function sendToSpace(name, content, ext, callback){
  var key = hat();
  
  var keyName = "protecc" + "/" + key + '.' + ext;
  var keyUrl = ("https://dsys32.nyc3.digitaloceanspaces.com/" + keyName).replace(/ /g, '%20'); // Make url web-friendly

  // We don't really have to await for the file upload
  s3.putObject({
      Body : content,
      Bucket: "dsys32",
      Key: keyName,
      ACL: 'public-read',
      ContentDisposition: 'attachment; filename=' + name
  }, (error, data) => {
      console.log(error);
      console.log(data);
  });
  
  return keyUrl;
}

exports.overwriteFile = async function (path, name, url) {
  try{
      var fileContent = fs.readFileSync(path);
      await overwriteToSpace(name, fileContent, url);
  } catch (error) {
      console.log(error);
  }
}

async function overwriteToSpace(name, content, keyURL, callback){

  // derive keyname from keyurl
  var keyName = keyURL.substring("https://dsys32.nyc3.digitaloceanspaces.com/".length).replace(/ /g, '%20');

  // We don't really have to await for the file upload
  s3.putObject({
      Body : content,
      Bucket: "dsys32",
      Key: keyName,
      ACL: 'public-read',
      ContentDisposition: 'attachment; filename=' + name
  }, (error, data) => {
      console.log(error);
      console.log(data);
  });
}
