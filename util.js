var path = require("path");
var mimetypes = require('mime-types');
var fs = require('fs');
var request = require('sync-request');

function idOfHref(href) {
  return href.split(".")[0].replace(/s?\//g, "-");
}


function workingPath(filename, workingDir) {
  if(workingDir && path.resolve(filename)!==path.normalize(filename))
    return path.join(workingDir, filename)
  return filename;
}


var genUuid = function() {
  return "223f7f08-2f5c-4797-91e3-1e3b5cff2abd";
}


function printy(j) {
  console.log(require('prettyjson').render(j));
}

function printj(j) {
  console.log(require('jsonpretty')(j))
}


function image2bufferSync(uri, workingDir) {
  workingDir = workingDir || __dirname
  var res = {}
  // Binary
  if(uri instanceof Buffer) {
    return uri
  }
  // Base64
  else if(/^data:image\/[a-z0-9]+;base64,/.test(uri)) {
    var contentType = uri.match(/data:(image\/[a-z0-9]+);base64,/)[1];
    return new Buffer(uri.substr(uri.indexOf(";base64,")+";base64,".length), 'base64');
  // Local file
  } else if(fs.existsSync(workingPath(uri, workingDir))) {
    return fs.readFileSync(workingPath(uri, workingDir));
  // Url
  } else {
    var res = request("GET", uri);
    if(!/^image\//.test(res.headers['content-type']))
      throw new Error("Wrong content-type, expected an image:" + res.headers['content-type'] + " (" + uri + ")");
    return res.getBody();
  }
}


module.exports = {
  idOfHref: idOfHref,
  genUuid: genUuid,
  workingPath: workingPath,
  image2bufferSync: image2bufferSync,
  printy: printy,
  printj: printj
}