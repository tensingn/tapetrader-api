const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

// var corsOptions = {
//     origin: 'somewebsite',
//     optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
//   }

app.use(cors());
app.options("*", cors());

const json2html = require("json-to-html");

const { Datastore } = require("@google-cloud/datastore");

const bodyParser = require("body-parser");
const request = require("request");

const datastore = new Datastore();

const jwt = require("express-jwt");
const jwksRsa = require("jwks-rsa");

const MERCH = "merch";
const USERS = "users";
const BANDS = "bands";

//const router = express.Router();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const DOMAIN = process.env.DOMAIN;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function fromDatastore(item) {
	item.id = item[Datastore.KEY].id;
	return item;
}

const checkJwt = jwt({
	secret: jwksRsa.expressJwtSecret({
		cache: true,
		rateLimit: true,
		jwksRequestsPerMinute: 5,
		jwksUri: `https://${DOMAIN}/.well-known/jwks.json`,
	}),

	// Validate the audience and the issuer.
	issuer: `https://${DOMAIN}/`,
	algorithms: ["RS256"],
});

//MERCH HELPER FUNCTIONS

function post_merch(description, type, condition, user, imageURL, band) {
	var key = datastore.key(MERCH);
	const new_merch = {
		description: description,
		type: type,
		condition: condition,
		band: band,
		user: user,
		imageURL: imageURL,
	};
	return datastore.save({ key: key, data: new_merch }).then(() => {
		return key;
	});
}

function get_merch(id) {
	const key = datastore.key([MERCH, parseInt(id, 10)]);
	return datastore.get(key);
}

function get_all_merch(req, paginate) {
	if (paginate) {
		var q = datastore.createQuery(MERCH).limit(9);
		var results = {};
		if (Object.keys(req.query).includes("cursor")) {
			q = q.start(req.query.cursor);
		}
		return datastore.runQuery(q).then((entities) => {
			results.items = entities[0]
				.map(fromDatastore)
				.filter((item) => item.user === req.user.name);
			if (entities[1].moreResults !== Datastore.NO_MORE_RESULTS) {
				results.next =
					req.protocol +
					"://" +
					req.get("host") +
					"/merch" +
					"?cursor=" +
					entities[1].endCursor;
			}
			return results;
		});
	} else {
		var q = datastore.createQuery(MERCH);
		return datastore.runQuery(q).then((entities) => {
			return entities[0]
				.map(fromDatastore)
				.filer((item) => item.user === req.user.name);
		});
	}
}

function get_all_merch_all_users(req, paginate) {
	if (paginate) {
		var q = datastore.createQuery(MERCH).limit(9);
		var results = {};
		if (Object.keys(req.query).includes("cursor")) {
			q = q.start(req.query.cursor);
		}
		return datastore.runQuery(q).then((entities) => {
			results.items = entities[0].map(fromDatastore);
			if (entities[1].moreResults !== Datastore.NO_MORE_RESULTS) {
				results.next =
					req.protocol +
					"://" +
					req.get("host") +
					"/merch" +
					"?cursor=" +
					entities[1].endCursor;
			}
			return results;
		});
	} else {
		var q = datastore.createQuery(MERCH);
		return datastore.runQuery(q).then((entities) => {
			return entities[0].map(fromDatastore);
		});
	}
}

function patch_merch(id, description, type, condition, band, user, imageURL) {
	var key = datastore.key([MERCH, parseInt(id, 10)]);
	const merch = {
		description: description,
		type: type,
		condition: condition,
		band: band,
		user: user,
		imageURL: imageURL,
	};
	return datastore.save({ key: key, data: merch }).then(() => {
		return key;
	});
}

function delete_merch(id) {
	const key = datastore.key([MERCH, parseInt(id, 10)]);
	return datastore.delete(key);
}

//BAND HELPER FUNCTIONS

