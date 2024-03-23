import express from "express";
import checkConfigVariables from "./startup/config.js";
import { logger } from "./startup/logger.js";
import initialiseDb from "./startup/mongo.js";
import initialiseRoutes from "./startup/routes.js";

import https from "https";
// import fs from "fs";

const app = express();

initialiseDb();
initialiseRoutes(app);
checkConfigVariables();

const port = process.env.PORT || 3001;
const server = app.listen(port, () =>
    logger.info(`Listening on port ${port}..`)
);

// https.createServer(app).listen(4430, () => {
//     logger.info("Listening to HTTPS requests on port 4430...");
// });

export default server;
