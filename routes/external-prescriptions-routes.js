import express from "express";
import _ from "lodash";
import { auth } from "../middleware/auth.js";
import { checkAccess } from "../middleware/check-access.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validate-object-id.js";
import { Profile } from "../models/profile-model.js";
import { roles } from "../models/account-model.js";
import {
    ExternalPrescription,
    editExternalPrescriptionSchema,
    externalPrescriptionSchemaObject,
} from "../models/external-prescription-model.js";
import { Specialization } from "../models/specialization-model.js";

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

    const externalPrescriptions = await ExternalPrescription.find(query);
    res.send(externalPrescriptions);
});

// router.get(
//     "/:id",
//     [validateObjectId, auth, checkOwner(Prescription, "createdByAccountId")],
//     async (req, res) => {
//         const externalPrescription = await ExternalPrescription.findById(req.params.id);
//         res.send(externalPrescription);
//     }
// );

router.post(
    "/",
    [auth, validateBody(externalPrescriptionSchemaObject)],
    async (req, res) => {
        const profile = await Profile.findById(req.body.profileId);
        if (!profile) return res.status(400).send("Invalid ProfileId");

        if (req.account.accessLevel == roles.user) {
            if (profile.account != req.account._id)
                return res.status(403).send("Access Denied");
        }

        const specialization = await Specialization.findById(
            req.body.specializationId
        );
        if (!specialization)
            return res.status(400).send("Invalid specialization");

        req.body.folderPath =
            "hcc/" +
            profile._id +
            "/ExternalPrescriptions/" +
            req.body.recordName;

        let externalPrescription = await ExternalPrescription.findOne({
            folderPath: req.body.folderPath,
        });
        if (externalPrescription)
            return res.status(400).send("Record name should be unique");

        externalPrescription = new ExternalPrescription({
            profile: req.body.profileId,
            specialization: req.body.specializationId,

            ..._.pick(req.body, [
                "doctor",
                "hospital",
                "dateOnDocument",
                "folderPath",
                "files",
            ]),
        });
        await externalPrescription.save();

        profile.externalPrescriptions.push(externalPrescription._id);
        await profile.save();

        res.status(201).send(externalPrescription);
    }
);

router.patch(
    "/:id",
    [
        validateObjectId,
        auth,
        validateEachParameter(editExternalPrescriptionSchema),
        checkAccess(
            [roles.admin, roles.user],
            "hospital",
            ExternalPrescription,
            "doctor.hospital",
            "doctor"
        ),
        checkAccess(
            [roles.admin, roles.hospital],
            "_id",
            ExternalPrescription,
            "profile.account",
            "profile"
        ),
    ],
    async (req, res) => {
        if (req.body.specializationId) {
            const specialization = await Specialization.findById(
                req.body.specializationId
            );
            if (!specialization)
                return res.status(400).send("Invalid specializationId");
            req.body.specialization = specialization._id;
            delete req.body.specializationId;
        }

        const externalPrescription =
            await ExternalPrescription.findByIdAndUpdate(
                req.params.id,
                {
                    $set: req.body,
                },
                { new: true, runValidators: true }
            );

        // if (req.body.recordName) {
        //     let s = externalPrescription.folderPath.split("/");
        //     s.splice(-1);
        //     externalPrescription.folderPath = s.join("/") + "/" + req.body.recordName;
        //     const mr = await ExternalPrescription.findOne({
        //         folderPath: externalPrescription.folderPath,
        //     });
        //     if (mr) return res.status(400).send("Record name should be unique");
        //     await externalPrescription.save();
        // }

        res.send(externalPrescription);
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
            ExternalPrescription,
            "doctor.hospital",
            "doctor"
        ),
        checkAccess(
            [roles.admin, roles.hospital],
            "_id",
            ExternalPrescription,
            "profile.account",
            "profile"
        ),
    ],
    async (req, res) => {
        let externalPrescription = await ExternalPrescription.findById(
            req.params.id
        );

        externalPrescription = await ExternalPrescription.findByIdAndDelete(
            req.params.id
        );

        let profile = await Profile.findById(externalPrescription.profile);
        profile.externalPrescriptions.splice(
            profile.externalPrescriptions.indexOf(externalPrescription._id),
            1
        );
        await profile.save();

        res.send(externalPrescription);
    }
);

export default router;
