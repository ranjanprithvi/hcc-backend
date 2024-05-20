import express, { Request, Response } from "express";
import { auth } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";
import validateObjectId from "../middleware/validate-object-id.js";
import {
    Specialization,
    specializationSchemaObject,
} from "../models/specialization-model.js";
import { validateBody } from "../middleware/validate.js";
import { hospital } from "../middleware/hospital.js";
const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
    const specializations = await Specialization.find().sort("name");
    res.send(specializations);
});

router.get("/:id", validateObjectId, async (req: Request, res: Response) => {
    const specialization = await Specialization.findById(req.params.id);
    if (!specialization) return res.status(404).send("Resource not found");
    res.send(specialization);
});

router.post(
    "/",
    [auth, admin, validateBody(specializationSchemaObject)],
    async (req: Request, res: Response) => {
        let specialization = await Specialization.findOne({
            name: req.body.name,
        });
        if (specialization)
            return res.status(400).send("specialization already exists");

        specialization = new Specialization({ name: req.body.name });
        await specialization.save();
        res.status(201).send(specialization);
    }
);

router.put(
    "/:id",
    [validateObjectId, auth, admin, validateBody(specializationSchemaObject)],
    async (req: Request, res: Response) => {
        let specialization = await Specialization.findOne({
            name: req.body.name,
        });
        if (specialization)
            return res.status(400).send("specialization already exists");

        specialization = await Specialization.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!specialization) return res.status(404).send("Resource not found");
        res.send(specialization);
    }
);

router.delete(
    "/:id",
    [validateObjectId, auth, admin],
    async (req: Request, res: Response) => {
        const specialization = await Specialization.findByIdAndDelete(
            req.params.id
        );
        if (!specialization) return res.status(404).send("Resource not found");
        res.send(specialization);
    }
);

export default router;
