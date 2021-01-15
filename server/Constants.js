const width = 2000;
const height = 1200;
const minAsteroids = 2;
const clientWidth = 1500;
const clientHeight = 800;
const powerupProbability = .01;
const maxPowerups = 15;
const powerupTime = 400;
const powerups = [
    "invincibility",
    "reflection",
    "triple shot",
    // "minify",
    "asteroid shot",
    "turbo shot"
]
const debug = false;

module.exports = {width, height, minAsteroids, clientWidth, clientHeight, powerupProbability, maxPowerups, powerups, powerupTime, debug}