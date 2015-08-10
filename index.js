var xmlbuilder = require("xmlbuilder");
var cheerio = require('cheerio');
var fs = require("fs");
var mimetypes = require('mime-types');
var markdown_it = require('markdown-it');
var slugify = require('slugify');
var request = require('sync-request');
var path = require("path");
var archiver = require('archiver');
var mkdirp = require('mkdirp');

var util = require(__dirname + '/util.js');
var content_opf = require(__dirname + "/content_opf.js");
var toc_ncx = require(__dirname + "/toc_ncx.js");
var container_xml = require(__dirname + "/container_xml.js");

var mdit = markdown_it("commonmark"),
    workingPath = util.workingPath;



var DOCTYPES = {
  "application/x-dtbncx+xml": {pubID: "-//NISO//DTD ncx 2005-1//EN", sysID: "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd"},
  "application/xhtml+xml": {pubID: "-//W3C//DTD XHTML 1.1//EN", sysID: "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd"}
};


var Pub = module.exports = function(meta, arrayOfFileContents, options) {
  if(!(this instanceof Pub)) return new Pub(meta, arrayOfFileContents, options);
  var uuid = meta.identifier || util.genUuid();
  this.options = options || {};

  if(typeof meta != "object")
    meta = fs.readFileSync(workingPath(meta, this.options.workingDir), "utf-8")
  this.meta = meta;

  this.tree = {
    'META-INF': {},
    'OEBPS': {
      "style.css": this.options.customCSS || this.options.customCss || fs.readFileSync(__dirname+"/default_style.css", "utf-8"),
      text: [],
      images: []
    },
    mimetype: "application/epub+zip"
  };
  if(this.options.titlePage)
    this.processImages(cheerio.load(this.options.titlePage));
  for(var i=0; i<arrayOfFileContents.length; i++)
    addText.call(this, i+".xhtml", arrayOfFileContents[i]);

  deepestLevel = this.generateToC();
  this.tree.OEBPS["toc.ncx"] = toc_ncx(meta, this.toc, uuid, deepestLevel);

  if(this.options.titlePage)
    addText.call(this, "title.xhtml", this.options.titlePage);

  this.generateManifest();
  this.tree.OEBPS["content.opf"] = content_opf(meta, this.manifest);


  this.tree['META-INF']['container.xml'] = container_xml(["content.opf"]);

  return this;
}

function addText(name, html) {
  var obj = {};
  var $ = cheerio.load(html);
  if(this.preprocessHtml)
    this.options.preprocessHtml($)
  this.processImages($);
  html = Pub.html2xml($.html({xmlMode: true}));
  obj[name] = html;
  this.tree.OEBPS.text.push(obj);
}


Pub.markdown = mdit.render;
Pub.slugify = slugify;

Pub.fromFiles = function(meta, arrayOfFiles, options) {
  arrayOfFiles = arrayOfFiles || meta.files;
  return new Pub(meta,
    arrayOfFiles.map(function(filename) {
      return fs.readFileSync(workingDir(filename, options.workingDir), "utf-8");
    }),
    options
  );
};

Pub.fromMarkdown = function(meta, arrayOfFileContents, options) {
  var self = this;
  if(options.titlePage)
    options.titlePage = mdit.render==Pub.markdown ? mdit.render(options.titlePage) : Pub.markdown(options.titlePage)
  return new Pub(meta, arrayOfFileContents.map(function(data) {
    return Pub.wrapHtmlBody(
        mdit.render==Pub.markdown ? mdit.render(data) : Pub.markdown(data)
      );
  }),
  options
  );
};

Pub.fromMarkdownFiles = function(meta, arrayOfFiles, options) {
  arrayOfFiles = arrayOfFiles || meta.files;
  return Pub.fromMarkdown(meta,
    arrayOfFiles.map(function(filename) {
      return fs.readFileSync(workingPath(filename, options.workingDir), "utf-8");
    }),
    options
  );
};

