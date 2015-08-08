module.exports = function(meta, toc, uuid) {
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
          "@content": 6         //TODO?
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
      navPoint(toc[file][entity], X.ncx.navMap["#list"], file);
  }


  function navPoint(point, navMap, file) {
    navMap.push({navPoint: {
      navLabel: {text: point.text},
      content: {"@src": file + (point.id ? "#"+point.id : '')}
    }});

    if(point.children && point.children.length > 0) {
      var nextNode = {navPoint: {"#list": []}};
      for(var i=0; i<point.children.length; i++)
        navPoint(point.children[i], nextNode.navPoint["#list"], file);
      navMap.push(nextNode);
    }
  }

  return X;
}