import { Account, roles } from "../../../models/accountModel.js";
import jwt from "jsonwebtoken";
import config from "config";
import mongoose from "mongoose";
import _ from "lodash";

describe("account.generateAuthToken", () => {
    it("should generate a valid auth Token", () => {
        const payload = {
            _id: mongoose.Types.ObjectId(),
            email: "abc@gmail.com",
            accessLevel: roles.admin,
            password: "1234556",
            hospitalName: "hospital1",
            fieldId: mongoose.Types.ObjectId(),
            phone: "+91 2322343234",
            patients: [new mongoose.Types.ObjectId()],
        };

        const account = new Account(payload);
        const token = account.generateAuthToken();
        const decoded = jwt.verify(token, config.get("JWTPrivateKey"));
        expect(_.omit(decoded, ["_id", "iat", "patients"])).toEqual(
            _.pick(payload, ["email", "accessLevel", "hospitalName"])
        );
        expect(decoded.patients.map((p) => p.toString())).toEqual(
            expect.arrayContaining(payload.patients.map((p) => p.toString()))
        );
    });
});
