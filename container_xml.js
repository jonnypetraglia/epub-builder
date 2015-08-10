var mimetypes = require("mime-types");

module.exports = function(content_opf) {

  return {
    container: {
      "@version": "1.0",
      "@xmlns": "urn:oasis:names:tc:opendocument:xmlns:container",
      rootfiles: {
        rootfile: {
          "@full-path": content_opf,
          "@media-type": mimetypes.lookup(content_opf)
        }
      }
    }
  };
}