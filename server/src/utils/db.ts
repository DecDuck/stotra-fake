import mongoose from "mongoose";
mongoose.Promise = global.Promise;

require("dotenv").config();

// Read password from dotenv file
const password = process.env.STOTRA_MONGODB_PASSWORD;

const uri =
	process.env.STORA_MONGODB_URI ??
	"mongodb+srv://" +
		process.env.STOTRA_MONGODB_USERNAME +
		":" +
		password +
		"@" +
		process.env.STOTRA_MONGODB_CLUSTER +
		"/users?authMechanism=DEFAULT&retryWrites=true&w=majority";

mongoose.connect(uri);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));

db.once("open", () => {
	console.log("Connected to Database");
});

module.exports = db;
