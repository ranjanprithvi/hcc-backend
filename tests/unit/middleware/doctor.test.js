import { roles } from "../../../models/account-model.js";
import { hospital } from "../../../middleware/hospital";

describe("admin middleware", () => {
    it("should return 403 status if account is not hospital or higher access level", () => {
        const account = {
            accessLevel: roles.user,
        };
        const req = {
            account: account,
        };

        let res = { status: jest.fn().mockReturnValue({ send: jest.fn() }) };
        let next = jest.fn();
        hospital(req, res, next);
        expect(res.status).toBeCalledWith(403);
    });

    it("should call next if account is at least hospital access level", () => {
        const account = {
            accessLevel: roles.hospital,
        };
        const req = {
            account: account,
        };

        let res = {};
        let next = jest.fn();
        hospital(req, res, next);
        expect(next).toBeCalled();
    });
});
