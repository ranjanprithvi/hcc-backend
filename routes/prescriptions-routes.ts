import express, { Request, Response } from "express";
import _ from "lodash";
import { auth } from "../middleware/auth.js";
import { checkAccess } from "../middleware/check-access.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validate-object-id.js";
import { Profile } from "../models/profile-model.js";
import { Roles } from "../models/account-model.js";
import {
    Prescription,
    prescriptionSchema,
    prescriptionSchemaObject,
} from "../models/prescription-model.js";
import { Doctor } from "../models/doctor-model.js";
import { hospital } from "../middleware/hospital.js";
const router = express.Router();

router.get("/", auth, async (req: Request, res: Response) => {
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|eq|ne)\b/g,
        (match) => `$${match}`
    );
    const query = JSON.parse(queryStr);

    if (req.account.accessLevel != Roles.Admin) {
        if (!query.profile)
            return res.status(400).send("Please provide profileId");

        const profile = await Profile.findById(query.profile);
        if (!profile) return res.status(400).send("Invalid Profile Id");

        if (req.account.accessLevel == Roles.User)
            if (profile.account != req.account._id) {
                return res.status(403).send("Access Denied");
            }
        // query.profile = query.profileId;
        // delete query.profileId;
    }

    const prescriptions = await Prescription.find(query);
    res.send(prescriptions);
});

router.get(
    "/:id",
    [
        validateObjectId,
        auth,
        checkAccess(
            [Roles.Admin, Roles.Hospital],
            "_id",
            Prescription,
            "profile.account",
            "profile"
        ),
    ],
    async (req: Request, res: Response) => {
        const prescription = await Prescription.findById(
            req.params.id
        ).populate([{ path: "profile", populate: "account" }]);
        res.send(prescription);
    }
);

router.post(
    "/",
    [auth, hospital, validateBody(prescriptionSchemaObject)],
    async (req: Request, res: Response) => {
        const profile = await Profile.findById(req.body.profile);
        if (!profile) return res.status(400).send("Invalid ProfileId");

        const doctor = await Doctor.findById(req.body.doctor);
        if (!doctor) return res.status(400).send("Invalid doctorId");

        if (req.account.accessLevel == Roles.Hospital)
            if (doctor.hospital != req.account.hospital)
                return res.status(403).send("Access Denied");

        // req.body.folderPath =
        //     "hcc/" + profile._id + "/Prescriptions/" + req.body.recordName;

        // let prescription = await Prescription.findOne({
        //     folderPath: req.body.folderPath,
        // });
        // if (prescription)
        //     return res.status(400).send("Prescription name should be unique");

        const prescription = new Prescription(req.body);
        await prescription.save();

        profile.prescriptions.push(prescription._id);
        await profile.save();

        res.status(201).send(prescription);
    }
);

router.patch(
    "/:id",
    [
        validateObjectId,
        auth,
        hospital,
        validateEachParameter(prescriptionSchema),
        checkAccess(
            [Roles.Admin, Roles.User],
            "hospital",
            Prescription,
            "doctor.hospital",
            "doctor"
        ),
    ],
    async (req: Request, res: Response) => {
        const prescription = await Prescription.findByIdAndUpdate(
            req.params.id,
            {
                $set: req.body,
            },
            { new: true, runValidators: true }
        );

        res.send(prescription);
    }
);

router.delete(
    "/:id",
    [
        validateObjectId,
        auth,
        hospital,
        checkAccess(
            [Roles.Admin, Roles.User],
            "hospital",
            Prescription,
            "doctor.hospital",
            "doctor"
        ),
    ],
    async (req: Request, res: Response) => {
        let prescription = await Prescription.findById(req.params.id);
        if (!prescription) return res.status(404).send("Resource not found");

        prescription = await Prescription.findByIdAndDelete(req.params.id);
        if (!prescription) return res.status(404).send("Resource not found");

        let profile = await Profile.findById(prescription.profile);
        if (!profile) return res.status(404).send("Resource not found");
        profile.prescriptions.splice(
            profile.prescriptions.indexOf(prescription._id),
            1
        );
        await profile.save();

        res.send(prescription);
    }
);

export default router;
