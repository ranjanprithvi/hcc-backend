import express from "express";
import { auth } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";
import validateObjectId from "../middleware/validateObjectId.js";
import {
    Field,
    fieldSchemaObject,
} from "../models/fieldModel.js";
import { validateBody } from "../middleware/validate.js";
import { doctor } from "../middleware/doctor.js";
const router = express.Router();

router.get("/", async (req, res) => {
    const fields = await Field.find().sort("name");
    res.send(fields);
});

router.get("/:id", validateObjectId, async (req, res) => {
    const field = await Field.findById(req.params.id);
    if (!field) return res.status(404).send("Resource not found");
    res.send(field);
});

router.post(
    "/",
    [auth, doctor, validateBody(fieldSchemaObject)],
    async (req, res) => {
        let field = await Field.findOne({ name: req.body.name });
        if (field)
            return res.status(400).send("Field already exists");

        field = new Field({ name: req.body.name });
        await field.save();
        res.status(201).send(field);
    }
);

router.put(
    "/:id",
    [validateObjectId, auth, doctor, validateBody(fieldSchemaObject)],
    async (req, res) => {
        let field = await Field.findOne({ name: req.body.name });
        if (field)
            return res.status(400).send("Field already exists");

        field = await Field.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!field) return res.status(404).send("Resource not found");
        res.send(field);
    }
);

router.delete("/:id", [validateObjectId, auth, doctor], async (req, res) => {
    const field = await Field.findByIdAndDelete(req.params.id);
    if (!field) return res.status(404).send("Resource not found");
    res.send(field);
});

export default router;
