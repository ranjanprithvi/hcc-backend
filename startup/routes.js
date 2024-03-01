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

    app.use("/api/auth", auth);
    app.use("/api/profiles", profiles);
    app.use("/api/accounts", accounts);
    app.use("/api/appointments", appointments);
    app.use("/api/doctors", doctors);
    app.use("/api/hospitals", hospitals);
    app.use("/api/medicalRecords", medicalRecords);
    app.use("/api/externalRecords", externalRecords);
    app.use("/api/specializations", specializations);
    app.use("/api/medications", medications);
    app.use("/api/prescriptions", prescriptions);
    app.use("/api/externalPrescriptions", externalPrescriptions);

    app.use("/", (req, res) => {
        res.send("Welcome to HCC Backend..");
    });

    app.use(error);
}