function post_band(name, genre, country, imageURL) {
	var key = datastore.key(BANDS);
	const new_band = {
		name: name,
		genre: genre,
		country: country,
		merch: [],
		imageURL,
	};
	return datastore.save({ key: key, data: new_band }).then(() => {
		return key;
	});
}

function get_band(id) {
	const key = datastore.key([BANDS, parseInt(id, 10)]);
	return datastore.get(key);
}

function get_all_bands(req, paginate) {
	if (paginate) {
		var q = datastore.createQuery(BANDS).limit(9);
		var results = {};
		if (Object.keys(req.query).includes("cursor")) {
			q = q.start(req.query.cursor);
		}
		return datastore.runQuery(q).then((entities) => {
			results.items = entities[0].map(fromDatastore);
			if (entities[1].moreResults !== Datastore.NO_MORE_RESULTS) {
				results.next =
					req.protocol +
					"://" +
					req.get("host") +
					"/bands" +
					"?cursor=" +
					entities[1].endCursor;
			}
			return results;
		});
	} else {
		var q = datastore.createQuery(BANDS);
		return datastore.runQuery(q).then((entities) => {
			return entities[0].map(fromDatastore);
		});
	}
}

function patch_band(id, name, genre, country, merch, imageURL) {
	const key = datastore.key([BANDS, parseInt(id, 10)]);
	const band = {
		name: name,
		genre: genre,
		country: country,
		merch: merch,
		imageURL: imageURL,
	};
	return datastore.save({ key: key, data: band });
}

function delete_band(id) {
	const key = datastore.key([BANDS, parseInt(id, 10)]);
	return datastore.delete(key);
}

//USER HELPER FUNCTIONS

function post_users(id, email) {
	var key = datastore.key(USERS);
	const new_user = { userid: id, email: email };
	return datastore.save({ key: key, data: new_user }).then(() => {
		return key;
	});
}

function get_all_users() {
	const q = datastore.createQuery(USERS);
	return datastore.runQuery(q).then((entities) => {
		return entities[0].map(fromDatastore);
	});
}

function get_user(id) {
	const key = datastore.key([USERS, parseInt(id, 10)]);
	return datastore.get(key);
}

/* ------------- Begin Route Functions ------------- */

app.get(
	"/merch/all",
	checkJwt.unless({
		method: function (req) {
			return false;
		},
	}),
	function (req, res) {
		const merch = get_all_merch_all_users(req, true).then((merch) => {
			merch.items.forEach((items) => {
				items["self"] =
					req.protocol + "://" + req.get("host") + "/merch/" + items["id"];
			});
			res.status(200).json({ merch: merch.items });
		});
	}
);
//MERCH ROUTES
app.get("/merch", checkJwt, function (req, res) {
	const bands = get_all_bands(req, false).then((bands) => {
		const merch = get_all_merch(req, true).then((merch) => {
			merch.items.forEach((items) => {
				items["self"] =
					req.protocol + "://" + req.get("host") + "/merch/" + items["id"];
			});
			res.status(200).json({ merch: merch.items, bands });
		});
	});
});

app.get("/merch/:id", checkJwt, function (req, res) {
	const merch = get_merch(req.params.id).then((merch) => {
		const accepts = req.accepts(["application/json", "text/html"]);

		if (!merch[0]) {
			res.status(404).send({ Error: "No merch item with this ID exists." });
		} else if (merch[0].user && merch[0].user !== req.user.name) {
			res.status(403).send({
				Error: "Forbidden. You do not have access to this merch item.",
			});
		} else if (!accepts) {
			res.status(406).send({ Error: "Not Acceptable." });
		} else if (accepts === "application/json") {
			merch[0]["self"] =
				req.protocol + "://" + req.get("host") + req.originalUrl;
			merch[0]["id"] = req.params.id.toString(10);
			res.status(200).json(merch[0]);
		}
	});
});

