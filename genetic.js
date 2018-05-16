var Clone = function (obj) {
	if (obj == null || typeof obj != "object")
		return obj;

	return JSON.parse(JSON.stringify(obj));
};

var Optimize = {
	"Maximize": function (a, b) { return a >= b; }
	, "Minimize": function (a, b) { return a < b; }
};

var Select1 = {
	"Tournament2": function (pop) {
		var n = pop.length;
		var a = pop[Math.floor(Math.random() * n)];
		var b = pop[Math.floor(Math.random() * n)];
		return this.optimize(a.fitness, b.fitness) ? a.entity : b.entity;
	}, "Tournament3": function (pop) {
		var n = pop.length;
		var a = pop[Math.floor(Math.random() * n)];
		var b = pop[Math.floor(Math.random() * n)];
		var c = pop[Math.floor(Math.random() * n)];
		var best = this.optimize(a.fitness, b.fitness) ? a : b;
		best = this.optimize(best.fitness, c.fitness) ? best : c;
		return best.entity;
	}, "Fittest": function (pop) {
		return pop[0].entity;
	}, "Random": function (pop) {
		return pop[Math.floor(Math.random() * pop.length)].entity;
	}, "RandomLinearRank": function (pop) {
		this.internalGenState["rlr"] = this.internalGenState["rlr"] || 0;
		return pop[Math.floor(Math.random() * Math.min(pop.length, (this.internalGenState["rlr"]++)))].entity;
	}, "Sequential": function (pop) {
		this.internalGenState["seq"] = this.internalGenState["seq"] || 0;
		return pop[(this.internalGenState["seq"]++) % pop.length].entity;
	}
};

var Select2 = {
	"Tournament2": function (pop) {
		return [Select1.Tournament2.call(this, pop), Select1.Tournament2.call(this, pop)];
	}, "Tournament3": function (pop) {
		return [Select1.Tournament3.call(this, pop), Select1.Tournament3.call(this, pop)];
	}, "Random": function (pop) {
		return [Select1.Random.call(this, pop), Select1.Random.call(this, pop)];
	}, "RandomLinearRank": function (pop) {
		return [Select1.RandomLinearRank.call(this, pop), Select1.RandomLinearRank.call(this, pop)];
	}, "Sequential": function (pop) {
		return [Select1.Sequential.call(this, pop), Select1.Sequential.call(this, pop)];
	}, "FittestRandom": function (pop) {
		return [Select1.Fittest.call(this, pop), Select1.Random.call(this, pop)];
	}
};


class Genetic {

	constructor(logic) {
		this.configuration = {
			"size": 250
			, "crossover": 0.9
			, "mutation": 0.2
			, "iterations": 100
			, "fittestAlwaysSurvives": true
			, "maxResults": 100
			, "skip": 0
		};

		this.userData = {};
		this.internalGenState = {};

		this.entities = [];

		this.usingWebWorker = false;
		this.fitness = logic.fitness
		this.seed = logic.seed
		this.optimize = logic.optimize
		this.select1 = logic.select1
		this.select2 = logic.select2
		this.notification = logic.notification
		this.crossover = logic.crossover
		this.generation = logic.generation
		this.mutate = logic.mutate
	}

	_start() {
		var i;

		const mutateOrNot = (entity) => {
			// applies mutation based on mutation probability
			return Math.random() <= this.configuration.mutation && this.mutate ? this.mutate(Clone(entity)) : entity;
		}

		// seed the population
		for (i = 0; i < this.configuration.size; ++i) {
			this.entities.push(Clone(this.seed()));
		}

		for (i = 0; i < this.configuration.iterations; ++i) {
			// reset for each generation
			this.internalGenState = {};

			// score and sort
			var pop = this.entities.map(entity => {
					return { "fitness": this.fitness(entity), "entity": entity };
				})
				.sort((a, b) => {
					return this.optimize(a.fitness, b.fitness) ? -1 : 1;
				});

			// generation notification
			var mean = pop.reduce(function (a, b) { return a + b.fitness; }, 0) / pop.length;
			var stdev = Math.sqrt(pop
				.map(function (a) { return (a.fitness - mean) * (a.fitness - mean); })
				.reduce(function (a, b) { return a + b; }, 0) / pop.length);

			var stats = {
				"maximum": pop[0].fitness
				, "minimum": pop[pop.length - 1].fitness
				, "mean": mean
				, "stdev": stdev
			};

			var r = this.generation ? this.generation(pop, i, stats) : true;
			var isFinished = (typeof r != "undefined" && !r) || (i == this.configuration.iterations - 1);

			if (
				this.notification
				&& (isFinished || this.configuration["skip"] == 0 || i % this.configuration["skip"] == 0)
			) {
				this._sendNotification(pop.slice(0, this.maxResults), i, stats, isFinished);
			}

			if (isFinished)
				break;

			// crossover and mutate
			var newPop = [];

			if (this.configuration.fittestAlwaysSurvives) // lets the best solution fall through
				newPop.push(pop[0].entity);

			while (newPop.length < this.configuration.size) {
				if (
					this.crossover // if there is a crossover function
					&& Math.random() <= this.configuration.crossover // base crossover on specified probability
					&& newPop.length + 1 < this.configuration.size // keeps us from going 1 over the max population size
				) {
					var parents = this.select2(pop);
					var children = this.crossover(Clone(parents[0]), Clone(parents[1])).map(mutateOrNot);
					newPop.push(children[0], children[1]);
				} else {
					newPop.push(mutateOrNot(this.select1(pop)));
				}
			}

			this.entities = newPop;
		}
	}

	_sendNotification(pop, generation, stats, isFinished) {
		var response = {
			"pop": pop
			, "generation": generation
			, "stats": stats
			, "isFinished": isFinished
		};
		this.notification(response.pop, response.generation, response.stats, response.isFinished);

	};

	evolve(config, userData) {
		var k;
		for (k in config) {
			this.configuration[k] = config[k];
		}

		for (k in userData) {
			this.userData[k] = userData[k];
		}

		this._start();
	}
};


module.exports = {
	create: (logic) => new Genetic(logic),
	Optimize,
	Select1,
	Select2
};
