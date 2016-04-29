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

var getFromApiBatch = function(inURLs){
    var emitter = new events.EventEmitter();
    var i;
    var done = 0;
    var output = [];
    
    function collect(inIndex, inData){
        output[inIndex] = inData;
        
        done++;
        if(done == inURLs.length){
            emitter.emit('end', output);
        }
    }
    
    for(i=0; i<inURLs.length; i++){
        
        var request = getFromApi(inURLs[i]);
        request._index = i;
        request.on('end', function(inData){
            collect(this._index, inData);
        });
        request.on('error', function(inCode){
            collect(this._index, {error:inCode});
        });
    }
    
    return emitter;
};

urls = [];
urls.push("artists/6DCIj8jNaNpBz8e5oKFPtp/top-tracks?country=US");
urls.push("artists/7lzordPuZEXxwt9aoVZYmG/top-tracks?country=US");
urls.push("artists/0f3EsoviYnRKTkmayI3cux/top-tracks?country=US");
urls.push("artists/1dfeR4HaWDbWqFHLkxsg1d/top-tracks?country=US");
urls.push("artists/0WwSkZ7LtFUFjGjMZBMt6T/top-tracks?country=US");
var batch = getFromApiBatch(urls);
batch.on('end', function(inArray){
    console.log(inArray);
})

var app = express();

app.use('/', express.static(__dirname+'/public'));

app.get('/search/:name', function(inReq, inRes){
    var searchArtist, searchRelated, searchTracks;
    var artist;
    
    searchArtist = getFromApi('search', {q:inReq.params.name, limit:1, type:'artist'});
    searchArtist.on('end', function(inData){
        if(inData.artists.items.length > 0){
            artist = inData.artists.items[0];
            searchRelated = getFromApi('artists/' + artist.id + '/related-artists');
            searchRelated.on('end', function(inRelated){
                var i;
                var tracks;
                var batch;

                tracks = [];
                for(i=0; i<inRelated.artists.length; i++){
                    tracks[i] = 'artists/' + inRelated.artists[i].id + '/top-tracks?country=US';
                }
                batch = getFromApiBatch(tracks);
                batch.on('end', function(inTracks){
                    artist.related = inRelated.artists;
                    artist.related.tracks = inTracks;
                });
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