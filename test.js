var Pub = require(__dirname + "/index.js")
var util = require(__dirname + "/util.js")
var fs = require('fs');


var meta = {
  "title": "Solutions for a Slow PC",
  "language": "en",
  "rights": "CC BY-NC-SA v4.0",
  "date_creation": "2015-08-06",
  "date_copyright": "2015-08-06",
};

var fileContents = require("/Users/notbryant/slow_pc/build/meta.json").contents.map(function(f) {
  return fs.readFileSync("/Users/notbryant/slow_pc/"+f, "utf-8");
});


function extractTitle(fileContents, newTitle) {
  var title = fileContents[0].split(/\n<!---*-->\n/)[0].trim();
  fileContents[0] = fileContents[0].substr(title.length).trim();
  fileContents[0] = fileContents[0].substr(fileContents[0].indexOf("\n")).trim();
  fileContents[0] = "# " + newTitle + " #\n" + fileContents[0];
  return title;
}

var titlePage = extractTitle(fileContents, "Preface");


var pub = Pub.fromMarkdown(
  meta,
  fileContents, 
  {
    tocInText: true,
    titlePage: titlePage,
    coverImage: "http://orig14.deviantart.net/4904/f/2013/314/f/6/_hq_jon_blank_image_by_keno9988-d6tpbai.png",
    workingDir: "/Users/notbryant/slow_pc/dist",
    customCss: "hr.pagebreak + hr.pagebreak {page-break-after: always;}" + 
               "hr.pagebreak {visibility: hidden;}"
  }
);