Pub.wrapHtmlBody = function(html, title) {
  return '<!DOCTYPE html>' +
  '<html>' + 
  '<head>' + 
  '<title>' + title + '</title>' + 
  '</head>' + 
  '<body>' + 
  html + 
  '</body>' +
  '</html>';
}

Pub.html2xml = function(html) {
  var $ = cheerio.load(html);
  $('head').append('<link rel="stylesheet" href="../style.css" \/>');
  var innerHTML = $.html($('html').children(), {xmlMode: true});

  return xmlbuilder.create({"html": null}, DOCTYPES["application/xhtml+xml"])
    .att("xmlns", "http://www.w3.org/1999/xhtml")
    .raw(innerHTML)
    .end();
}


Pub.prototype.ppretty = function(what) {
  util.printy(pathToTreeItem(what, this.tree));
}

Pub.prototype.getXml = function(what, notPretty) {
  return xmlbuilder.create(
    pathToTreeItem(what, this.tree),
    {version: '1.0', encoding: 'UTF-8'},
    DOCTYPES[mimetypes.lookup(what)]
  ).end({pretty: !notPretty});
}

function pathToTreeItem(what, tree) {
  return what.split("/").reduce(function(prev, curr) {
    return prev[curr];
  }, tree);
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

    fileEntry[filename] = $.html({xmlMode: true});

    function doH(level) {
      if(level > 6) throw new Error("Invalid header level: " + level)

      var tocPart = []
      while(i<headers.length) {
        var header = $(headers[i]),
            headerLvl = headers[i].tagName.substr(1);

        if(headerLvl > level) {
          deepestLevel = Math.max(deepestLevel, headerLvl);
          // Smaller (i.e. greater h#)
          if(tocPart.length==0) {
            tocPart.push({level: level})// TODO: Is this bad?
          }
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
            header.attr('id', Pub.slugify(header.text()));
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

Pub.prototype.processImages = function($) {
  var imageList = this.tree.OEBPS.images,
      workingDir = this.options.workingDir;
  var filenameMap = this.imageMap = this.imageMap || {};
  
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
      filenameMap[this.attribs.src] = newName;
    }

    this.attribs.src = "../images/" + filenameMap[this.attribs.src];
  });
}

Pub.prototype.performActionOnFiles = function(action) {
  var that = this;
  doPart(this.tree, [])

  function doPart(part, dir) {
    if(Array.isArray(part)) {
      for(var i=0; i<part.length; i++) {
        var filename = Object.keys(part[i])[0];
        action(path.join(dir.concat(filename).join("/")), part[i][filename]);
      }
    } else if(typeof part == "object") {
      var keyset = Object.keys(part);
      if(part[ keyset[0] ]["@xmlns"])
        action(
          dir.join("/"),
          that.getXml.call(that, dir.join("/"))
        );
      else
        keyset.forEach(function(name) {
          doPart(part[name], dir.concat(name));
        });
    } else
      action(dir.join("/"), part);
  }
}

Pub.prototype.printContents = function() {
  this.performActionOnFiles(function(filepath) {
    console.log(filepath)
  })
}

Pub.prototype.write = function(destination) {
  destination = path.resolve(process.cwd(), destination || this.meta.title)
  var that = this;

  this.performActionOnFiles(function(filepath, filecontents) {
    var fullpath = path.join(destination, filepath);
    mkdirp.sync(path.dirname(fullpath));
    fs.writeFile(fullpath, filecontents)
  });
}

Pub.prototype.build = function(destination, cb) {
  if(destination) {
    destination = path.resolve(process.cwd(), destination)
    if (!/\.epub$/.test(destination)) 
      destination += '.epub'
  } else
    destination = path.join(this.meta.title+'.epub')
  
  mkdirp.sync(path.dirname(destination));

  var archive = archiver.create('zip')

  this.performActionOnFiles(function(filepath, filecontents) {
    archive.append(filecontents, {
      name: filepath,
      store: filepath=="mimetype"
    });
  })
  archive.finalize()
  archive.pipe(fs.createWriteStream(destination))
  archive.on('end', function() {
    console.log('Generated '+path.relative(process.cwd(), destination))
    if(cb) cb()
  })
}
