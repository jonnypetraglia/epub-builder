module.exports = content_opf;

var clone = require('clone');

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
    subject:    {},
    description: {},
    //TODO: just make 'date' a function that takes a label and a date
    date_modification: {"@opf:event": "modification"},
    date_publication: {"@opf:event": "publication"},
    date_translation: {"@opf:event": "translation"},
    publisher:  {},
    identifier: {"@id": "uuid", "@opf:scheme": "UUID"},
    creator:    {"@opf:role": "aut"},
    contributor: {"@opf:role": "clb"}
  },
  defaults: {
    date_creation:    today,
    date_modification:   today,
    language: "en"
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
      "@xmlns:opf": "http://www.idpf.org/2007/opf",
      "#list": []
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

    if(meta[key]) {
      (Array.isArray(meta[key]) ? meta[key] : [ meta[key] ])
      .forEach(function(val) {
        console.log("Creating", key, val)
        var contents = clone(metadataStructure.contents[key]);
        contents["#text"] = val;
      }); // \forEach
    } else if(metadataStructure.defaults[key]) {
      var contents = clone(metadataStructure.contents[key]);
      if(metadataStructure.defaults[key] instanceof Function)
        contents["#text"] = metadataStructure.defaults[key]();
      else
        contents["#text"] = metadataStructure.defaults[key];
    }
    else
      continue;

    var derp = {};
    derp[dckey] = contents;
    X.package.metadata["#list"].push(derp);
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