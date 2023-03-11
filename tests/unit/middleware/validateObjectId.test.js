import mongoose from "mongoose";
import validateObjectId from "../../../middleware/validateObjectId";

describe("admin middleware", () => {
    it("should return 404 status if id is not valid", () => {
        const req = {
            params: { id: { random: 3 } },
        };

        let res = {
            status: jest.fn().mockReturnValue({ send: jest.fn() }),
        };
        let next = jest.fn();
        validateObjectId(req, res, next);
        expect(res.status).toBeCalledWith(404);
    });

    it("should call next if id is valid", () => {
        const req = {
            params: { id: mongoose.Types.ObjectId() },
        };

        let res = {};
        let next = jest.fn();
        validateObjectId(req, res, next);
        expect(next).toBeCalled();
    });
});
