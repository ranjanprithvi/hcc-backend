import express from "express";
import bcrypt from "bcrypt";
import _ from "lodash";
import { Account, roles } from "../models/accountModel.js";
import { accountSchema } from "../models/accountModel.js";
import { auth } from "../middleware/auth.js";
import { admin } from "../middleware/admin.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import { Hospital } from "../models/hospitalModel.js";
import Joi from "joi";
const router = express.Router();

router.get("/me", auth, async (req, res) => {
    const account = await Account.findById(req.account._id)
        .select("-password")
        .populate([
            { path: "profiles" },
            {
                path: "hospital",
                populate: { path: "doctors", model: "doctor" },
            },
        ]);
    if (!account) {
        return res.status(400).send("Account not found");
    }
    if (account.accessLevel == roles.hospital) delete account.profiles;
    res.send(account);
});

router.get("/", [auth, admin], async (req, res) => {
    const accounts = await Account.find().select("-password");
    res.send(accounts);
});

router.post(
    "/registerUser",
    validateBody(Joi.object(_.pick(accountSchema, ["email", "password"]))),
    async (req, res) => {
        let account = await Account.findOne({ email: req.body.email });
        if (account) return res.status(400).send("Account already registered.");

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash(req.body.password, salt);
        account = new Account({
            email: req.body.email,
            password,
        });

        try {
            await account.save();
        } catch (ex) {
            for (let field in ex.errors) console.log(ex.errors[field].message);
        }
        const token = account.generateAuthToken();
        res.status(201)
            .header("x-auth-token", token)
            .header("access-control-expose-headers", "x-auth-token")
            .send(_.pick(account, ["_id", "email", "accessLevel"]));
    }
);

router.post(
    "/registerHospital",
    [
        auth,
        admin,
        validateBody(
            Joi.object(
                _.pick(accountSchema, [
                    "email",
                    "password",
                    "accessLevel",
                    "hospitalId",
                ])
            )
        ),
    ],
    async (req, res) => {
        let account = await Account.findOne({ email: req.body.email });
        if (account) return res.status(400).send("Email already registered.");

        if (req.body.accessLevel != roles.hospital)
            return res.status(400).send("AccessLevel should be hospital");

        let hospital = await Hospital.findById(req.body.hospitalId);
        if (!hospital) return res.status(400).send("Invalid hospitalId");
        req.body.hospital = hospital._id;

        const salt = await bcrypt.genSalt(10);
        const password = await bcrypt.hash(req.body.password, salt);

        account = new Account({
            ..._.pick(req.body, ["email", "accessLevel", "hospital"]),
            password,
        });

        try {
            await account.save();
        } catch (ex) {
            for (let field in ex.errors) console.log(ex.errors[field].message);
        }
        const token = account.generateAuthToken();
        res.status(201)
            .header("x-auth-token", token)
            .header("access-control-expose-headers", "x-auth-token")
            .send(_.pick(account, ["_id", "email", "accessLevel"]));
    }
);

router.patch(
    "/changePassword",
    [
        validateEachParameter(
            _.pick(accountSchema, ["email", "password", "oldPassword"])
        ),
    ],
    async (req, res) => {
        if (!req.body.email) {
            return res.status(400).send("Please enter email");
        }

        let account = await Account.findOne({ email: req.body.email });
        if (!account) return res.status(400).send("Email not found");

        if (!req.body.oldPassword) {
            return res.status(400).send("Please enter old password");
        }
        if (!req.body.password) {
            return res.status(400).send("Please enter new password");
        }

        const match = await bcrypt.compare(
            req.body.oldPassword,
            account.password
        );

        if (!match) return res.status(400).send("Invalid password");

        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, salt);

        account = await Account.findByIdAndUpdate(
            account._id,
            { $set: { password: req.body.password } },
            { new: true, runValidators: true }
        );

        res.send(_.pick(account, ["_id", "email", "accessLevel"]));
    }
);

router.patch(
    "/forgotPassword",
    [auth, validateEachParameter(_.pick(accountSchema, ["email", "password"]))],
    async (req, res) => {
        let account = await Account.findById(req.account._id);
        if (!account) return res.status(404).send("Account not found");

        if (!req.body.password) {
            return res.status(400).send("Please enter new password");
        }
        const salt = await bcrypt.genSalt(10);
        req.body.password = await bcrypt.hash(req.body.password, salt);

        account = await Account.findByIdAndUpdate(
            req.account._id,
            { $set: { password: req.body.password } },
            { new: true, runValidators: true }
        );
        if (!account) return res.status(404).send("Resource not found");

        res.send(_.pick(account, ["_id", "email", "accessLevel"]));
    }
);

router.delete("/:id", [validateObjectId, auth, admin], async (req, res) => {
    const account = await Account.findByIdAndDelete(req.params.id).select(
        "-password"
    );
    if (!account) return res.status(404).send("Resource not found");

    res.send(account);
});

export default router;
