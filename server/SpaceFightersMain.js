const { Asteroid, Ship, Bullet, createRandomAsteroid } = require('./GameComponents');
const Constants = require('./Constants');
var http = require('http');
const { Vector2D, overlap } = require('./Utils');

const GameState = {
  frameTimer: 0,
  currentID: 1,
  asteroids: [],
  ships: [],
  bullets: [],
  events: [],

  start() {
    for (var i = Constants.minAsteroids; i > 0; i--) {
      this.asteroids.push(createRandomAsteroid(this));
    }
    for (var i = Constants.savedFrames; i > -1; i--) {
      this.events[i] = {};
    }

    this.interval = setInterval(() => this.update(), 20);
  },

  update() {
    this.frameTimer++;
    this.events = this.events.slice(1, Constants.savedFrames + 1);
    this.events[Constants.savedFrames] = { asteroids: [], bullets: [], collisions: [], deaths: [] };

    this.updateElement(this.asteroids);
    this.updateElement(this.bullets);
    this.updateElement(this.ships);

    checkCollisions();

    this.events[Constants.savedFrames].ships = this.ships;
  },

  updateElement(eleArr) {
    for (let i = eleArr.length - 1; i > -1; i--) {
      if (eleArr[i].live) {
        eleArr[i].update();
      } else {
        this.events[Constants.savedFrames].deaths.push(eleArr[i].id);
        eleArr.splice(i, 1);
      }
    }
  },

  addObject(newObj) {
    if (newObj instanceof Asteroid) {
      this.asteroids.push(newObj);
      this.events[Constants.savedFrames].asteroids.push(newObj);
    } else if (newObj instanceof Ship) {
      this.ships.push(newObj); //Ships always put into events
    } else if (newObj instanceof Bullet) {
      this.bullets.push(newObj);
      this.events[Constants.savedFrames].bullets.push(newObj);
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
      GameState.events[Constants.savedFrames].collisions.push({ asteroid: aster.id, ship: GameState.ships[i].id });
    }
    else if (bullet = GameState.bullets.find(bullet => overlap(bullet, GameState.ships[i]))) {
      GameState.ships[i].destroy();
      bullet.destroy();
      GameState.events[Constants.savedFrames].collisions.push({ bullet: bullet.id, ship: GameState.ships[i].id });
    }
  }
  for (let i = GameState.bullets.length - 1; i > -1; i--) {
    if (aster = GameState.asteroids.find(asteroid => overlap(asteroid, GameState.bullets[i]))) {
      GameState.bullets[i].destroy();
      aster.destroy();
      GameState.events[Constants.savedFrames].collisions.push({ asteroid: aster.id, bullet: GameState.bullets[i].id });
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
    const newShip = new Ship(Vector2D.createRandom(0, Constants.width, 0, Constants.height),
      Vector2D.create(0, 0), 60, 60, 0, data.bulletColor, data.wingColor, data.bodyColor, GameState);
      gameData.asteroids = GameState.asteroids;
      gameData.bullets = GameState.bullets;
      gameData.frameTimer = GameState.frameTimer + 1;
      gameData.id = newShip.id;
      responseObj.end(JSON.stringify(gameData, stringifyData));
      GameState.addObject(newShip);
  } else if (!data.type || data.type == "update") {
    let playerShip = GameState.ships.find(ship => ship.id == data.id);
    if (playerShip && data.key)
      playerShip.keys[data.key] = data.pressed;

    const eventObj = [];
    if(data.lastFrame) {
      for (let i = Math.max(Constants.savedFrames - GameState.frameTimer - data.lastFrame, 0); i < GameState.frameTimer - 1; i++) {
        eventObj.push(GameState.events[i]);
      }
    } else {
      eventObj.push(GameState.events[Constants.savedFrames - 1]);
    }
    responseObj.end(JSON.stringify(eventObj, stringifyData));
  }
}

function stringifyData(key, value) {
  if (key == "lines") {
    let returnArr = [];
    for (let i = value.length - 1; i > -1; i--) {
      returnArr.push(value[i].p1);
    }
    return returnArr;
  } else if (key == "gameInstance" || key == "splinterSteps" || key == "size") {
    return undefined;
  } else {
    return value;
  }
}