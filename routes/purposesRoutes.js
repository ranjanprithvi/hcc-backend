import express from "express";
import { auth } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { Purpose, purposeSchemaObject } from "../models/purposeModel.js";
import { validateBody } from "../middleware/validate.js";
const router = express.Router();

router.get("/", async (req, res) => {
    const purposes = await Purpose.find().sort("name");
    res.send(purposes);
});

router.get("/:id", validateObjectId, async (req, res) => {
    const purpose = await Purpose.findById(req.params.id);
    if (!purpose) return res.status(404).send("Resource not found");
    res.send(purpose);
});

router.post(
    "/",
    [auth, admin, validateBody(purposeSchemaObject)],
    async (req, res) => {
        let purpose = await Purpose.findOne({ name: req.body.name });
        if (purpose) return res.status(400).send("Purpose already exists");

        purpose = new Purpose({ name: req.body.name });
        await purpose.save();
        res.status(201).send(purpose);
    }
);

router.put(
    "/:id",
    [validateObjectId, auth, validateBody(purposeSchemaObject)],
    async (req, res) => {
        let purpose = await Purpose.findOne({ name: req.body.name });
        if (purpose) return res.status(400).send("Purpose already exists");

        purpose = await Purpose.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!purpose) return res.status(404).send("Resource not found");
        res.send(purpose);
    }
);

router.delete("/:id", [validateObjectId, auth, admin], async (req, res) => {
    const purpose = await Purpose.findByIdAndDelete(req.params.id);
    if (!purpose) return res.status(404).send("Resource not found");
    res.send(purpose);
});

export default router;
