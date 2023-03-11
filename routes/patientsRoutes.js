import express from "express";
import _ from "lodash";
import mongoose from "mongoose";
import { admin } from "../middleware/admin.js";
import { auth } from "../middleware/auth.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { Account, roles } from "../models/accountModel.js";
import {
    Patient,
    patientSchema,
    patientSchemaObject,
} from "../models/patientModel.js";
const router = express.Router();

router.get("/", [auth, admin], async (req, res) => {
    const patients = await Patient.find();
    res.send(patients);
});

router.get(
    "/:id",
    [validateObjectId, auth, checkAccess([roles.admin], "patients", Patient)],
    async (req, res) => {
        const patient = await Patient.findById(req.params.id);
        if (!patient) return res.status(404).send("Resource not found");
        res.send(patient);
    }
);

router.post(
    "/",
    [auth, validateBody(patientSchemaObject)],
    async (req, res) => {
        const account = await Account.findById(req.body.accountId);
        if (!account) return res.status(400).send("Invalid Account Id");

        const patient = await new Patient(req.body).save();

        account.patients.push(patient._id);
        await account.save();

        res.status(201).send(patient);
    }
);

router.patch(
    "/:id",
    [
        validateObjectId,
        auth,
        checkAccess([roles.admin], "patients", Patient),
        validateEachParameter(_.omit(patientSchema, ["accountId"])),
    ],
    async (req, res) => {
        const patient = await Patient.findByIdAndUpdate(
            req.params.id,
            {
                $set: req.body,
            },
            { new: true, runValidators: true }
        );
        if (!patient) return res.status(404).send("Resource not found");
        res.send(patient);
    }
);

router.delete(
    "/:id",
    [validateObjectId, auth, checkAccess([roles.admin], "patients", Patient)],
    async (req, res) => {
        const patient = await Patient.findByIdAndDelete(req.params.id);
        if (!patient) return res.status(404).send("Resource not found");

        const account = await Account.findById(patient.accountId);
        account.patients.splice(account.patients.indexOf(patient._id), 1);
        await account.save();

        res.send(patient);
    }
);

export default router;
