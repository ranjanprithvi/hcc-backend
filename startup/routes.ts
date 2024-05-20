import { error } from "../middleware/error";
import express, { Express, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import hospitals from "../routes/hospitals-routes";
import doctors from "../routes/doctors-routes";
import profiles from "../routes/profiles-routes";
import auth from "../routes/auth-routes";
import accounts from "../routes/accounts-routes";
import appointments from "../routes/appointments-routes";
import specializations from "../routes/specializations-routes";
import medications from "../routes/medications-routes";
import prescriptions from "../routes/prescriptions-routes";
import externalPrescriptions from "../routes/external-prescriptions-routes";
import medicalRecords from "../routes/medical-records-routes";
import externalRecords from "../routes/external-records-routes";
import config from "config";

export default function initialiseRoutes(app: Express) {
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

    app.use("/", (req: Request, res: Response) => {
        res.send("Welcome to HCC Backend..");
    });

    app.use(error);
}
