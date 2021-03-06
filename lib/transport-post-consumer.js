var querystring = require("querystring"),
    xmldom = require("xmldom"),
    protocol = require("./protocol-generated");

var PostConsumer = module.exports = function PostConsumer(req, cb) {
  if (req.method !== "POST") {
    return cb(Error("PostConsumer only works with POST requests"));
  }

  if (!req.headers || req.headers['content-type'] !== 'application/x-www-form-urlencoded') {
    return cb(Error("PostConsumer only reads x-www-form-urlencoded bodies"));
  }

  var buffer = [],
      parser = new xmldom.DOMParser();

  req.on("readable", function() {
    var chunk;
    while (chunk = req.read()) {
      buffer.push(chunk);
    }
  });

  req.on("end", function() {
    buffer = Buffer.concat(buffer).toString();

    var parsed = querystring.parse(buffer);

    if (!parsed || (!parsed.SAMLRequest && !parsed.SAMLResponse)) {
      return cb(Error("no SAML fields found in body"));
    }

    var data = {};

    var xml, fields = [["SAMLRequest", "request"], ["SAMLResponse", "response"]];
    for (var k in fields) {
      if (!parsed[fields[k][0]]) {
        continue;
      }

      xml = Buffer(parsed[fields[k][0]], "base64").toString();

      try {
        xml = parser.parseFromString(xml);
      } catch (e) {
        return cb(e);
      }

      if (!xml) {
        return cb(Error("couldn't parse " + fields[k][0] + " field"));
      }

      data[fields[k][0]] = xml;
      data[fields[k][1]] = protocol.fromXML(xml.documentElement);
    }

    cb(null, data);
  });
};
