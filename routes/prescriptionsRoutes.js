import express from "express";
import _ from "lodash";
import { admin } from "../middleware/admin.js";
import { auth } from "../middleware/auth.js";
import { checkOwner } from "../middleware/checkOwner.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { Patient } from "../models/patientModel.js";
import { Account, roles } from "../models/accountModel.js";
import {
    Prescription,
    prescriptionSchema,
    prescriptionSchemaObject,
} from "../models/prescriptionModel.js";
import { Field } from "../models/fieldModel.js";
import { Medication } from "../models/medicationModel.js";
const router = express.Router();

router.get("/", auth, async (req, res) => {
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|eq|ne)\b/g,
        (match) => `$${match}`
    );
    const query = JSON.parse(queryStr);

    if (req.account.accessLevel != roles.admin) {
        if (!query.patientId)
            return res.status(400).send("Please provide patientId");

        if (!req.account.patients.includes(query.patientId))
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
        if (req.account.accessLevel == roles.user) {
            if (!req.account.patients.includes(req.body.patientId))
                return res.status(403).send("Access Denied");
        }

        const patient = await Patient.findById(req.body.patientId);
        if (!patient) return res.status(400).send("Invalid PatientId");

        const field = await Field.findById(req.body.fieldId);
        if (!field) return res.status(400).send("Invalid Field");

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
                "patientId",
                "content",
                "folderPath",
                "files",
                "dateOnDocument",
            ]),
            hospitalName,
            field,
            createdByAccountId: req.account._id,
            dateUploaded: new Date(),
            medications,
        });
        await prescription.save();

        patient.prescriptions.push(prescription._id);
        await patient.save();

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
                "fieldId",
            ])
        ),
        checkOwner([roles.admin], Prescription, "createdByAccountId"),
    ],
    async (req, res) => {
        let params = _.pick(req.body, [
            "dateOnDocument",
            "hospitalName",
            "content",
        ]);

        if (req.body.fieldId) {
            const field = await Field.findById(req.body.fieldId);
            if (!field) return res.status(400).send("Invalid fieldId");
            params.field = field;
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
        checkOwner([roles.admin], Prescription, "createdByAccountId"),
    ],
    async (req, res) => {
        const prescription = await Prescription.findByIdAndDelete(
            req.params.id
        );
        if (!prescription) return res.status(404).send("Resource not found");

        const patient = await Patient.findById(prescription.patientId);
        patient.prescriptions.splice(
            patient.prescriptions.indexOf(prescription._id),
            1
        );
        await patient.save();

        res.send(prescription);
    }
);

export default router;
