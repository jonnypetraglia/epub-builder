var prettyjson = require('prettyjson');

function idOfHref(href) {
  return href.split(".")[0].replace(/s?\//g, "-");
}


function forEach(obj, callback) {
  var keyset = Object.keys(obj);
  for(var i in keyset) {
    if(i>=0)
      callback(obj[keyset[i]], keyset[i], obj);
  }
};


var genUuid = function() {
  return "223f7f08-2f5c-4797-91e3-1e3b5cff2abd";
}


function printy(j) {
  console.log(prettyjson.render(j));
}


module.exports = {
  idOfHref: idOfHref,
  forEach: forEach,
  genUuid: genUuid,
  printy: printy
}