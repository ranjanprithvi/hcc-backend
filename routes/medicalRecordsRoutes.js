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
    MedicalRecord,
    medicalRecordSchema,
    medicalRecordSchemaObject,
} from "../models/medicalRecordModel.js";
import { RecordType } from "../models/recordTypeModel.js";
import { Field } from "../models/fieldModel.js";
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
    const medicalRecords = await MedicalRecord.find(query);
    res.send(medicalRecords);
});

// router.get(
//     "/:id",
//     [validateObjectId, auth, checkOwner(MedicalRecord, "createdByAccountId")],
//     async (req, res) => {
//         const medicalRecord = await MedicalRecord.findById(req.params.id);
//         res.send(medicalRecord);
//     }
// );

router.post(
    "/",
    [auth, validateBody(medicalRecordSchemaObject)],
    async (req, res) => {
        if (req.account.accessLevel == roles.user) {
            if (!req.account.patients.includes(req.body.patientId))
                return res.status(403).send("Access Denied");
        }

        const patient = await Patient.findById(req.body.patientId);
        if (!patient) return res.status(400).send("Invalid PatientId");

        const recordType = await RecordType.findById(req.body.recordTypeId);
        if (!recordType) return res.status(400).send("Invalid RecordTypeId");

        const field = await Field.findById(req.body.fieldId);
        if (!field) return res.status(400).send("Invalid Field");

        req.body.folderPath = req.body.s3Path + req.body.recordName;

        let medicalRecord = await MedicalRecord.findOne({
            folderPath: req.body.folderPath,
        });
        if (medicalRecord)
            return res.status(400).send("Record name should be unique");

        const hospitalName = req.account.hospitalName || req.body.hospitalName;

        medicalRecord = new MedicalRecord({
            ..._.pick(req.body, [
                "patientId",
                "folderPath",
                "files",
                "dateOnDocument",
            ]),
            recordType,
            hospitalName,
            field,
            createdByAccountId: req.account._id,
            dateUploaded: new Date(),
        });
        await medicalRecord.save();

        patient.medicalRecords.push(medicalRecord._id);
        await patient.save();

        res.status(201).send(medicalRecord);
    }
);

router.patch(
    "/:id",
    [
        validateObjectId,
        auth,
        validateEachParameter(
            _.pick(medicalRecordSchema, [
                "recordName",
                "recordTypeId",
                "dateOnDocument",
                "hospitalName",
                "fieldId",
            ])
        ),
        checkOwner([roles.admin], MedicalRecord, "createdByAccountId"),
    ],
    async (req, res) => {
        let params = _.pick(req.body, ["dateOnDocument", "hospitalName"]);

        if (req.body.recordTypeId) {
            const recordType = await RecordType.findById(req.body.recordTypeId);
            if (!recordType)
                return res.status(400).send("Invalid recordTypeId");
            params.recordType = recordType;
        }
        if (req.body.fieldId) {
            const field = await Field.findById(req.body.fieldId);
            if (!field) return res.status(400).send("Invalid fieldId");
            params.field = field;
        }

        let medicalRecord = await MedicalRecord.findByIdAndUpdate(
            req.params.id,
            {
                $set: params,
            },
            { new: true, runValidators: true }
        );
        if (!medicalRecord) res.status(404).send("Resource not found");

        if (req.body.recordName) {
            let s = medicalRecord.folderPath.split("/");
            s.splice(-1);
            medicalRecord.folderPath = s.join("/") + "/" + req.body.recordName;
            const mr = await MedicalRecord.findOne({
                folderPath: medicalRecord.folderPath,
            });
            if (mr) return res.status(400).send("Record name should be unique");
            await medicalRecord.save();
        }

        res.send(medicalRecord);
    }
);

router.delete(
    "/:id",
    [
        validateObjectId,
        auth,
        checkOwner([roles.admin], MedicalRecord, "createdByAccountId"),
    ],
    async (req, res) => {
        const medicalRecord = await MedicalRecord.findByIdAndDelete(
            req.params.id
        );
        if (!medicalRecord) return res.status(404).send("Resource not found");

        const patient = await Patient.findById(medicalRecord.patientId);
        patient.medicalRecords.splice(
            patient.medicalRecords.indexOf(medicalRecord._id),
            1
        );
        await patient.save();

        res.send(medicalRecord);
    }
);

export default router;
