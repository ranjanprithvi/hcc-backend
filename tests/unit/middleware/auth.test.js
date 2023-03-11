import { auth } from "../../../middleware/auth";
import { Account, roles } from "../../../models/accountModel.js";
import mongoose from "mongoose";

describe("auth middleware", () => {
    it("should populate req.account with payload of the token", () => {
        const account = {
            _id: mongoose.Types.ObjectId(),
            accessLevel: roles.admin,
        };
        const token = new Account(account).generateAuthToken();
        const req = {
            header: jest.fn().mockReturnValue(token),
        };

        let res = {};
        let next = jest.fn();
        auth(req, res, next);
        expect(req.account).toMatchObject(account);
    });
});
