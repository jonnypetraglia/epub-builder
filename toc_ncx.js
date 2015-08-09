module.exports = function(meta, toc, uuid, depth) {
  var X = {}

  X.ncx = {
    "@xmlns": "http://www.daisy.org/z3986/2005/ncx/",
    "@version": "2005-1",
    head: {
      "#list": [
        {meta: {
          "@name": "dtb:uid",
          "@content": uuid
        }},
        {meta: {
          "@name": "dtb:depth",
          "@content": depth         //TODO?
        }},
        {meta: {
          "@name": "dtb:totalPageCount",
          "@content": 0         //TODO
        }},
        {meta: {
          "@name": "dtb:maxPageNumber",
          "@content": 0         //TODO
        }}
      ]
    },
    docTitle: {
      text: meta.title
    },
    navMap: {
      "#list": []
    }
  }


  for(var file in toc) {
    for(var entity in toc[file])
      X.ncx.navMap["#list"].push(navPoint(toc[file][entity], file));
  }


  function navPoint(point, file) {
    var newPoint = {navPoint: {
      navLabel: {text: point.text},
      content: {"@src": file + (point.id ? "#"+point.id : '')}
    }};

    if(point.children && point.children.length > 0) {
      newPoint.navPoint["#list"] = [];
      for(var i=0; i<point.children.length; i++)
        newPoint.navPoint["#list"].push(
          navPoint(point.children[i], file)
        );
    }
    return newPoint
  }

  return X;
}