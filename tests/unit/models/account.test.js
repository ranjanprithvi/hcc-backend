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
            specializationId: mongoose.Types.ObjectId(),
            phone: "+91 2322343234",
            profiles: [new mongoose.Types.ObjectId()],
        };

        const account = new Account(payload);
        const token = account.generateAuthToken();
        const decoded = jwt.verify(token, config.get("JWTPrivateKey"));
        expect(_.omit(decoded, ["_id", "iat", "profiles"])).toEqual(
            _.pick(payload, ["email", "accessLevel", "hospitalName"])
        );
        expect(decoded.profiles.map((p) => p.toString())).toEqual(
            expect.arrayContaining(payload.profiles.map((p) => p.toString()))
        );
    });
});
