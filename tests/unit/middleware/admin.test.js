import { admin } from "../../../middleware/admin";
import { roles } from "../../../models/account-model.js";

describe("admin middleware", () => {
    it("should return 403 status if account is not admin", () => {
        const account = {
            accessLevel: roles.user,
        };
        const req = {
            account: account,
        };

        let res = { status: jest.fn().mockReturnValue({ send: jest.fn() }) };
        let next = jest.fn();
        admin(req, res, next);
        expect(res.status).toBeCalledWith(403);
    });

    it("should call next if account is admin", () => {
        const account = {
            accessLevel: roles.admin,
        };
        const req = {
            account: account,
        };

        let res = {};
        let next = jest.fn();
        admin(req, res, next);
        expect(next).toBeCalled();
    });
});
