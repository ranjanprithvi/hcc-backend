import express from "express";
import _ from "lodash";
import moment from "moment";
import { admin } from "../middleware/admin.js";
import { auth } from "../middleware/auth.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { Profile } from "../models/profileModel.js";
import { Account, roles } from "../models/accountModel.js";
import {
    Prescription,
    editPrescriptionSchema,
    prescriptionSchema,
    prescriptionSchemaObject,
} from "../models/prescriptionModel.js";
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
    [auth, validateBody(prescriptionSchemaObject)],
    async (req, res) => {
        const profile = await Profile.findById(req.body.profileId);
        if (!profile) return res.status(400).send("Invalid ProfileId");

        if (req.account.accessLevel == roles.user) {
            if (!req.account.profiles.includes(req.body.profileId))
                return res.status(403).send("Access Denied");
            req.body.external = true;
        }

        if (req.body.doctorId) {
            const doctor = await Doctor.findById(req.body.doctorId);
            if (!doctor) return res.status(400).send("Invalid doctorId");

            if (req.account.accessLevel == roles.hospital)
                if (doctor.hospital != req.account.hospital)
                    return res.status(403).send("Access Denied");
        } else {
            const specialization = await Specialization.findById(
                req.body.specializationId
            );
            if (!specialization)
                return res.status(400).send("Invalid specialization");
        }

        req.body.folderPath = req.body.s3Path + req.body.recordName;

        let prescription = await Prescription.findOne({
            folderPath: req.body.folderPath,
        });
        if (prescription)
            return res.status(400).send("Record name should be unique");

        prescription = new Prescription({
            profile: req.body.profileId,
            doctor: req.body.doctorId,
            specialization: req.body.specializationId,
            folderPath: req.body.s3Path + req.body.recordName,

            ..._.pick(req.body, [
                "doctorName",
                "hospitalName",
                "content",
                "dateOnDocument",
                "external",
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
        // if(req.body.doctorId){}

        if (req.body.specializationId) {
            const specialization = await Specialization.findById(
                req.body.specializationId
            );
            if (!specialization)
                return res.status(400).send("Invalid specializationId");
            req.body.specialization = specialization._id;
            delete req.body.specializationId;
        }

        let prescription = await Prescription.findById(req.params.id);
        if (!prescription) res.status(404).send("Resource not found");
        if (req.account.accessLevel == roles.user) {
            if (!prescription.external)
                return res.status(403).send("Access Denied");
        }

        prescription = await Prescription.findByIdAndUpdate(
            req.params.id,
            {
                $set: req.body,
            },
            { new: true, runValidators: true }
        );

        // if (req.body.recordName) {
        //     let s = prescription.folderPath.split("/");
        //     s.splice(-1);
        //     prescription.folderPath = s.join("/") + "/" + req.body.recordName;
        //     const mr = await Prescription.findOne({
        //         folderPath: prescription.folderPath,
        //     });
        //     if (mr) return res.status(400).send("Record name should be unique");
        //     await prescription.save();
        // }

        res.send(prescription);
    }
);

router.delete(
    "/:id",
    [
        validateObjectId,
        auth,
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
        if (req.account.accessLevel == roles.user)
            if (!prescription.external)
                return res.status(403).send("Access Denied");

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
