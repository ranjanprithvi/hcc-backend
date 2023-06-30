import express from "express";
import { auth } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";
import validateObjectId from "../middleware/validateObjectId.js";
import {
    Medication,
    medicationSchemaObject,
} from "../models/medicationModel.js";
import { validateBody } from "../middleware/validate.js";
import { hospital } from "../middleware/hospital.js";
const router = express.Router();

router.get("/", async (req, res) => {
    const medications = await Medication.find().sort("name");
    res.send(medications);
});

router.get("/:id", validateObjectId, async (req, res) => {
    const medication = await Medication.findById(req.params.id);
    if (!medication) return res.status(404).send("Resource not found");
    res.send(medication);
});

router.post(
    "/",
    [auth, hospital, validateBody(medicationSchemaObject)],
    async (req, res) => {
        let medication = await Medication.findOne({ name: req.body.name });
        if (medication)
            return res.status(400).send("Medication already exists");

        medication = new Medication({ name: req.body.name });
        await medication.save();
        res.status(201).send(medication);
    }
);

router.put(
    "/:id",
    [validateObjectId, auth, hospital, validateBody(medicationSchemaObject)],
    async (req, res) => {
        let medication = await Medication.findOne({ name: req.body.name });
        if (medication)
            return res.status(400).send("Medication already exists");

        medication = await Medication.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!medication) return res.status(404).send("Resource not found");
        res.send(medication);
    }
);

router.delete("/:id", [validateObjectId, auth, hospital], async (req, res) => {
    const medication = await Medication.findByIdAndDelete(req.params.id);
    if (!medication) return res.status(404).send("Resource not found");
    res.send(medication);
});

export default router;
