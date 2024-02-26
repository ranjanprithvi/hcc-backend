import express from "express";
import _ from "lodash";
import { auth } from "../middleware/auth.js";
import { checkAccess } from "../middleware/check-access.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validate-object-id.js";
import { Profile } from "../models/profile-model.js";
import { roles } from "../models/account-model.js";
import {
    Prescription,
    editPrescriptionSchema,
    prescriptionSchemaObject,
} from "../models/prescription-model.js";
import { Specialization } from "../models/specialization-model.js";
import { Doctor } from "../models/doctor-model.js";
import { hospital } from "../middleware/hospital.js";
const router = express.Router();

router.get("/", auth, async (req, res) => {
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|eq|ne)\b/g,
        (match) => `$${match}`
    );
    const query = JSON.parse(queryStr);

    if (req.account.accessLevel != roles.admin) {
        if (!query.profileId)
            return res.status(400).send("Please provide profileId");

        if (req.account.accessLevel == roles.user)
            if (!req.account.profiles.includes(query.profileId))
                return res.status(403).send("Access Denied");

        query.profile = query.profileId;
        delete query.profileId;
    }

    const prescriptions = await Prescription.find(query);
    res.send(prescriptions);
});

// router.get(
//     "/:id",
//     [validateObjectId, auth, checkOwner(Prescription, "createdByAccountId")],
//     async (req, res) => {
//         const prescription = await Prescription.findById(req.params.id);
//         res.send(prescription);
//     }
// );

router.post(
    "/",
    [auth, hospital, validateBody(prescriptionSchemaObject)],
    async (req, res) => {
        const profile = await Profile.findById(req.body.profileId);
        if (!profile) return res.status(400).send("Invalid ProfileId");

        const doctor = await Doctor.findById(req.body.doctorId);
        if (!doctor) return res.status(400).send("Invalid doctorId");

        if (req.account.accessLevel == roles.hospital)
            if (doctor.hospital != req.account.hospital)
                return res.status(403).send("Access Denied");

        req.body.folderPath =
            "hcc/" + profile._id + "/Prescriptions/" + req.body.recordName;

        let prescription = await Prescription.findOne({
            folderPath: req.body.folderPath,
        });
        if (prescription)
            return res.status(400).send("Record name should be unique");

        prescription = new Prescription({
            profile: req.body.profileId,
            doctor: req.body.doctorId,

            ..._.pick(req.body, [
                "content",
                "dateOnDocument",
                "folderPath",
                "files",
            ]),
        });
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
        validateEachParameter(editPrescriptionSchema),
        checkAccess(
            [roles.admin, roles.user],
            "hospital",
            Prescription,
            "doctor.hospital",
            "doctor"
        ),
        checkAccess(
            [roles.admin, roles.hospital],
            "_id",
            Prescription,
            "profile.account",
            "profile"
        ),
    ],
    async (req, res) => {
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
            [roles.admin, roles.user],
            "hospital",
            Prescription,
            "doctor.hospital",
            "doctor"
        ),
        checkAccess(
            [roles.admin, roles.hospital],
            "_id",
            Prescription,
            "profile.account",
            "profile"
        ),
    ],
    async (req, res) => {
        let prescription = await Prescription.findById(req.params.id);
        if (!prescription) return res.status(404).send("Resource not found");

        prescription = await Prescription.findByIdAndDelete(req.params.id);

        let profile = await Profile.findById(prescription.profile);
        profile.prescriptions.splice(
            profile.prescriptions.indexOf(prescription._id),
            1
        );
        await profile.save();

        res.send(prescription);
    }
);

export default router;