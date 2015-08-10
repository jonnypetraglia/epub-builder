module.exports = content_opf;

var U = require(__dirname + '/util.js')

var metadataStructure = {
  required: {}, //TODO?
  constants: {
    type: {"#text": "Text"}
  },
  contents: {
    title:      {},
    language:   {},
    rights:     {},
    date_creation: {"@opf:event": "creation"},
    date_copyright: {"@opf:event": "copyright"},
    date_publication: {"@opf:event": "publication"},
    publisher:  {},
    identifier: {"@id": "uuid", "@opf:scheme": "UUID"},
    creator:    {"@opf:role": "aut"}
  },
  defaults: {
    date_creation:    today,
    date_copyright:   today,
    date_publication: today
  }
};

var today = function() {
  var d = new Date();
  return  d.getFullYear() + "-"
       + ('0' + (d.getMonth()+1)).slice(-2) + '-'
       + ('0' + d.getDate()).slice(-2);
}


function content_opf(meta, fileManifest, spineContents) {
  var X = {};

  X.package = {
      "@xmlns": "http://www.idpf.org/2007/opf",
      "@unique-identifier": "uuid",
      "@version": "2.0",
    metadata: {
      "@xmlns:dc": "http://purl.org/dc/elements/1.1/",
      "@xmlns:opf": "http://www.idpf.org/2007/opf"
    },
    manifest: {
      "#list": []
    },
    spine: {
      "#list": []
    },
    guide: {
      "#list": []
    }
  };

  /// Metadata ///
  for(var key in metadataStructure.constants)
     X.package.metadata["dc:"+key] = metadataStructure.constants[key];
  for(var key in metadataStructure.contents) {
    if(metadataStructure.constants[key])
      continue;

    var dckey = "dc:"+key;
    if(dckey.indexOf("_") > -1)
      dckey = "dc:"+key.split("_")[0];

    var val = metadataStructure.contents[key];
    if(meta[key])
      val["#text"] = meta[key];
    else if(metadataStructure.defaults[key]) {
      if(metadataStructure.defaults[key] instanceof Function)
        val["#text"] = metadataStructure.defaults[key]();
      else
        val["#text"] = metadataStructure.defaults[key];
    }
    else
      continue;

    if(dckey=="dc:"+key)
      X.package.metadata[dckey] = val;
    else {
      X.package.metadata["#list"] = X.package.metadata["#list"] || [];
      var derp = {};
      derp[dckey] = val;
      X.package.metadata["#list"].push(derp);
    }
  }

  /// Guide && Spine part1 ///
  (spineContents || []).forEach(function(info) {
    if(info.href && fileManifest[info.href]) {
      X.package.guide["#list"].push({reference: {
        "@href": info.href,
        "@type": info.type,
        "@title": info.title,
      }});
      X.package.spine["#list"].push({itemref: {
        "@idref": U.idOfHref(info.href)
      }})
    }
  });
  if(fileManifest["text/0.xhtml"])
    X.package.guide["#list"].push({reference: {
      "@href": "text/0.xhtml",
      "@type": "text",
      "@title": "Start"
    }});

  /// Manifest && Spine part1 ///
  for(var href in fileManifest) {
    var mediaType = fileManifest[href];
    var id = U.idOfHref(href);
    X.package.manifest["#list"].push({item: {
      "@id": id,
      "@href": href,
      "@media-type": mediaType
    }});
    // TODO: Less project-dependent way of adding a cover to metadata
    if(id=="image-cover") {
      X.package.metadata["#list"] = X.package.metadata["#list"] || [];
      X.package.metadata["#list"].push({meta: {
        "@name": "cover",
        "@content": id
      }});
    }
    if(mediaType == "application/x-dtbncx+xml")
      X.package.spine["@toc"] = id;
    else if(mediaType == "application/xhtml+xml" && /^text\//.test(href))
      X.package.spine["#list"].push({itemref: {
        "@idref": id
      }});
  }

  return X;
}