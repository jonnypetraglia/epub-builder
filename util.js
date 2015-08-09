var prettyjson = require('prettyjson');
var path = require("path");

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
  console.log(prettyjson.render(j));
}


module.exports = {
  idOfHref: idOfHref,
  genUuid: genUuid,
  workingPath: workingPath,
  printy: printy
}