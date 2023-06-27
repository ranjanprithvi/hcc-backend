import express from "express";
import _ from "lodash";
import moment from "moment";
import { admin } from "../middleware/admin.js";
import { auth } from "../middleware/auth.js";
import { checkOwner } from "../middleware/checkOwner.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { Profile } from "../models/profileModel.js";
import { Account, roles } from "../models/accountModel.js";
import {
    MedicalRecord,
    medicalRecordSchema,
    medicalRecordSchemaObject,
} from "../models/medicalRecordModel.js";
import { Specialization } from "../models/specializationModel.js";
import { Doctor } from "../models/doctorModel.js";
import { Hospital } from "../models/hospitalModel.js";
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

        if (!req.account.profiles.includes(query.profileId))
            query.hospital = req.hospital;
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
            if (!req.account.profiles.includes(req.body.profileId))
                return res.status(403).send("Access Denied");
        }

        const profile = await Profile.findById(req.body.profileId);
        if (!profile) return res.status(400).send("Invalid ProfileId");

        const doctor = await Doctor.findById(req.body.doctorId);
        if (!doctor) return res.status(400).send("Invalid doctorId");

        const hospital = await Hospital.findById(req.body.hospitalId);
        if (!hospital) return res.status(400).send("Invalid hospitalId");

        // const specialization = await Specialization.findById(
        //     req.body.specializationId
        // );
        // if (!specialization)
        //     return res.status(400).send("Invalid specialization");

        req.body.folderPath = req.body.s3Path + req.body.recordName;

        let medicalRecord = await MedicalRecord.findOne({
            folderPath: req.body.folderPath,
        });
        if (medicalRecord)
            return res.status(400).send("Record name should be unique");

        const h = req.account.hospital || req.body.hospital;

        medicalRecord = new MedicalRecord({
            ..._.pick(req.body, [
                "profileId",
                "folderPath",
                "files",
                "dateOnDocument",
            ]),
            recordType,
            hospitalName,
            specialization,
            createdByAccountId: req.account._id,
        });
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
        validateEachParameter(
            _.pick(medicalRecordSchema, [
                "recordName",
                "recordTypeId",
                "dateOnDocument",
                "hospitalName",
                "specializationId",
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
        if (req.body.specializationId) {
            const specialization = await Specialization.findById(
                req.body.specializationId
            );
            if (!specialization)
                return res.status(400).send("Invalid specializationId");
            params.specialization = specialization;
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

        const profile = await Profile.findById(medicalRecord.profileId);
        profile.medicalRecords.splice(
            profile.medicalRecords.indexOf(medicalRecord._id),
            1
        );
        await profile.save();

        res.send(medicalRecord);
    }
);

export default router;
