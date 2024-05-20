import express from "express";
import _ from "lodash";
import moment from "moment";
import { admin } from "../middleware/admin.js";
import { auth } from "../middleware/auth.js";
import { checkAccess } from "../middleware/check-access.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validate-object-id.js";
import { Profile } from "../models/profile-model.js";
import { Account, Roles } from "../models/account-model.js";
import {
    Prescription,
    prescriptionSchema,
    prescriptionSchemaObject,
} from "../models/prescription-model.js";
import { Specialization } from "../models/specialization-model.js";
import { Medication } from "../models/medication-model.js";
const router = express.Router();

router.get("/", auth, async (req, res) => {
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|eq|ne)\b/g,
        (match) => `$${match}`
    );
    const query = JSON.parse(queryStr);

    if (req.account.accessLevel != Roles.Admin) {
        if (!query.profileId)
            return res.status(400).send("Please provide profileId");

        if (!req.account.profiles.includes(query.profileId))
            query.createdByAccountId = req.account._id;
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
    [auth, validateBody(prescriptionSchemaObject)],
    async (req, res) => {
        if (req.account.accessLevel == Roles.User) {
            if (!req.account.profiles.includes(req.body.profileId))
                return res.status(403).send("Access Denied");
        }

        const profile = await Profile.findById(req.body.profileId);
        if (!profile) return res.status(400).send("Invalid ProfileId");

        const specialization = await Specialization.findById(
            req.body.specializationId
        );
        if (!specialization)
            return res.status(400).send("Invalid specialization");

        req.body.folderPath = req.body.s3Path + req.body.recordName;

        let prescription = await Prescription.findOne({
            folderPath: req.body.folderPath,
        });
        if (prescription)
            return res.status(400).send("Record name should be unique");

        const hospitalName = req.account.hospitalName || req.body.hospitalName;

        const medications = [];

        if (req.body.medications) {
            for (const m of req.body.medications) {
                const medication = await Medication.findById(m.medicationId);
                if (!medication)
                    return res.status(400).send("Invalid medicationId");
                medications.push({
                    ..._.pick(m, ["dosage", "interval", "durationInDays"]),
                    medication,
                });
            }
        }

        prescription = new Prescription({
            ..._.pick(req.body, [
                "profileId",
                "content",
                "folderPath",
                "files",
                "dateOnDocument",
            ]),
            hospitalName,
            specialization,
            createdByAccountId: req.account._id,
            medications,
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
        validateEachParameter(
            _.pick(prescriptionSchema, [
                "recordName",
                "content",
                "dateOnDocument",
                "hospitalName",
                "specializationId",
            ])
        ),
        checkAccess([Roles.Admin], Prescription, "createdByAccountId"),
    ],
    async (req, res) => {
        let params = _.pick(req.body, [
            "dateOnDocument",
            "hospitalName",
            "content",
        ]);

        if (req.body.specializationId) {
            const specialization = await Specialization.findById(
                req.body.specializationId
            );
            if (!specialization)
                return res.status(400).send("Invalid specializationId");
            params.specialization = specialization;
        }

        let prescription = await Prescription.findByIdAndUpdate(
            req.params.id,
            {
                $set: params,
            },
            { new: true, runValidators: true }
        );
        if (!prescription) res.status(404).send("Resource not found");

        if (req.body.recordName) {
            let s = prescription.folderPath.split("/");
            s.splice(-1);
            prescription.folderPath = s.join("/") + "/" + req.body.recordName;
            const mr = await Prescription.findOne({
                folderPath: prescription.folderPath,
            });
            if (mr) return res.status(400).send("Record name should be unique");
            await prescription.save();
        }

        res.send(prescription);
    }
);

router.delete(
    "/:id",
    [
        validateObjectId,
        auth,
        checkAccess([Roles.Admin], Prescription, "createdByAccountId"),
    ],
    async (req, res) => {
        const prescription = await Prescription.findByIdAndDelete(
            req.params.id
        );
        if (!prescription) return res.status(404).send("Resource not found");

        const profile = await Profile.findById(prescription.profileId);
        profile.prescriptions.splice(
            profile.prescriptions.indexOf(prescription._id),
            1
        );
        await profile.save();

        res.send(prescription);
    }
);

export default router;
