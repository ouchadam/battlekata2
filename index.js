const Genetic = require('./genetic')

const randomString = (len) => {
    var text = "";
    var charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < len; i++)
        text += charset.charAt(Math.floor(Math.random() * charset.length));

    return text;
}

const replaceAt = (str, index, character) => {
    return str.substr(0, index) + character + str.substr(index + character.length);
}

const seed = () => {
    return randomString(userData["solution"].length);
};

const mutate = entity => {
    // chromosomal drift
    var i = Math.floor(Math.random() * entity.length)
    return replaceAt(entity, i, String.fromCharCode(entity.charCodeAt(i) + (Math.floor(Math.random() * 2) ? 1 : -1)));
};
const crossover = function (mother, father) {
    // two-point crossover
    var len = mother.length;
    var ca = Math.floor(Math.random() * len);
    var cb = Math.floor(Math.random() * len);
    if (ca > cb) {
        var tmp = cb;
        cb = ca;
        ca = tmp;
    }

    var son = father.substr(0, ca) + mother.substr(ca, cb - ca) + father.substr(cb);
    var daughter = mother.substr(0, ca) + father.substr(ca, cb - ca) + mother.substr(cb);

    return [son, daughter];
};

const fitness = entity => {
    const solution = userData.solution
    const fitness = Array.from(entity).reduce((accumulator, current, index) => {
        if (current === solution[index]) {
            accumulator += 1
        }
        accumulator += (127 - Math.abs(current.charCodeAt(0) - solution.charCodeAt(index))) / 50;        
        return accumulator
    }, 0)
    return fitness;
};

const generation = function (pop, generation, stats) {
    // stop running once we've reached the solution
    return pop[0].entity != this.userData["solution"];
};

const notification = function (pop, generation, stats, isFinished) {
    var value = pop[0].entity;
    this.last = this.last || value;

    if (pop != 0 && value == this.last) {
        return;
    }

    console.log(`${generation} ${pop[0].fitness.toPrecision(5)} ${value}`)

    this.last = value;
};

var config = {
    "iterations": 4000
    , "size": 250
    , "crossover": 0.3
    , "mutation": 0.3
    , "skip": 20
};
var userData = {
    "solution": 'Hello World'
};

var genetic = Genetic.create({
    seed,
    fitness,
    optimize: Genetic.Optimize.Maximize,
    select1: Genetic.Select1.Tournament2,
    select2: Genetic.Select2.Tournament2,
    notification,
    generation,
    crossover,
    mutate
});


genetic.evolve(config, userData);
