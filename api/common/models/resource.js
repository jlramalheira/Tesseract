var request = require("request");
var parseString = require("xml2js").parseString;
var iconv = require("iconv-lite");

module.exports = function(Resource) {

  Resource.searchDecs = function(search, cb) {
    var url = "http://decs.bvsalud.org/cgi-bin/mx/cgi=@vmx/decs/?words=" + search;
    var requestOptions = {
      encoding: null,
      method: "GET",
      uri: url
    };
    request(requestOptions, function(err, response, body) {
      var body = iconv.decode(new Buffer(body), "ISO-8859-1");
      parseString(body, function(err, result) {
        var decs = [];
        var responses = result.decsvmx.decsws_response;
        if (responses) {
          responses.forEach(function(elem) {
            var aux = {};
            var terms = {};
            var descriptors = elem.record_list[0].record[0].descriptor_list[0].descriptor;
            descriptors.forEach(function(d) {
              var key = d.$.lang;
              terms[key] = d._;
            });
            aux.terms = terms;
            aux.synonyms = elem.record_list[0].record[0].synonym_list[0].synonym;
            decs.push(aux);
          });
        }
        cb(null, decs);
      });
    });
  };

  Resource.remoteMethod(
    'searchDecs', {
      accepts: {
        arg: 'search',
        type: 'string'
      },
      returns: {
        arg: 'result',
        type: 'object'
      },
      http: {
        verb: 'get'
      }
    }
  );
  Resource.afterRemote('find', function(context, remoteMethodOutput, next) {
      if (remoteMethodOutput.length == 0) {
        if (context.args.filter) {
          var filter = JSON.parse(context.args.filter);
          if (filter.where) {
            var or = filter.where.or.filter(function(item) {
              return (item.name) ? true : false;
            });
            if (or[0].name && or[0].name.like) {
            var search = or[0].name.like;
            search = search.substring(1,search.length-1);
            var NoResultQuery = Resource.app.models.NoResultQuery;
            NoResultQuery.exists(search, function(err, exists) {
              if (!exists) {
                var noResult = {};
                noResult['search'] = search;
                noResult['created'] = new Date();
                noResult['lastUpdate'] = new Date();
                noResult['counter'] = 1;
                NoResultQuery.create(noResult, function(err, models) {
                  if (err) {
                    return err;
                  }
                });
              } else {
                NoResultQuery.findById(search, undefined, function(err, instance) {
                  if (err) {
                    return err;
                  }
                  instance.counter += 1;
                  instance.lastUpdate = new Date();
                  NoResultQuery.upsert(instance, function(err, i) {
                    if (err) {
                      return err;
                    }
                  });
                });
              }
            });
          }
        }
      }
    }
    next();
  });


Resource.observe('before save', function(ctx, next) {
  var currentTime = new Date();
  if (ctx.instance) {
    if (ctx.isNewInstance) {
      ctx.instance["creation"] = currentTime;
    } else {
      delete ctx.instance["creation"];
    };
    ctx.instance["lastUpdate"] = currentTime;
  } else {
    delete ctx.data["creation"];
    ctx.data["lastUpdate"] = currentTime;
  }
  next();
});
};
