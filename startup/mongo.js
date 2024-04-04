import mongoose from "mongoose";
import config from "config";
// import { logger } from "./logger.js";

export const connectionString = config.has("connectionString")
    ? config.get("connectionString") + config.get("name")
    : config.get("db") + config.get("name");
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
        .then(() => console.log(`Connected to ${connectionString}..`));
}
export const conn = mongoose.connection;
