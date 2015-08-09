var mimetypes = require("mime-types");

module.exports = function() {

  return {
    container: {
      "@version": "1.0",
      "@xmlns": "urn:oasis:names:tc:opendocument:xmlns:container",
      rootfiles: {
        rootfile: {
          "@full-path": "OEBPS/content.opf",
          "@media-type": "application/oebps-package+xml"
        }
      }
    }
  };
}