import express from "express";
import _ from "lodash";
import mongoose from "mongoose";
import { hospital } from "../middleware/hospital.js";
import { auth } from "../middleware/auth.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { Account, roles } from "../models/accountModel.js";
import {
    Profile,
    profileSchema,
    profileSchemaObject,
} from "../models/profileModel.js";
const router = express.Router();

router.get("/", [auth, hospital], async (req, res) => {
    const profiles = await Profile.find();
    res.send(profiles);
});

router.get(
    "/:id",
    [
        validateObjectId,
        auth,
        checkAccess([roles.admin, roles.hospital], "_id", Profile, "account"),
    ],
    async (req, res) => {
        const profile = await Profile.findById(req.params.id);
        if (!profile) return res.status(404).send("Resource not found");
        res.send(profile);
    }
);

router.post(
    "/",
    [auth, validateBody(profileSchemaObject)],
    async (req, res) => {
        if (req.account.accessLevel == roles.hospital)
            return res.status(403).send("Access Denied");

        let id;
        if (req.account.accessLevel == roles.user) {
            id = req.account._id;
        } else {
            if (!req.body.accountId)
                return res.status(400).send("accountId is required");
            id = req.body.accountId;
            delete req.body.accountId;
        }

        const account = await Account.findById(id);
        if (!account) return res.status(400).send("Invalid Account Id");

        if (account.accessLevel != roles.user)
            return res.status(400).send("Account must be a user");

        req.body.account = account._id;
        const profile = await new Profile(req.body).save();

        account.profiles.push(profile._id);
        await account.save();

        res.status(201).send(profile);
    }
);

router.patch(
    "/:id",
    [
        validateObjectId,
        auth,
        checkAccess([roles.admin, roles.hospital], "_id", Profile, "account"),
        validateEachParameter(_.omit(profileSchema, ["accountId"])),
    ],
    async (req, res) => {
        if (req.account.accessLevel == roles.hospital)
            return res.status(403).send("Access Denied");

        const profile = await Profile.findByIdAndUpdate(
            req.params.id,
            {
                $set: req.body,
            },
            { new: true, runValidators: true }
        );
        if (!profile) return res.status(404).send("Resource not found");
        res.send(profile);
    }
);

router.delete(
    "/:id",
    [
        validateObjectId,
        auth,
        checkAccess([roles.admin, roles.hospital], "_id", Profile, "account"),
    ],
    async (req, res) => {
        if (req.account.accessLevel == roles.hospital)
            return res.status(403).send("Access Denied");

        const profile = await Profile.findByIdAndDelete(req.params.id);
        if (!profile) return res.status(404).send("Resource not found");

        const account = await Account.findById(profile.account);
        account.profiles.splice(account.profiles.indexOf(profile._id), 1);
        await account.save();

        res.send(profile);
    }
);

export default router;
