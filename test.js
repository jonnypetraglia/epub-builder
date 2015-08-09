var Pub = require(__dirname + "/index.js")


var pub = Pub.fromMarkdownFiles({
    "title": "Solutions for a Slow PC",
    "language": "en",
    "rights": "CC BY-NC-SA v4.0",
    "date_creation": "2015-08-06",
    "date_copyright": "2015-08-06",
  },
  require("/Users/notbryant/slow_pc/build/meta.json").contents.map(function(f) {
    return "/Users/notbryant/slow_pc/"+f;
  }), 
  {workingDir: "/Users/notbryant/slow_pc/dist"}
);


