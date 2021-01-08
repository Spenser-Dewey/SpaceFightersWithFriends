const { Asteroid, Ship, Bullet, createRandomAsteroid } = require('./GameComponents');
const Constants = require('./Constants');
var http = require('http');
const { Vector2D, overlap } = require('./Utils');

const GameState = {
  frameTimer: 0,
  currentID: 0,
  asteroids: [],
  ships: [],
  bullets: [],
  // stars: [],
  events: [],

  start() {
    for (var i = Constants.minAsteroids; i > 0; i--) {
      this.asteroids.push(createRandomAsteroid(this));
    }
    for (var i = Constants.savedFrames - 1; i > -1; i--) {
      this.events[i] = { events: [] };
    }

    this.interval = setInterval(() => this.update(), 20);
  },

  update() {
    this.frameTimer++;
    this.events = this.events.slice(1, Constants.savedFrames + 1);
    this.events[Constants.savedFrames] = { events: [] };

    this.updateElement(this.asteroids);
    this.updateElement(this.bullets);
    this.updateElement(this.ships);

    checkCollisions();
  },

  updateElement(eleArr) {
    for (let i = eleArr.length - 1; i > -1; i--) {
      if (eleArr[i].live) {
        eleArr[i].update();
      } else {
        eleArr.splice(i, 1);
      }
    }
  },

  addObject(newObj) {
    if (newObj instanceof Asteroid) {
      this.asteroids.push(newObj);
      this.events[Constants.savedFrames].events.asteroids = (this.events[Constants.savedFrames].events.asteroids || []);
      this.events[Constants.savedFrames].events.asteroids.push(newObj);
    } else if (newObj instanceof Ship) {
      this.ships.push(newObj);
      this.events[Constants.savedFrames].events.ships = (this.events[Constants.savedFrames].events.ships || []);
      this.events[Constants.savedFrames].events.ships.push(newObj);
    } else if (newObj instanceof Bullet) {
      this.bullets.push(newObj);
      this.events[Constants.savedFrames].events.bullets = (this.events[Constants.savedFrames].events.bullets || []);
      this.events[Constants.savedFrames].events.bullets.push(newObj);
    }
  },

  getNextID() {
    return this.currentID++;
  }
}

function checkCollisions() {
  for (let i = GameState.ships.length - 1; i > -1; i--) {
    if (aster = GameState.asteroids.find(asteroid => overlap(asteroid, GameState.ships[i]))) {
      GameState.ships[i].destroy();
      aster.destroy();
      this.events[Constants.savedFrames].events.collisions = (this.events[Constants.savedFrames].events.collisions || []);
      this.events[Constants.savedFrames].events.collisions.push({asteroid: aster.id, ship: GameState.ships[i].id});
    }
    else if (bullet = GameState.bullets.find(bullet => overlap(bullet, GameState.ships[i]))) {
      GameState.ships[i].destroy();
      bullet.destroy();
      this.events[Constants.savedFrames].events.collisions = (this.events[Constants.savedFrames].events.collisions || []);
      this.events[Constants.savedFrames].events.collisions.push({bullet: bullet.id, ship: GameState.ships[i].id});
    }
  }
  for (let i = GameState.bullets.length - 1; i > -1; i--) {
    if (aster = GameState.asteroids.find(asteroid => overlap(asteroid, GameState.bullets[i]))) {
      GameState.bullets[i].destroy();
      aster.destroy();
      this.events[Constants.savedFrames].events.collisions = (this.events[Constants.savedFrames].events.collisions || []);
      this.events[Constants.savedFrames].events.collisions.push({asteroid: aster.id, bullet: GameState.bullets[i].id});
    }
  }
}

exports.GameState = GameState;

GameState.start();

http.createServer(function (req, res) {
  res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
  let data = "";
  req.on('data', chunk => {
    data += chunk;
  });

  req.on('end', () => {
    console.log("RECIEVED DATA " + data);
    sendResponse(JSON.parse(data), res);
  });
}).listen(80);

function sendResponse(data, responseObj) {
  if (data.type == "join") {
    const gameData = {};
    gameData.frameTimer = GameState.frameTimer + 1;
    gameData.asteroids = GameState.asteroids;
    gameData.ships = GameState.ships;
    gameData.bullets = GameState.bullets;
    gameData.id = GameState.getNextID();
    GameState.addObject(new Ship(Vector2D.createRandom(0, Constants.width, 0, Constants.height), Vector2D.create(0, 0), 60, 60, 0, data.bulletColor, data.wingColor, data.bodyColor, GameState));
    responseObj.end(JSON.stringify(gameData, printProcessGameData));
  } else if(data.type && data.type == "update") {
    let playerShip = GameState.ships.find(ship => ship.id == data.id);
    if (playerShip && data.key)
      playerShip.keys[data.key] = data.pressed;

    const eventObj = [];
    for (let i = Math.max(Constants.savedFrames - GameState.frameTimer - data.lastFrame, 0); i < GameState.frameTimer - 1; i++) {
      if (GameState.events[i]) {
        eventObj.push(GameState.events[i]);
      }
    }

    responseObj.end(JSON.stringify(eventObj));
  }
}

function printProcessGameData(key, value) {
  if (key == "lines") {
    let returnArr = [];
    for (let i = value.length - 1; i > -1; i--) {
      returnArr.push(value[i].p1);
    }
    return returnArr;
  } else if (key == "gameInstance") {
    return undefined;
  } else {
    return value;
  }
}