app.post("/merch", checkJwt, function (req, res) {
	if (req.get("content-type") !== "application/json") {
		res
			.status(415)
			.send({ Error: "Server only accepts application/json data." });
	}

	if (req.body.description === null) {
		res
			.status(400)
			.send({ Error: "The request object is missing a required attribute." });
		return;
	}

	// get band
	if (req.body.band) {
		get_band(req.body.band).then((band) => {
			band[0]["id"] = req.body.band;
			// create merch
			post_merch(
				req.body.description,
				req.body.type,
				req.body.condition,
				req.user.name,
				req.body.imageURL,
				band[0]
			).then((key) => {
				band[0]["merch"].push({
					id: key.id,
					self: req.protocol + "://" + req.get("host") + "/merch/" + key.id,
				});
				patch_band(
					req.body.band,
					band[0].name,
					band[0].genre,
					band[0].country,
					band[0].merch,
					band[0].imageURL
				).then(() => {
					const merch = get_merch(key.id).then((merch) => {
						merch[0]["self"] =
							req.protocol +
							"://" +
							req.get("host") +
							req.originalUrl +
							"/" +
							key.id;
						merch[0]["id"] = key.id.toString(10);
						res.status(201).send(merch[0]);
					});
				});
			});
		});
	} else {
		// create merch
		post_merch(
			req.body.description,
			req.body.type,
			req.body.condition,
			req.user.name,
			req.body.imageURL,
			null
		).then((key) => {
			const merch = get_merch(key.id).then((merch) => {
				merch[0]["self"] =
					req.protocol +
					"://" +
					req.get("host") +
					req.originalUrl +
					"/" +
					key.id;
				merch[0]["id"] = key.id.toString(10);
				res.status(201).send(merch[0]);
			});
		});
	}
});

app.patch("/merch/:id", checkJwt, function (req, res) {
	//get merch that was requested first
	const prevmerch = get_merch(req.params.id).then((prevmerch) => {
		//send 404 if requested merch does not exist
		if (typeof prevmerch[0] === "undefined") {
			res.status(404).send({ Error: "No merch item with this ID exists." });
			return;
		} else if (prevmerch[0].user && prevmerch[0].user !== req.user.name) {
			res.status(403).send({
				Error: "Forbidden. You do not have access to this merch item.",
			});
		} else {
			//if trying to change id
			if (req.body.id) {
				res.status(400).send({ Error: "Cannot change id" });
				return;
			}

			patch_merch(
				req.params.id,
				req.body.description || prevmerch[0].description,
				req.body.type || prevmerch[0].type,
				req.body.condition || prevmerch[0].condition,
				req.body.band || prevmerch[0].band,
				prevmerch[0].user,
				req.body.imageURL || prevmerch[0].imageURL
			).then(() => {
				//get newly updated merch to send back to client
				const merch = get_merch(req.params.id).then((merch) => {
					merch[0]["self"] =
						req.protocol + "://" + req.get("host") + req.originalUrl;
					merch[0]["id"] = req.params.id.toString(10);

					res.status(200).send(merch[0]);
					return;
				});
			});
		}
	});
});

app.put("/merch/:id", checkJwt, function (req, res) {
	//get merch that was requested first
	const prevmerch = get_merch(req.params.id).then((prevmerch) => {
		//send 404 if requested merch does not exist
		if (typeof prevmerch[0] === "undefined") {
			res.status(404).send({ Error: "No merch item with this ID exists." });
			return;
		} else if (prevmerch[0].user !== req.user.name) {
			res.status(403).send({
				Error: "Forbidden. You do not have access to this merch item.",
			});
		} else {
			//if trying to change id
			if (req.body.id) {
				res.status(400).send({ Error: "Cannot change id" });
				return;
			}

			delete_merch(req.params.id).then(() => {
				post_merch(
					req.body.description,
					req.body.type,
					req.body.condition,
					req.user.name
				).then((key) => {
					//get newly updated merch to send back to client
					const merch = get_merch(key.id).then((merch) => {
						merch[0]["self"] =
							req.protocol + "://" + req.get("host") + "/merch/" + key.id;
						merch[0]["id"] = key.id;

						res.status(200).send(merch[0]);
						return;
					});
				});
			});
		}
	});
});

