var unirest = require('unirest');
var express = require('express');
var events = require('events');

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
           .qs(args)
           .end(function(response) {
                if (response.ok) {
                    emitter.emit('end', response.body);
                }
                else {
                    emitter.emit('error', response.code);
                }
            });
    return emitter;
};

var app = express();

app.use('/', express.static(__dirname+'/public'));
app.get('/search/:name', function(inReq, inRes){
    
    var search;
    search = getFromApi('search', {q:inReq.params.name, linit:1, type:'artist'});
    
    search.on('end', function(inItem){
        inRes.json(inItem.artists.items[0]);
    });
    
    search.on('error', function(inCode){
        inRes.sendStatus(inCode);
    })
    
});

app.get('/related/:name', function(inReq, inRes){
    var searchArtist, searchRelated;
    
    searchArtist = getFromApi('search', {q:inReq.params.name, linit:1, type:'artist'});
    searchArtist.on('end', function(inData){


        if(inData.artists.items.length > 0){
            
            searchRelated = getFromApi('artists/' + inData.artists.items[0].id + '/related-artists');
            searchRelated.on('end', function(inData){inRes.json(inData);});
            searchRelated.on('error', function(incode){inRes.sendStatus(inCode);});
        }
        else{
           inRes.json("nothing found"); 
        }
    });
    
    searchArtist.on('error', function(inCode){
        inRes.sendStatus(inCode);
    })
    
});



app.listen(80);