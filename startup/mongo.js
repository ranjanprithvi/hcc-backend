import mongoose from "mongoose";
import config from "config";
import { logger } from "./logger.js";

export const connectionString = config.get("db");
// export const connectionString =
//     "mongodb+srv://ranjanprithvi:" +
//     config.get("MongoPassword") +
//     "@cluster0.xzedlix.mongodb.net/?retryWrites=true&w=majority";

export default function initialiseDb() {
    mongoose
        .connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        .then(() => logger.info(`Connected to ${connectionString}..`));
}
export const conn = mongoose.connection;
