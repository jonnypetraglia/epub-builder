# epub-builder #

> No-nonsense EPUB building with a focus on being overridable.

The goal of this project is to make a system that handles most of the complexity
and hastle that comes with building an EPUB:

  - **XML Building**: Creates the necessary XML files from the metadata you provide.
  - **Asset Management**: Fetches all the images referenced in your files.
  - **HTML and Markdown**: Pass it in, get an EPUB out. That simple
  - **Folder Structure**: All files in the project are stored in a tree structure.
    View or tweak your data manually before executing the build.
  - **Compression**: Create the EPUB file straight from the files in memory.


I wrote it to generate an EPUB from my [Solutions for a Slow PC](https://github.com/notbryant/slow-pc-guide)
project and wrote it to hopefully be detached and usable for other projects.

I should give a nod to [ebrew](https://github.com/notbryant/ebrew) which was this
project is inspired by; it did almost everything right and if the dev would have
had a different vision than a CLI app, this project would never needed to have
existed.


## Core usage ##

Create an EpubBuilder object and run 'build()'. That's it.

```javascript
  var builder = require('epub-builder');

  var metadata = {
    "title": "Life is Terrible (Especially if you are Ugly)",
    "creators": ["Fletcher", "Copernicus"],
    "description": "Ages 3-6",
    "date_creation": "2009-02-20",
    "publisher", "Antics Comic"
  };
  var htmlContents = [
    "<html><body><h1>Chapter I</h1> I like <i>shorts</i>, they're comfy and easy to wear!</body></html>",
    "<html><body><h1>Appendix</h1> shorts (noun): comfy; also, easy to wear</body></html>"
  ];
  var options = {
    titlePage: "<html><body><h1>Best Children's Book Ever</h1> :( </body></html>",
    tocInText: true,
    customCss: "body i { color: red; }",
    coverImage: "http://imgur.com/qmeCWq5"
  }

  var Epub = new builder(metadata, htmlContents, options);

  Epub.build(function(err, outputFile) {
    if(!err) console.log("Successfully generated", outputFile);
  });
```

There are also some other nice functions to make note of:

```javascript

  // Create from Markdown instead of HTML
  var Epub = builder.fromMarkdown(metadata, mdContents, options);

  // Specify file paths instead of the actual data
  var Epub = builder.fromFiles(metadata, htmlFileList, options);
  var Epub = builder.fromMarkdownFiles(metadata, mdFileList, options);

  // Display the filenames that will be in the EPUB
  Epub.printContents();

  // Write the files in this.tree to a destination instead of compressing it
  Epub.write(destDir);

  // Compress the files in this.tree to an EPUB file
  Epub.build(outputFile, callback)
  // Result: calls callback(err, outputFile)
```


## Metadata ##

Ideally epub-builder should support everything that EPUB supports.
But it's nice to have some form of order so what's acceptible is chosen manually.

  - `files` - an alternative the second argument in `fromFiles` and `fromMarkdownFiles`
  - `identifier` - currently a UUID that is unique for your book (across versions?)
    - TODO: other types of identifiers? (uris and such)
  - `title` - book title
  - `description` - I shouldn't have to describe description
  - `language` - default `en` - two-letter identifier
  - `rights` - copyright and/or license string
  - `subject` - comma separated list of subjects
  - `publisher` - name of publisher
  - `creator` - author
  - `contributor` - currently hardcoded as "collaborator" ('clb')
  - `date_publication`
  - `date_modification`
  - `date_translation`

TODO: Currently none of these are required and some of them really should be.


## Options ##

  - `workingDir` - the folder to treat as working directory when fetching images
    referenced in HTML files
  - `customCss` or `customCSS` - your own CSS to replace the default
  - `coverImage` - the image to display as the cover in the bookshelf screen on
    your e-reader
  - `titlePage` - HTML for a page to insert as a title/cover page
    - Note: on `fromMarkdown` and `fromMarkdownFiles` this is assumed to be
      Markdown as well and is thus rendered
  - `tocInText` - default: `false` - a bool for whether or not to insert an interactable
    Table of Contents at the beginning (but after titlePage) in addition to the
    native EPUB contents navigation
  - `preprocessHtml` - a function to call before parsing HTML files
    - arguments: `$ = a cherrio instance`; use it to alter the DOM however you see fit


## Customization ##

The best part of epub-builder is that it exposes all the files that will be created
as `this.tree`. A sample tree would look like:

```json
  {
    "mimetype": "<utf-8>",
    "META-INF": {
      "container.xml": "<xmlbuilder object>"
    },
    "OEBPS": {
      "toc.ncx": "<xmlbuilder object>",
      "content.opf": "<xmlbuilder object>",
      "title.xhtml": "<utf-8>",
      "style.css": "<utf-8>",
      "text": [
        {"0.xhtml": "<utf-8>"},
        {"1.xhtml": "<utf-8>"},
        {"2.xhtml": "<utf-8>"}
      ],
      "images": [
        {"0.png": "<buffer>"},
        {"1.jpeg": "<buffer>"},
        {"cover.png": "<buffer>"}
      ]
    }
  }
```

Text files are stored as UTF-8 strings, images as Buffers, and XML files as
[xmlbuilder](https://www.npmjs.com/package/xmlbuilder) objects.
This means that you can easily alter any of the above if you so choose; even
manipulating XML is as easy as editing an object.


Some other useful vars that are used in the process of the build are
`this.toc` and `this.manifest`, both of which are generated by two methods which
are discussed in [Advanced Overriding](#advanced-overriding).


## Overriding ##

epub-builder is built so that just about any method in the process can be
overridden. Here are some of the more simple ones:

```javascript
  // renders Markdown to HTML
  builder.markdown = function(md);  // default is [markdown-it](https://www.npmjs.com/package/markdown-it)

  // creates the 'id' attribute for HTML header items based on its text
  builder.slugify = function(str); // default to [slugify](https://www.npmjs.com/package/slugify)

  // wraps an HTML partial (e.g. rendered Markdown) to make it a full Markdown file
  builder.wrapHtmlBody = function(html, title);

  // converts a full or partial HTML document to a valid XML document
  builder.html2xml = function();

  // renders the contents of this.toc to HTML when options.tocInText is supplied
  prototype.renderToC = function();

```


## Advanced Overriding ##

Below are functions that are crucial to the XML generation but seem less useful
to override. Nevertheless, they are they are public and overridable.

Some of these are not necessarily valuable to override, but they are valuable to
access when overriding other functions.

```javascript
  // generates this.tree based on the contents in this.tree.OEBPS
  prototype.generateManifest = function(dir, treePart);
  // Result: hash(filepath => mimetype)

  // generates this.toc based on the contents of this.tree.OEBPS
  prototype.generateToC = function(maxHeader);
  // Result: map(filename => tree of headers)

  // builds XML of a file's data in the virtual tree
  prototype.getXml = function(pathToItem, notPretty);
  // 

  // works on cheerio data to replace the src in <img> tags with the path of the image in the tree
  //  (also caches the results so images used more than once can be reused)
  prototype.processImages = function($, filepath);
  // Result: images appended to this.tree.OEBPS.images


  // calls a function on each file; used in write and build;
  prototype.performActionOnFiles = function( callback );
  // Result: calls callback(filename, contents)
```





## Limitations ##


### Syncronous ###

Right now it's entirely syncronous with the exception of `build()`.

Eventually I'd like to promisify everything but honestly, for what I envisioned


### Image paths ###

Right now it will have problems with HTML files stored in different places that
refer to _local_ images (unless absolute paths are used).
An example shows it best:

  - ./main.html contains <img src="stuff/logo.png">
  - ./stuff/sub.html contains <img src="logo.png">

It sets the same `workingDir` for all files so one of these will be wrong.

**Solution**: make the 2nd argument to the constructor take an object of the form:

```
{
    "dir": "...",
    "data": "..."
}
```

You would then make fromFiles, fromMarkdownFiles, and enumerateImages take it as
an argument.

TODO: This fix would require the cache referring to the absolute path of images rather than just the src value


### skewed ToC generation ###

It *may* crash if the first header tag encountered is not a h1.

I mostly don't know how to deal with this. The most logical choice is to do:

  * <h2>First header</h2>
  * <h2>Second header</h2>
  * <h1>Finally a Primary</h1>
    * <h2>Loook a secondary, on a different level</h2>

This seems weird.


### Images (may) render wrong in some readers ###

Specifically ClearView for OS X (which uses the C libepub library, if that's relevant):

  * the cover.xhtml does not render
  * The logo (1.png) does not render
  * what should be the CreativeCommons badge (2.png) instead renders the logo (1.png)

Other apps I've tested (iBooks, Murasaki, Kitabu kinda?) display them just file.
And the XHTML references the right file, so I have no idea what the deal is.

