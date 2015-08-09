var xmlbuilder = require("xmlbuilder");
var cheerio = require('cheerio');
var fs = require("fs");
var mimetypes = require('mime-types');
var markdown_it = require('markdown-it');
var slugify = require('slugify');
var request = require('sync-request');
var path = require("path");

var util = require(__dirname + '/util.js')
var content_opf = require(__dirname + "/content_opf.js");
var toc_ncx = require(__dirname + "/toc_ncx.js");
var container_xml = require(__dirname + "/container_xml.js");

var mdit = markdown_it("commonmark"),
    workingPath = util.workingPath;



module.exports = Pub;

function Pub(meta, arrayOfFileContents, options) {
  if(!(this instanceof Pub)) return new Pub(meta, arrayOfFileContents, options);
  var uuid = meta.identifier || util.genUuid();
  this.options = options || {};

  if(typeof meta != "object")
    meta = fs.readFileSync(workingPath(meta, this.options.workingDir), "utf-8")
  

  this.tree = {
    'META-INF': {},
    'OEBPS': {
      mimetype: "application/epub+zip",
      "style.css": this.options.customCSS || fs.readFileSync(__dirname+"/default_style.css", "utf-8"),
      text: [],
      images: []
    }
  };
  for(var i=0; i<arrayOfFileContents.length; i++) {
    var obj = {};
    obj[i+".xhtml"] = 
      this.enumerateImages(
        arrayOfFileContents[i]
          .replace("</head>", '<link rel="stylesheet" href="../style.css" /></head>')
      );
    this.tree.OEBPS.text.push(obj);
  }

  deepestLevel = this.generateToC();
  this.tree.OEBPS["toc.ncx"] = toc_ncx(meta, this.toc, uuid, deepestLevel);

  this.generateManifest();
  this.tree.OEBPS["content.opf"] = content_opf(meta, this.manifest);


  this.tree['META-INF']['container.xml'] = container_xml(["content.opf"]);

  console.log(this.getXml("OEBPS/toc.ncx"))
  console.log(this.getXml("OEBPS/content.opf"))
  console.log(this.getXml("META-INF/container.xml"))

  return this;
}


Pub.markdown = mdit.render;

Pub.fromFiles = function(meta, arrayOfFiles, options) {
  return new Pub(meta,
    arrayOfFiles.map(function(filename) {
      return fs.readFileSync(workingDir(filename, options.workingDir), "utf-8");
    }),
    options
  );
};

Pub.fromMarkdown = function(meta, arrayOfFileContents, options) {
  var self = this;
  return new Pub(meta, arrayOfFileContents.map(function(data) {
    return Pub.wrapHTMLtoXML(
        mdit.render==Pub.markdown ? mdit.render(data) : Pub.markdown(data)
      );
  }),
  options
  );
};

Pub.fromMarkdownFiles = function(meta, arrayOfFiles, options) {
  return Pub.fromMarkdown(meta,
    arrayOfFiles.map(function(filename) {
      return fs.readFileSync(workingPath(filename, options.workingDir), "utf-8");
    }),
    options
  );
};

Pub.wrapHTMLtoXML = function(html, title) {
  return '<?xml version="1.0" encoding="UTF-8"?>' +
  '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">' + 
  '<html xmlns="http://www.w3.org/1999/xhtml">' + 
  '<head>' + 
  '<title>' + title + '</title>' + 
  '</head>' + 
  '<body>' + 
  html + 
  '</body>' +
  '</html>';
}


Pub.prototype.ppretty = function(what) {
  util.printy(what.split("/").reduce(function(prev, curr) {
    return prev[curr];
  }, this.tree));
}

Pub.prototype.getXml = function(what, notPretty) {
  return xmlbuilder.create(what.split("/").reduce(function(prev, curr) {
    return prev[curr];
  }, this.tree)).end({pretty: !notPretty});
}

Pub.prototype.generateManifest = function(dir, treePart) {
  var self = this;
  dir = dir || [];
  treePart = treePart || this.tree.OEBPS;
  this.manifest = this.manifest || {};

  for(var filename in treePart) {
    if(filename > -1) filename = treePart[filename];
    var fullDir = dir.concat(filename);
    if(Array.isArray(treePart[filename]))
      treePart[filename].forEach(function(file, i) {
        self.generateManifest(fullDir, file);
      });
    else
      self.manifest[fullDir.join("/")] = mimetypes.lookup(fullDir.join("/"))
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

  var deepestLevel = 1;
  
  this.tree.OEBPS.text.forEach(function(fileEntry, index) {
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
          deepestLevel = Math.max(deepestLevel, level);
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
  return deepestLevel+1;
}

Pub.prototype.enumerateImages = function(html) {
  var imageList = this.tree.OEBPS.images,
      workingDir = this.options.workingDir;
  // Images
  var $ = cheerio.load(html);
  var filenameMap = {};
  
  $('img').each(function() {

    if(!filenameMap[this.attribs.src]) {
      var num = imageList.length;
      var newObj = {};
      var newName;
      var localPath = workingPath(this.attribs.src, workingDir);

      if(fs.existsSync(workingPath(this.attribs.src, workingDir))) {
        newName = num + path.extname(this.attribs.src);
        newObj[newName] = fs.readFileSync(localPath);
      } else {
        var res = request("GET", this.attribs.src);
        if(!/^image\//.test(res.headers['content-type']))
          throw new Error("Wrong content-type, expected an image:" + res.headers['content-type'] + " (" + this.attribs.src + ")");

        newName = num + "." + mimetypes.extension(res.headers['content-type']);
        newObj[newName] = res.getBody();
      }
      imageList.push(newObj);
      filenameMap[this.attribs.src] = "images/" + newName;
    }

    this.attribs.src = "../images/" + newName;
  });
  return $.html();
}
