import express from "express";
import bcrypt from "bcrypt";
import { Account } from "../models/accountModel.js";
import { authSchemaObject } from "../models/authModel.js";
import { validateBody } from "../middleware/validate.js";
import { getCredentials } from "../startup/s3.js";
// import { generateUploadUrl } from "../startup/s3.js";

const router = express.Router();

router.post("/login", validateBody(authSchemaObject), async (req, res) => {
    const account = await Account.findOne({ email: req.body.email });
    if (!account) return res.status(400).send("Invalid Email or password");

    const validPassword = await bcrypt.compare(
        req.body.password,
        account.password
    );
    if (!validPassword)
        return res.status(400).send("Invalid Email or password");

    const token = account.generateAuthToken();
    const creds = await getCredentials();
    console.log(creds);
    res.send({ token, creds });
});

router.get("/s3Url", async (req, res) => {
    const url = generateUploadUrl();
    return url;
});

export default router;
