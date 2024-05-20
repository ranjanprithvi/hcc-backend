import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Account, Roles } from "../models/account-model.js";
import { Request, Response, NextFunction } from "express";

// Verifier that expects valid access tokens:
const verifier = CognitoJwtVerifier.create({
    userPoolId: "ap-south-1_duNOdyuV8",
    tokenUse: "access",
    clientId: "5i6n2f74e2d4as6av2dn080b2u",
});

export async function auth(req: Request, res: Response, next: NextFunction) {
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

        const accountObj: typeof req.account = {
            _id: account._id.toString(),
            accessLevel: Roles.User,
        };

        if (groups.includes("Admin")) accountObj.accessLevel = Roles.Admin;
        else if (groups.includes("Hospital"))
            accountObj.accessLevel = Roles.Hospital;

        if (account.hospital) accountObj.hospital = account.hospital.toString();

        req.account = accountObj;

        next();
    } catch (err) {
        res.status(400).send(err);
    }
}
