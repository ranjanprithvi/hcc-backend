import express from "express";
import _ from "lodash";
import mongoose from "mongoose";
import { admin } from "../middleware/admin.js";
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

router.get("/", [auth, admin], async (req, res) => {
    const profiles = await Profile.find();
    res.send(profiles);
});

router.get(
    "/:id",
    [validateObjectId, auth, checkAccess([roles.admin], "profiles", Profile)],
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
        const account = await Account.findById(req.body.accountId);
        if (!account) return res.status(400).send("Invalid Account Id");

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
        checkAccess([roles.admin], "profiles", Profile),
        validateEachParameter(_.omit(profileSchema, ["accountId"])),
    ],
    async (req, res) => {
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
    [validateObjectId, auth, checkAccess([roles.admin], "profiles", Profile)],
    async (req, res) => {
        const profile = await Profile.findByIdAndDelete(req.params.id);
        if (!profile) return res.status(404).send("Resource not found");

        const account = await Account.findById(profile.accountId);
        account.profiles.splice(account.profiles.indexOf(profile._id), 1);
        await account.save();

        res.send(profile);
    }
);

export default router;
