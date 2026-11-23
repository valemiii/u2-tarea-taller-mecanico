// API REST híbrida · Taller mecánico (PostgreSQL + MongoDB)
const express = require("express");
const routes = require("./routes");
const logger = require("./middlewares/logger");
const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(logger); // antes del parser: registra también los JSON inválidos
app.use(express.json());

app.get("/", (req, res) => res.json({ api: "Taller mecánico · PostgreSQL + MongoDB", estado: "ok" }));
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
