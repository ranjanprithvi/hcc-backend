import express, { Request, Response } from "express";
import { auth } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";
import validateObjectId from "../middleware/validate-object-id.js";
import {
    Medication,
    medicationSchemaObject,
} from "../models/medication-model.js";
import { validateBody } from "../middleware/validate.js";
import { hospital } from "../middleware/hospital.js";
const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|eq|ne)\b/g,
        (match) => `$${match}`
    );
    const query = JSON.parse(queryStr);

    const medications = await Medication.find({
        name: new RegExp(query.search, "i"),
    });
    res.send(medications);
});

router.get("/:id", validateObjectId, async (req: Request, res: Response) => {
    const medication = await Medication.findById(req.params.id);
    if (!medication) return res.status(404).send("Resource not found");
    res.send(medication);
});

router.post(
    "/",
    [auth, hospital, validateBody(medicationSchemaObject)],
    async (req: Request, res: Response) => {
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
    async (req: Request, res: Response) => {
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

router.delete(
    "/:id",
    [validateObjectId, auth, hospital],
    async (req: Request, res: Response) => {
        const medication = await Medication.findByIdAndDelete(req.params.id);
        if (!medication) return res.status(404).send("Resource not found");
        res.send(medication);
    }
);

export default router;