app.delete("/merch/:id", checkJwt, function (req, res) {
	//check accept type
	if (req.get("Accept") !== "application/json" && req.get("Accept") !== "*/*") {
		res
			.status(406)
			.send({ Error: "Content type not supported by the endpoint" });
		return;
	}

	const merch = get_merch(req.params.id).then((merch) => {
		if (typeof merch[0] !== "undefined") {
			if (merch[0].user !== req.user.name) {
				res.status(403).send({
					Error: "Forbidden. You do not have access to this merch item.",
				});
			} else {
				if (merch[0].band !== null) {
					get_band(merch[0].band.id).then((band) => {
						//console.log(band[0].merch);
						for (var i = 0; i < band[0].merch.length; i++) {
							if (band[0].merch[i].id === req.params.id) {
								delete band[0].merch[i];
							}
						}
						patch_band(
							merch[0].band.id,
							band[0].name,
							band[0].genre,
							band[0].country,
							band[0].merch,
							band[0].imageURL
						).then(() => {
							delete_merch(req.params.id).then(res.status(204).end());
							return;
						});
					});
				} else {
					delete_merch(req.params.id).then(res.status(204).end());
					return;
				}
			}
		} else {
			res.status(404).send({ Error: "No merch item with this ID exists." });
		}
	});
});

app.put("/merch/:merch_id/bands/:band_id", checkJwt, function (req, res) {
	//get merch that was requested
	const prevmerch = get_merch(req.params.merch_id).then((prevmerch) => {
		//send 404 and return if requested merch does not exist
		if (typeof prevmerch[0] === "undefined") {
			res.status(404).send({ Error: "No merch item with this ID exists." });
			return;
		}

		//get requested band
		const reqband = get_band(req.params.band_id).then((reqband) => {
			//send 404 and return if band does not exist
			if (typeof reqband[0] === "undefined") {
				res.status(404).send({ Error: "No band with this ID exists." });
				return;
			}

			if (prevmerch[0].band !== null) {
				res.status(403).send({
					Error:
						"Forbidden. This merch item is already associated with a band.",
				});
			}

			if (prevmerch[0].user !== req.user.name) {
				res.status(403).send({
					Error: "Forbidden. You do not have access to this merch item.",
				});
				return;
			}

			//console.log(req.params.merch_id);
			//(id, description, type, condition, band, user){
			patch_merch(
				req.params.merch_id,
				req.body.description,
				req.body.type,
				req.body.condition,
				{
					id: req.params.band_id,
					name: reqband[0]["name"],
					self:
						req.protocol +
						"://" +
						req.get("host") +
						"/bands/" +
						req.params.band_id,
				},
				req.user.name,
				req.body.imageURL
			).then(() => {
				reqband[0]["merch"].push({
					id: req.params.merch_id,
					self:
						req.protocol +
						"://" +
						req.get("host") +
						"/merch/" +
						req.params.merch_id,
				});

				patch_band(
					req.params.band_id,
					reqband[0]["name"],
					reqband[0]["genre"],
					reqband[0]["country"],
					reqband[0]["merch"],
					reqband[0]["imageURL"]
				).then(() => {
					res.status(204).end();
					return;
				});
			});
		});
	});
});

