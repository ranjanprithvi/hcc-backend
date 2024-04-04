import { error } from "../middleware/error.js";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { logger } from "./logger.js";
import cors from "cors";
import hospitals from "../routes/hospitals-routes.js";
import doctors from "../routes/doctors-routes.js";
import profiles from "../routes/profiles-routes.js";
import auth from "../routes/auth-routes.js";
import accounts from "../routes/accounts-routes.js";
import appointments from "../routes/appointments-routes.js";
import specializations from "../routes/specializations-routes.js";
import medications from "../routes/medications-routes.js";
import prescriptions from "../routes/prescriptions-routes.js";
import externalPrescriptions from "../routes/external-prescriptions-routes.js";
import medicalRecords from "../routes/medical-records-routes.js";
import externalRecords from "../routes/external-records-routes.js";
import config from "config";

export default function initialiseRoutes(app) {
    app.use(cors());
    app.use(express.json());
    //  app.use(express.urlencoded({ extended: true })); //When extended is true, we can pass arrays and objects in the url.
    app.use(express.static("public")); // All resources inside public folder can be served
    app.use(helmet());

    console.log("Morgan enabled");
    app.use(
        morgan(
            ":date[iso] - :method :url :status :res[content-length] - :response-time ms"
        )
    );
    // app.use(morgan("tiny"));

    app.use(`/${config.get("name")}/api/auth`, auth);
    app.use(`/${config.get("name")}/api/profiles`, profiles);
    app.use(`/${config.get("name")}/api/accounts`, accounts);
    app.use(`/${config.get("name")}/api/appointments`, appointments);
    app.use(`/${config.get("name")}/api/doctors`, doctors);
    app.use(`/${config.get("name")}/api/hospitals`, hospitals);
    app.use(`/${config.get("name")}/api/medicalRecords`, medicalRecords);
    app.use(`/${config.get("name")}/api/externalRecords`, externalRecords);
    app.use(`/${config.get("name")}/api/specializations`, specializations);
    app.use(`/${config.get("name")}/api/medications`, medications);
    app.use(`/${config.get("name")}/api/prescriptions`, prescriptions);
    app.use(
        `/${config.get("name")}/api/externalPrescriptions`,
        externalPrescriptions
    );

    app.use("/", (req, res) => {
        res.send("Welcome to HCC Backend..");
    });

    app.use(error);
}
