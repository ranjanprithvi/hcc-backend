import express, { Request, Response } from "express";
import _ from "lodash";
import mongoose from "mongoose";
import { hospital } from "../middleware/hospital.js";
import { auth } from "../middleware/auth.js";
import { checkAccess } from "../middleware/check-access.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validate-object-id.js";
import { Account, Roles } from "../models/account-model.js";
import {
    Profile,
    profileSchema,
    profileSchemaObject,
} from "../models/profile-model.js";
import Joi from "joi";
const router = express.Router();

router.get("/", auth, async (req: Request, res: Response) => {
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|eq|ne)\b/g,
        (match) => `$${match}`
    );
    const query = JSON.parse(queryStr);

    if (req.account.accessLevel == Roles.User) {
        const account = await Account.findById(req.account._id).populate(
            "profiles"
        );
        if (!account) return res.status(400).send("Invalid Account Id");
        return res.send(account.profiles);
    }
    const profiles = await Profile.find({
        $or: [
            { name: new RegExp(query.search, "i") },
            { phone: new RegExp(query.search, "i") },
        ],
    });
    res.send(profiles);
});

router.get(
    "/:id",
    [
        validateObjectId,
        auth,
        checkAccess([Roles.Admin, Roles.Hospital], "_id", Profile, "account"),
    ],
    async (req: Request, res: Response) => {
        const profile = await Profile.findById(req.params.id).populate(
            "account"
        );
        res.send(profile);
    }
);

router.get(
    "/overview/:id",
    [validateObjectId, auth, hospital],
    async (req: Request, res: Response) => {
        const profile = await Profile.findById(req.params.id).populate([
            "appointments",
            "medicalRecords",
            "prescriptions",
            "account",
            { path: "externalRecords", populate: "specialization" },
            { path: "externalPrescriptions", populate: "specialization" },
        ]);
        res.send(profile);
    }
);

router.post(
    "/",
    [auth, validateBody(profileSchemaObject)],
    async (req: Request, res: Response) => {
        // if (req.account.accessLevel == Roles.Hospital)
        //     return res.status(403).send("Access Denied");

        // let id;
        let profile;
        if (req.account.accessLevel == Roles.User) {
            const id = req.account._id;

            const account = await Account.findById(id);
            if (!account) return res.status(400).send("Invalid Account Id");

            if (account.accessLevel != Roles.User)
                return res.status(400).send("Account must be a user");

            req.body.account = account._id;
            profile = await new Profile(req.body).save();

            account.profiles.push(profile._id);
            await account.save();
        } else {
            profile = await new Profile(req.body).save();
        }
        //  else {
        //     if (!req.body.accountId)
        //         return res.status(400).send("accountId is required");
        //     id = req.body.accountId;
        //     delete req.body.accountId;
        // }

        res.status(201).send(profile);
    }
);

router.patch(
    "/:id",
    [
        validateObjectId,
        auth,
        checkAccess([Roles.Admin, Roles.Hospital], "_id", Profile, "account"),
        validateEachParameter(_.omit(profileSchema, ["accountId"])),
    ],
    async (req: Request, res: Response) => {
        // if (req.account.accessLevel == Roles.Hospital)
        //     return res.status(403).send("Access Denied");

        const profile = await Profile.findByIdAndUpdate(
            req.params.id,
            {
                $set: req.body,
            },
            { new: true, runValidators: true }
        );
        res.send(profile);
    }
);

router.patch(
    "/link/:id",
    [
        validateObjectId,
        auth,
        hospital,
        validateBody(Joi.object(_.pick(profileSchema, ["accountId"]))),
    ],
    async (req: Request, res: Response) => {
        // if (req.account.accessLevel == Roles.Hospital)
        //     return res.status(403).send("Access Denied");

        const profile = await Profile.findById(req.params.id);

        if (!profile) return res.status(400).send("Invalid Profile Id");

        if (profile.account)
            return res.status(400).send("Profile already linked to an account");

        const account = await Account.findById(req.body.accountId);
        if (!account) return res.status(400).send("Invalid Account Id");
        if (account.accessLevel != Roles.User)
            return res.status(400).send("Account must be a user");

        profile.account = req.body.accountId;
        account.profiles.push(profile._id);
        await account.save();
        await profile.save();

        res.send(profile);
    }
);

router.delete(
    "/:id",
    [
        validateObjectId,
        auth,
        checkAccess([Roles.Admin, Roles.Hospital], "_id", Profile, "account"),
    ],
    async (req: Request, res: Response) => {
        // if (req.account.accessLevel == Roles.Hospital)
        //     return res.status(403).send("Access Denied");

        const profile = await Profile.findByIdAndDelete(req.params.id);
        if (!profile) return res.status(400).send("Invalid Profile Id");

        const account = await Account.findById(profile.account);
        if (!account) return res.status(400).send("Invalid Account Id");
        account.profiles.splice(account.profiles.indexOf(profile._id), 1);
        await account.save();

        res.send(profile);
    }
);

export default router;