app.delete("/merch/:merch_id/bands/:band_id", checkJwt, function (req, res) {
	//get merch that was requested
	const prevmerch = get_merch(req.params.merch_id).then((prevmerch) => {
		//send 404 and return if requested merch does not exist
		if (typeof prevmerch[0] === "undefined") {
			res.status(404).send({ Error: "No merch item with this ID exists." });
			return;
		}

		//get requested band
		const reqband = get_band(req.params.band_id).then((reqband) => {
			//send 404 and return if band does not exist
			if (typeof reqband[0] === "undefined") {
				res.status(404).send({ Error: "No band with this ID exists." });
				return;
			}

			if (prevmerch[0].user !== req.user.name) {
				res.status(403).send({
					Error: "Forbidden. You do not have access to this merch item.",
				});
				return;
			}

			//console.log(req.params.merch_id);
			//(id, description, type, condition, band, user){
			patch_merch(
				req.params.merch_id,
				prevmerch[0].description,
				prevmerch[0].type,
				prevmerch[0].condition,
				null,
				req.user.name,
				prevmerch[0].imageURL
			).then(() => {
				// reqband[0]["merch"].push({
				//     "id": req.params.merch_id,
				//     "self": req.protocol + '://'  + req.get('host') + '/merch/' + req.params.merch_id}
				// );
				for (var i = 0; i < reqband[0]["merch"].length; i++) {
					if (reqband[0]["merch"][i]["id"] === req.params.merch_id) {
						delete reqband[0]["merch"][i];
					}
				}

				patch_band(
					req.params.band_id,
					reqband[0]["name"],
					reqband[0]["genre"],
					reqband[0]["country"],
					reqband[0]["merch"]
				).then(() => {
					res.status(204).end();
					return;
				});
			});
		});
	});
});

//BAND ROUTES

app.post("/bands", function (req, res) {
	if (req.get("content-type") !== "application/json") {
		res
			.status(415)
			.send({ Error: "Server only accepts application/json data." });
	}

	if (req.body.name === null) {
		res
			.status(400)
			.send({ Error: "The request object is missing a required attribute." });
		return;
	}

	post_band(
		req.body.name,
		req.body.genre,
		req.body.country,
		req.body.imageURL
	).then((key) => {
		const band = get_band(key.id).then((band) => {
			band[0]["self"] =
				req.protocol + "://" + req.get("host") + req.originalUrl + "/" + key.id;
			band[0]["id"] = key.id.toString(10);
			res.status(201).send(band[0]);
		});
	});
});

app.get("/bands/:id", function (req, res) {
	const band = get_band(req.params.id).then((band) => {
		if (!band[0]) {
			res.status(404).send({ Error: "No band with this ID exists." });
		} else {
			band[0]["self"] =
				req.protocol + "://" + req.get("host") + req.originalUrl;
			band[0]["id"] = req.params.id.toString(10);
			res.status(200).send(band[0]);
		}
	});
});

app.get("/bands", function (req, res) {
	const merch = get_all_bands(req, true).then((bands) => {
		bands.items.forEach((items) => {
			items["self"] =
				req.protocol + "://" + req.get("host") + "/bands/" + items["id"];
		});
		res.status(200).json(bands.items);
	});
});

app.patch("/bands/:id", function (req, res) {
	//get band that was requested first
	const prevband = get_band(req.params.id).then((prevband) => {
		//send 404 if requested band does not exist
		if (typeof prevband[0] === "undefined") {
			res.status(404).send({ Error: "No band with this band_id exists." });
			return;
		}

		//if trying to change id
		if (req.body.id) {
			res.status(400).send({ Error: "Cannot change id" });
			return;
		}

		patch_band(
			req.params.id,
			req.body.name || prevband[0].name,
			req.body.genre || prevband[0].genre,
			req.body.country || prevband[0].country,
			prevband[0].merch,
			req.body.imageURL || prevband[0].imageURL
		).then(() => {
			//get newly updated band to send back to client
			const band = get_band(req.params.id).then((band) => {
				band[0]["self"] =
					req.protocol + "://" + req.get("host") + req.originalUrl;
				band[0]["id"] = req.params.id.toString(10);

				res.status(200).send(band[0]);
				return;
			});
		});
	});
});

