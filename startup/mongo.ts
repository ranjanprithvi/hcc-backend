import mongoose from "mongoose";
import config from "config";
// import { logger } from "./logger.js";

export const connectionString = config.has("connectionString")
    ? config.get<string>("connectionString") + config.get<string>("name")
    : config.get<string>("db") + config.get<string>("name");
// export const connectionString =
//     "mongodb+srv://ranjanprithvi:" +
//     config.get("MongoPassword") +
//     "@cluster0.xzedlix.mongodb.net/?retryWrites=true&w=majority";

export default function initialiseDb() {
    mongoose.set("strictQuery", false);
    mongoose
        .connect(connectionString)
        .then(() => console.log(`Connected to ${connectionString}..`))
        .catch((err) => console.log(err));
}
export const conn = mongoose.connection;
