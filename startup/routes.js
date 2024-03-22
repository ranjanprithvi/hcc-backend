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

export default function initialiseRoutes(app) {
    app.use(cors());
    app.use(express.json());
    //  app.use(express.urlencoded({ extended: true })); //When extended is true, we can pass arrays and objects in the url.
    app.use(express.static("public")); // All resources inside public folder can be served
    app.use(helmet());

    logger.info("Morgan enabled");
    app.use(morgan("tiny"));

    app.use("/hcc/api/auth", auth);
    app.use("/hcc/api/profiles", profiles);
    app.use("/hcc/api/accounts", accounts);
    app.use("/hcc/api/appointments", appointments);
    app.use("/hcc/api/doctors", doctors);
    app.use("/hcc/api/hospitals", hospitals);
    app.use("/hcc/api/medicalRecords", medicalRecords);
    app.use("/hcc/api/externalRecords", externalRecords);
    app.use("/hcc/api/specializations", specializations);
    app.use("/hcc/api/medications", medications);
    app.use("/hcc/api/prescriptions", prescriptions);
    app.use("/hcc/api/externalPrescriptions", externalPrescriptions);

    app.use("/", (req, res) => {
        res.send("Welcome to HCC Backend..");
    });

    app.use(error);
}
