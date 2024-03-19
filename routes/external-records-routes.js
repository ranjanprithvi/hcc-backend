import express from "express";
import _ from "lodash";
import { auth } from "../middleware/auth.js";
import { checkAccess } from "../middleware/check-access.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validate-object-id.js";
import { Profile } from "../models/profile-model.js";
import { Account, roles } from "../models/account-model.js";
import {
    ExternalRecord,
    externalRecordSchema,
    externalRecordSchemaObject,
} from "../models/external-record-model.js";
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
        if (!query.profile)
            return res.status(400).send("Please provide profileId");

        if (req.account.accessLevel == roles.user)
            if (!req.account.profiles.includes(query.profile))
                return res.status(403).send("Access Denied");

        // query.profile = query.profileId;
        // delete query.profileId;
    }

    const externalRecords = await ExternalRecord.find(query).populate(
        "specialization"
    );
    res.send(externalRecords);
});

router.get(
    "/:id",
    [
        validateObjectId,
        auth,
        checkAccess(
            [roles.admin, roles.hospital],
            "_id",
            ExternalRecord,
            "profile.account",
            "profile"
        ),
    ],
    async (req, res) => {
        const externalRecord = await ExternalRecord.findById(
            req.params.id
        ).populate("specialization");
        res.send(externalRecord);
    }
);

router.post(
    "/",
    [auth, validateBody(externalRecordSchemaObject)],
    async (req, res) => {
        const profile = await Profile.findById(req.body.profile);
        if (!profile) return res.status(400).send("Invalid ProfileId");

        if (req.account.accessLevel == roles.user) {
            if (profile.account != req.account._id)
                return res.status(403).send("Access Denied");
        }

        const specialization = await Specialization.findById(
            req.body.specialization
        );
        if (!specialization)
            return res.status(400).send("Invalid specialization");

        // req.body.folderPath =
        //     "hcc/" + profile._id + "/ExternalRecords/" + req.body.recordName;

        // let externalRecord = await ExternalRecord.findOne({
        //     folderPath: req.body.folderPath,
        // });
        // if (externalRecord)
        //     return res.status(400).send("Record name should be unique");

        const externalRecord = new ExternalRecord(req.body);
        await externalRecord.save();

        profile.externalRecords.push(externalRecord._id);
        await profile.save();

        res.status(201).send(externalRecord);
    }
);

router.patch(
    "/:id",
    [
        validateObjectId,
        auth,
        validateEachParameter(externalRecordSchema),
        checkAccess(
            [roles.admin, roles.hospital],
            "_id",
            ExternalRecord,
            "profile.account",
            "profile"
        ),
    ],
    async (req, res) => {
        const specialization = await Specialization.findById(
            req.body.specialization
        );
        if (!specialization)
            return res.status(400).send("Invalid specializationId");

        const externalRecord = await ExternalRecord.findByIdAndUpdate(
            req.params.id,
            {
                $set: req.body,
            },
            { new: true, runValidators: true }
        );

        res.send(externalRecord);
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
            ExternalRecord,
            "doctor.hospital",
            "doctor"
        ),
        checkAccess(
            [roles.admin, roles.hospital],
            "_id",
            ExternalRecord,
            "profile.account",
            "profile"
        ),
    ],
    async (req, res) => {
        const externalRecord = await ExternalRecord.findByIdAndDelete(
            req.params.id
        );

        let profile = await Profile.findById(externalRecord.profile);
        profile.externalRecords.splice(
            profile.externalRecords.indexOf(externalRecord._id),
            1
        );
        await profile.save();

        res.send(externalRecord);
    }
);

export default router;
