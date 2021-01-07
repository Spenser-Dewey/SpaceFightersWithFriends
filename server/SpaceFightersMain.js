import createRandomAsteroid from './GameComponents';

var http = require('http');

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*'});
  let data = "";
  req.on('data', chunk => {
    data += chunk;
  });
  req.on('end', ()=> {
    console.log("RECIEVED DATA " + data);
    // data = JSON.parse(data);
    res.end(`Recieved ${data}!`);
  });
}).listen(80);


const GameState = function() {
  const def = {
    frameTimer: 0,
    asteroidMin: 50,
    asteroids: [],
    ships: [],
    stars: [],
  };

  const start = function() {
    const obj = Object.create(def);
    
    for(var i = this.asteroidMin; i > 0; i--) {
      asteroids.push(createRandomAsteroid());
    }

    return obj;   
  };

  return {start}
}