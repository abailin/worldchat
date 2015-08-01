var request = require("request");
var crypto = require("crypto");
var iconv = require("iconv-lite");
var qs = require("querystring");

function Translate() {

  var google_api_key = "";

  function setGoogleApiKey(key) {
    this.google_api_key = key;
  }

  function translate(opts, callback)
  {

    if (!opts.text || !opts.source || !opts.target) {
      if (typeof callback === "function")
      {
        return callback(null, "Missing required arguments");
      }
    }

    //
    // do we have a translation saved?
    //
    var signer = crypto.createHmac('sha1', new Buffer(opts.text, 'utf8'));
    opts.text_hash = signer.update("text").digest("hex");
    

    //
    // let's ask google!
    //
    var url = "https://www.googleapis.com/language/translate/v2?key=" + this.google_api_key 
      + "&q=" + qs.escape(opts.text) + "&source=" + opts.source + "&target=" + opts.target;

    request(url, function(error, response, body) {

      if (!error && response.statusCode == 200)
      {
        // var body_utf8 = iconv.decode(new Buffer(body), "ISO-8859-1");
        var translation = JSON.parse(body);
        var translated = translation.data.translations[0].translatedText;
        console.log("translated: " + translated);
        opts.translation = translated;

        // save translation
        saveTranslation(opts);

        if (typeof callback === "function")
        {
          return callback(translated);
        }
      }
      else {
        if (typeof callback === "function")
        {
          return callback(null, JSON.parse(body));
        }
      }
    });
  }

  function queryTranslation()
  {

  }

  function saveTranslation(opts)
  {

    opts.ttl = 3600 * 24 * 90; // 90 days

    mysql.query("INSERT INTO translations SET ?, added=CURRENT_TIMESTAMP", opts, function(err, result) {
      if (err) {
        console.log(" * MysqlError: %j", err);
      }
    });

  }

  function queryCache()
  {

  }

  return {
    translate: translate,
    setGoogleApiKey: setGoogleApiKey
  }
  
};

module.exports = Translate;