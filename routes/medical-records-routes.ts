import express, { Request, Response } from "express";
import _ from "lodash";
import { auth } from "../middleware/auth.js";
import { checkAccess } from "../middleware/check-access.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validate-object-id.js";
import { Profile } from "../models/profile-model.js";
import { Roles } from "../models/account-model.js";
import {
    MedicalRecord,
    medicalRecordSchema,
    medicalRecordSchemaObject,
} from "../models/medical-record-model.js";
import { Doctor } from "../models/doctor-model.js";
import { hospital } from "../middleware/hospital.js";
const router = express.Router();

// const s3Path

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
    }

    const medicalRecords = await MedicalRecord.find(query).populate([
        { path: "profile", populate: "account" },
    ]);
    res.send(medicalRecords);
});

router.get(
    "/:id",
    [
        validateObjectId,
        auth,
        checkAccess(
            [Roles.Admin, Roles.Hospital],
            "_id",
            MedicalRecord,
            "profile.account",
            "profile"
        ),
        checkAccess(
            [Roles.Admin, Roles.User],
            "hospital",
            MedicalRecord,
            "doctor.hospital",
            "doctor"
        ),
    ],
    async (req: Request, res: Response) => {
        const medicalRecord = await MedicalRecord.findById(
            req.params.id
        ).populate(["profile", { path: "profile", populate: "account" }]);
        console.log(medicalRecord);
        res.send(medicalRecord);
    }
);

router.post(
    "/",
    [auth, hospital, validateBody(medicalRecordSchemaObject)],
    async (req: Request, res: Response) => {
        const profile = await Profile.findById(req.body.profile);
        if (!profile) return res.status(400).send("Invalid Profile Id");

        const doctor = await Doctor.findById(req.body.doctor);
        if (!doctor) return res.status(400).send("Invalid Doctor Id");

        if (req.account.accessLevel == Roles.Hospital)
            if (doctor.hospital != req.account.hospital)
                return res.status(403).send("Access Denied");

        // req.body.folderPath =
        //     profile._id + "/MedicalRecords/" + req.body.recordName;

        // let medicalRecord = await MedicalRecord.findOne({
        //     folderPath: req.body.folderPath,
        // });
        // if (medicalRecord)
        //     return res.status(400).send("Record name should be unique");

        const medicalRecord = new MedicalRecord(req.body);
        await medicalRecord.save();

        profile.medicalRecords.push(medicalRecord._id);
        await profile.save();

        res.status(201).send(medicalRecord);
    }
);

router.patch(
    "/:id",
    [
        validateObjectId,
        auth,
        hospital,
        validateEachParameter(medicalRecordSchema),
        checkAccess(
            [Roles.Admin, Roles.Hospital],
            "_id",
            MedicalRecord,
            "profile.account",
            "profile"
        ),
        checkAccess(
            [Roles.Admin, Roles.User],
            "hospital",
            MedicalRecord,
            "doctor.hospital",
            "doctor"
        ),
    ],
    async (req: Request, res: Response) => {
        const medicalRecord = await MedicalRecord.findByIdAndUpdate(
            req.params.id,
            {
                $set: req.body,
            },
            { new: true, runValidators: true }
        );

        res.send(medicalRecord);
    }
);

router.delete(
    "/:id",
    [
        validateObjectId,
        auth,
        checkAccess(
            [Roles.Admin, Roles.User],
            "hospital",
            MedicalRecord,
            "doctor.hospital",
            "doctor"
        ),
        checkAccess(
            [Roles.Admin, Roles.Hospital],
            "_id",
            MedicalRecord,
            "profile.account",
            "profile"
        ),
    ],
    async (req: Request, res: Response) => {
        const medicalRecord = await MedicalRecord.findByIdAndDelete(
            req.params.id
        );
        if (!medicalRecord) return res.status(404).send("Resource not found");

        let profile = await Profile.findById(medicalRecord.profile);
        if (!profile) return res.status(400).send("Profile not found");
        profile.medicalRecords.splice(
            profile.medicalRecords.indexOf(medicalRecord._id),
            1
        );
        await profile.save();

        res.send(medicalRecord);
    }
);

export default router;
