import { createLogger, transports, format } from "winston";
import "winston-mongodb";
import "express-async-errors";
import { connectionString } from "./mongo.js";
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

export const logger = createLogger({
    format: combine(label({ label: "HCC" }), timestamp(), myFormat),
    transports: [
        new transports.Console(),
        new transports.File({ filename: "logs/logfile.log" }),
        new transports.MongoDB({
            db: connectionString,
            options: {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            },
        }),
    ],
    exceptionHandlers: [
        new transports.Console({ colorize: true, prettyPrint: true }),
        new transports.File({ filename: "./logs/exceptions.log" }),
    ],
    rejectionHandlers: [
        new transports.Console({ colorize: true, prettyPrint: true }),
        new transports.File({ filename: "./logs/rejections.log" }),
    ],
});
