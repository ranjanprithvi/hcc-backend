import { Account, Roles } from "../../../models/account-model.js";
import jwt from "jsonwebtoken";
import config from "config";
import mongoose from "mongoose";
import _ from "lodash";

describe("account.generateAuthToken", () => {
    it("should generate a valid auth Token for hospital account", async () => {
        const payload = {
            _id: mongoose.Types.ObjectId(),
            email: "abc@gmail.com",
            password: "1234556",
            accessLevel: Roles.Hospital,
            hospital: mongoose.Types.ObjectId(),
            profiles: [
                new mongoose.Types.ObjectId(),
                new mongoose.Types.ObjectId(),
            ],
        };

        const account = new Account(payload);
        const token = account.generateAuthToken("2s");
        const decoded = jwt.verify(token, config.get("JWTPrivateKey"));
        expect(decoded).toHaveProperty(
            "_id",
            expect.stringMatching(/^[a-f\d]{24}$/i)
        );
        expect(decoded).toHaveProperty("hospital", payload.hospital.toString());
        expect(_.pick(decoded, ["email", "accessLevel"])).toEqual(
            _.pick(payload, ["email", "accessLevel"])
        );
        expect(decoded).not.toHaveProperty("password");

        await new Promise((r) => setTimeout(r, 3000));
        expect(() => {
            jwt.verify(token, config.get("JWTPrivateKey"));
        }).toThrow(jwt.TokenExpiredError);
    });

    it("should generate a valid auth Token for user account", () => {
        const payload = {
            _id: mongoose.Types.ObjectId(),
            email: "abc@gmail.com",
            password: "1234556",
            accessLevel: Roles.User,
            profiles: [
                new mongoose.Types.ObjectId(),
                new mongoose.Types.ObjectId(),
            ],
        };

        const account = new Account(payload);
        const token = account.generateAuthToken();
        const decoded = jwt.decode(token);
        expect(decoded).toHaveProperty(
            "_id",
            expect.stringMatching(/^[a-f\d]{24}$/i)
        );
        expect(_.pick(decoded, ["email", "accessLevel"])).toEqual(
            _.pick(payload, ["email", "accessLevel"])
        );
        expect(decoded.profiles.map((p) => p.toString())).toEqual(
            expect.arrayContaining(payload.profiles.map((p) => p.toString()))
        );
        expect(decoded).not.toHaveProperty("password");
    });
});
