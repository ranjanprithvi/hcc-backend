import express, { Request, Response } from "express";
import { auth } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";
import validateObjectId from "../middleware/validate-object-id.js";
import {
    Hospital,
    hospitalSchema,
    hospitalSchemaObject,
} from "../models/hospital-model.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import _ from "lodash";
const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
    const hospitals = await Hospital.find();
    res.send(hospitals);
});

router.get("/:id", validateObjectId, async (req: Request, res: Response) => {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).send("Resource not found");
    res.send(hospital);
});

router.post(
    "/",
    [auth, admin, validateBody(hospitalSchemaObject)],
    async (req: Request, res: Response) => {
        let hospital = await Hospital.findOne({ name: req.body.name });
        if (hospital) return res.status(400).send("Hospital already exists");

        hospital = new Hospital({ name: req.body.name });
        await hospital.save();
        res.status(201).send(hospital);
    }
);

router.patch(
    "/:id",
    [
        validateObjectId,
        auth,
        admin,
        validateEachParameter(_.pick(hospitalSchema, "name")),
    ],
    async (req: Request, res: Response) => {
        let hospital = await Hospital.findOne({ name: req.body.name });
        if (hospital) return res.status(400).send("Hospital already exists");

        hospital = await Hospital.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!hospital) return res.status(404).send("Resource not found");
        res.send(hospital);
    }
);

router.delete(
    "/:id",
    [validateObjectId, auth, admin],
    async (req: Request, res: Response) => {
        const hospital = await Hospital.findByIdAndDelete(req.params.id);
        if (!hospital) return res.status(404).send("Resource not found");
        res.send(hospital);
    }
);

export default router;