app.put("/bands/:id", function (req, res) {
	//get band that was requested first
	const prevband = get_band(req.params.id).then((prevband) => {
		//send 404 if requested band does not exist
		if (typeof prevband[0] === "undefined") {
			res.status(404).send({ Error: "No band with this band_id exists." });
			return;
		}

		//if trying to change id
		if (req.body.id) {
			res.status(400).send({ Error: "Cannot change id" });
			return;
		}

		delete_band(req.params.id).then(() => {
			post_band(req.body.name, req.body.genre, req.body.country).then((key) => {
				//get newly updated band to send back to client
				const band = get_band(key.id).then((band) => {
					band[0]["self"] =
						req.protocol + "://" + req.get("host") + "/bands/" + key.id;
					band[0]["id"] = key.id;
					res.status(200).send(band[0]);
					return;
				});
			});
		});
	});
});

app.delete("/bands/:id", function (req, res) {
	//check accept type
	if (req.get("Accept") !== "application/json" && req.get("Accept") !== "*/*") {
		res
			.status(406)
			.send({ Error: "Content type not supported by the endpoint" });
		return;
	}
	const band = get_band(req.params.id).then((band) => {
		if (typeof band[0] !== "undefined") {
			for (var i = 0; i < band[0].merch.length; i++) {
				//function patch_merch(id, description, type, condition, band, user){
				var id = band[0].merch[i].id;
				get_merch(id).then((merch) => {
					patch_merch(
						id,
						merch[0].description,
						merch[0].type,
						merch[0].condition,
						null,
						merch[0].user,
						merch[0].imageURL
					).then(() => {});
				});
			}

			delete_band(req.params.id).then(res.status(204).end());
			return;
		} else {
			console.log(band);
			res.status(404).send({ Error: "No band with this ID exists." });
		}
	});
});

//USER ROUTES

app.get("/users", function (req, res) {
	const users = get_all_users().then((users) => {
		res.status(200).json(users);
	});
});

app.post("/users", function (req, res) {
	const username = req.body.username;
	const password = req.body.password;
	var options = {
		method: "POST",
		url: `https://${DOMAIN}/dbconnections/signup`,
		body: {
			client_id: CLIENT_ID,
			email: username,
			password: password,
			connection: "Username-Password-Authentication",
		},
		json: true,
	};

	request(options, (error, response, body) => {
		if (error) {
			res.status(500).send(error);
		} else {
			post_users(body._id, body.email).then((key) => {
				const user = get_user(key.id).then((user) => {
					user[0]["self"] =
						req.protocol +
						"://" +
						req.get("host") +
						req.originalUrl +
						"/" +
						key.id;
					user[0]["id"] = key.id.toString(10);
					res.status(201).send(user[0]);
				});
			});
		}
	});
});

app.delete("/users/:id", function (req, res) {
	res.set("Accept", "GET, POST");
	res.status(405).end();
});

//LOGIN ROUTES

app.get("/login", function (req, res) {
	res.render("root.ejs");
});

app.post("/login", function (req, res) {
	const username = req.body.username;
	const password = req.body.password;
	var options = {
		method: "POST",
		url: `https://${DOMAIN}/oauth/token`,
		headers: { "content-type": "application/json" },
		body: {
			grant_type: "password",
			username: username,
			password: password,
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
		},
		json: true,
	};

	request(options, (error, response, body) => {
		if (error) {
			res.status(500).send(error);
		} else {
			res.send(body);
		}
	});
});

app.get("/login/registration", function (req, res) {
	res.render("register.ejs");
});

app.get("/authorized", checkJwt, function (req, res) {
	res.send("Secured Dog");
});

app.use(function (err, req, res, next) {
	console.log(err);
	//console.log(err);
	res.status(401).send({ Error: "Invalid Token." });
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
	console.log(`Server listening on port ${PORT}...`);
});
