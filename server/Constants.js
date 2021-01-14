const width = 2000;
const height = 1600;
const minAsteroids = 15;
const clientWidth = 1500;
const clientHeight = 800;
const powerupProbability = .001;
const maxPowerups = 5;
const powerupTime = 500;
const powerups = [
    "invincibility",
    "reflection",
    "turbo shot",
    "triple shot",
    "minify"
]
const debug = false;

module.exports = {width, height, minAsteroids, clientWidth, clientHeight, powerupProbability, maxPowerups, powerups, powerupTime, debug}