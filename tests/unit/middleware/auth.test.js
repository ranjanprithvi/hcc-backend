import _ from "lodash";
import { auth } from "../../../middleware/auth";
import { Account, Roles } from "../../../models/account-model.js";
import mongoose from "mongoose";

describe("auth middleware", () => {
    it("should populate req.account with payload of the token", () => {
        const account = {
            _id: mongoose.Types.ObjectId(),
            email: `test${Math.random()}@test.com`,
            password: "123456",
            accessLevel: Roles.Hospital,
            hospital: mongoose.Types.ObjectId(),
        };
        const token = new Account(account).generateAuthToken();

        const req = {
            header: jest.fn().mockReturnValue(token),
        };
        let res = {};
        let next = jest.fn();
        auth(req, res, next);
        expect(req.account).toMatchObject(_.omit(account, ["password"]));
    });

    it("should not populate req.account with other parameters", () => {
        const account = {
            _id: mongoose.Types.ObjectId(),
            email: `test${Math.random()}@test.com`,
            password: "123456",
            accessLevel: Roles.Hospital,
            hospital: mongoose.Types.ObjectId(),
            other: "other",
        };
        const token = new Account(account).generateAuthToken();

        const req = {
            header: jest.fn().mockReturnValue(token),
        };
        let res = {};
        let next = jest.fn();
        auth(req, res, next);
        expect(req.account).not.toMatchObject(_.omit(account, ["password"]));
    });
});
