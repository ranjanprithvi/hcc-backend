import { error } from "../middleware/error.js";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { logger } from "./logger.js";
import cors from "cors";
import purposes from "../routes/purposesRoutes.js";
import patients from "../routes/patientsRoutes.js";
import auth from "../routes/authRoutes.js";
import accounts from "../routes/accountsRoutes.js";
import appointments from "../routes/appointmentsRoutes.js";
import recordTypes from "../routes/recordTypesRoutes.js";
import fields from "../routes/fieldsRoutes.js";
import medications from "../routes/medicationsRoutes.js";
import prescriptions from "../routes/prescriptionsRoutes.js";
import medicalRecords from "../routes/medicalRecordsRoutes.js";

export default function initialiseRoutes(app) {
    app.use(cors());
    app.use(express.json());
    //  app.use(express.urlencoded({ extended: true })); //When extended is true, we can pass arrays and objects in the url.
    app.use(express.static("public")); // All resources inside public folder can be served
    app.use(helmet());

    logger.info("Morgan enabled");
    app.use(morgan("tiny"));

    app.use("/api/auth", auth);
    app.use("/api/patients", patients);
    app.use("/api/accounts", accounts);
    app.use("/api/appointments", appointments);
    app.use("/api/purposes", purposes);
    app.use("/api/medicalRecords", medicalRecords);
    app.use("/api/recordTypes", recordTypes);
    app.use("/api/fields", fields);
    app.use("/api/medications", medications);
    app.use("/api/prescriptions", prescriptions);

    app.use(error);
}
