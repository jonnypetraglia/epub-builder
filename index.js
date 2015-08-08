var xmlbuilder = require("xmlbuilder");
var cheerio = require('cheerio');
var fs = require("fs");
var mimetype = require('mimetype');
var markdown_it = require('markdown-it');
var slugify = require('slugify');

var util = require(__dirname + '/util.js')
var content_opf = require(__dirname + "/content_opf.js");
var toc_ncx = require(__dirname + "/toc_ncx.js");


function Pub(meta, arrayOfFileContents, options) {
  if(!(this instanceof Pub)) return new Pub(meta, arrayOfFileContents, options);
  var uuid = meta.identifier || util.genUuid();

  var options = options || {};

  //TODO: Generate testToC here from arrayOfFileContents files

  this.tree = {
    "style.css": options.customCSS || fs.readFileSync(__dirname+"/default_style.css", "utf-8"),
    text: [],
    images: []
  };
  for(var i=0; i<arrayOfFileContents.length; i++) {
    var obj = {};
    obj[i+".xhtml"] = arrayOfFileContents[i]
    this.tree.text.push(obj);
  }

  this.generateToC();
  this.tree["toc.ncx"] = toc_ncx(meta, this.toc, uuid);

  this.generateManifest();
  this.tree["content.opf"] = content_opf(meta, this.manifest);

  //this.ppretty("toc.ncx")
  console.log(this.getXml("toc.ncx"))
  //console.log(this.getXml("content.opf"))
  
  return this;
}



Pub.prototype.fromFiles = function(metaFilename, arrayOfFiles, options) {
  return Pub(fs.readFileSync(metaFilename, "utf-8"),
    arrayOfFiles.map(function(filename) {
      return fs.readFileSync(filename, "utf-8");
    }),
    options
  );
};

Pub.prototype.ppretty = function(what) {
  util.printy(this.tree[what])
}

Pub.prototype.getXml = function(what, notPretty) {
  return xmlbuilder.create(this.tree[what]).end({pretty: !notPretty});
}


Pub.prototype.generateManifest = function(dir, treePart) {
  var self = this;
  dir = dir || [];
  treePart = treePart || this.tree;
  this.manifest = this.manifest || {};

  for(var filename in treePart) {
    if(filename > -1) filename = treePart[filename];
    var fullDir = dir.concat(filename);
    if(Array.isArray(treePart[filename]))
      treePart[filename].forEach(function(file, i) {
        self.generateManifest(fullDir, file);
      });
    else
      self.manifest[fullDir.join("/")] = mimetype.lookup(fullDir)
  }
}

Pub.prototype.generateToC = function(maxH) {
  var toc = this.toc = {};
  maxH = maxH || 3
  if(!(maxH>0)) throw new Error("Invalid value: " + maxH)
  var headerLevels = "h"+Array.apply(null, {length: maxH+1})
                              .map(Number.call, Number)
                              .slice(1)
                              .join(", h");

  
  this.tree.text.forEach(function(fileEntry, index) {
    var filename = Object.keys(fileEntry)[0];

    var $ = cheerio.load(fileEntry[filename])
    var headers = $(headerLevels);
    var i = 0;

    toc["text/"+filename] = doH(1); //TODO: I don't like prepending this here; it feels manual
    fileEntry[filename] = $.html();


    function doH(level) {
      if(level > 6) throw new Error("Invalid header level: " + level)

      var tocPart = []
      while(i<headers.length) {
        var header = $(headers[i]),
            headerLvl = headers[i].tagName.substr(1);

        if(headerLvl > level) {
          // Smaller (i.e. greater h#)
          if(tocPart[tocPart.length-1].children)
            //TODO: This...should really never ever happen. If it does it means I wrote the algorithm wrong.
            throw new Error("Children already defined: " + tocPart[tocPart.length-1].text)
          tocPart[tocPart.length-1].children = doH(headerLvl);
          continue;
        }
        else if(headerLvl < level) {
          // Bigger (i.e. lesser h#)
          break;
        }
        else {
          // Same level
          if(!header.attr('id'))
            header.attr('id', slugify(header.text()));
          tocPart.push({
            level: level,
            text: header.text(),
            id: header.attr('id')
          });
          i+=1; // NOTE: i only advances on headers of the same level
        }
      }
      return tocPart;
    }
  });
}
//*/






//https://github.com/oozcitak/xmlbuilder-js/wiki/Conversion-From-Object



var md = markdown_it("commonmark")
  //.use(mard);



var pub = new Pub({
    "title": "Solutions for a Slow PC",
    "language": "en",
    "rights": "CC BY-NC-SA v4.0",
    "date_creation": "2015-08-06",
    "date_copyright": "2015-08-06",
  },
  require("/Users/notbryant/slow_pc/build/meta.json").contents.map(function(f) {
    return md.render(fs.readFileSync("/Users/notbryant/slow_pc/"+f, "utf-8"));
  })
  //*/
);


