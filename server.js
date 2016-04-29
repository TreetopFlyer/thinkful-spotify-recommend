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
    var searchArtist, searchRelated;
    var artist;
    
    searchArtist = getFromApi('search', {q:inReq.params.name, limit:1, type:'artist'});
    searchArtist.on('end', function(inData){
        if(inData.artists.items.length > 0){
            artist = inData.artists.items[0];
            searchRelated = getFromApi('artists/' + artist.id + '/related-artists');
            searchRelated.on('end', function(inRelated){
                artist.related = inRelated.artists;
                inRes.json(artist);
            });
            searchRelated.on('error', function(incode){
                inRes.sendStatus(inCode);
            });
        }
        else{
           inRes.json({name:'nothing found for \"'+inReq.params.name+'\"'}); 
        }
    });
    searchArtist.on('error', function(inCode){
        inRes.sendStatus(inCode);
    });
});



app.listen(80);