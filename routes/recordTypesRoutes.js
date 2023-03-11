import express from "express";
import { auth } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";
import validateObjectId from "../middleware/validateObjectId.js";
import {
    RecordType,
    recordTypeSchemaObject,
} from "../models/recordTypeModel.js";
import { validateBody } from "../middleware/validate.js";
import { doctor } from "../middleware/doctor.js";
const router = express.Router();

router.get("/", async (req, res) => {
    const recordTypes = await RecordType.find().sort("name");
    res.send(recordTypes);
});

router.get("/:id", validateObjectId, async (req, res) => {
    const recordType = await RecordType.findById(req.params.id);
    if (!recordType) return res.status(404).send("Resource not found");
    res.send(recordType);
});

router.post(
    "/",
    [auth, doctor, validateBody(recordTypeSchemaObject)],
    async (req, res) => {
        let recordType = await RecordType.findOne({ name: req.body.name });
        if (recordType)
            return res.status(400).send("RecordType already exists");

        recordType = new RecordType({ name: req.body.name });
        await recordType.save();
        res.status(201).send(recordType);
    }
);

router.put(
    "/:id",
    [validateObjectId, auth, doctor, validateBody(recordTypeSchemaObject)],
    async (req, res) => {
        let recordType = await RecordType.findOne({ name: req.body.name });
        if (recordType)
            return res.status(400).send("RecordType already exists");

        recordType = await RecordType.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!recordType) return res.status(404).send("Resource not found");
        res.send(recordType);
    }
);

router.delete("/:id", [validateObjectId, auth, doctor], async (req, res) => {
    const recordType = await RecordType.findByIdAndDelete(req.params.id);
    if (!recordType) return res.status(404).send("Resource not found");
    res.send(recordType);
});

export default router;
