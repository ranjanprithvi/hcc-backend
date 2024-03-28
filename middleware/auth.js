import jwt from "jsonwebtoken";
import config from "config";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Account, roles } from "../models/account-model.js";

// Verifier that expects valid access tokens:
const verifier = CognitoJwtVerifier.create({
    userPoolId: "ap-south-1_duNOdyuV8",
    tokenUse: "access",
    clientId: "5i6n2f74e2d4as6av2dn080b2u",
});

export async function auth(req, res, next) {
    const token = req.header("x-auth-token");
    if (!token)
        return res.status(401).send("Access Denied. No token provided.");

    try {
        // const decoded = jwt.verify(token, config.get("JWTPrivateKey"));
        // req.account = decoded;

        const payload = await verifier.verify(token);
        const account = await Account.findOne({
            sub: payload.sub,
        });
        if (!account) return res.status(404).send("Account not found");

        const groups = payload["cognito:groups"] || [];

        req.account = { _id: account._id.toString() };

        if (groups.includes("Admin")) req.account.accessLevel = roles.admin;
        else if (groups.includes("Hospital"))
            req.account.accessLevel = roles.hospital;
        else req.account.accessLevel = roles.user;

        if (account.hospital)
            req.account.hospital = account.hospital.toString();

        console.log(req.account);

        next();
    } catch (err) {
        res.status(400).send(err);
    }
}
