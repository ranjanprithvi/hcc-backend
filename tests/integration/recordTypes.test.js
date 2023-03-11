import mongoose from "mongoose";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { RecordType } from "../../models/recordTypeModel.js";
import { Account, roles } from "../../models/accountModel.js";

describe("/api/recordTypes", () => {
    // beforeEach(() => {
    //     server = require("../../index");
    // });
    // afterEach(() => {
    //     server.close();
    // });
    afterEach(async () => {
        await RecordType.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        it("should return all the recordTypes", async () => {
            await RecordType.collection.insertMany([
                { name: "recordType1" },
                { name: "recordType2" },
            ]);
            const res = await request(server).get("/api/recordTypes");
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });
    });
    describe("GET /:id", () => {
        it("should return a recordType if valid id is passed", async () => {
            const recordType = new RecordType({ name: "recordType1" });
            await recordType.save();

            const response = await request(server).get(
                `/api/recordTypes/${recordType._id}`
            );
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("name", "recordType1");
        });

        it("should return 404 status if id is not valid", async () => {
            const response = await request(server).get("/api/recordTypes/1");
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no recordType with given id is found", async () => {
            const id = mongoose.Types.ObjectId();
            const response = await request(server).get(
                "/api/recordTypes/" + id
            );
            expect(response.status).toBe(404);
        });
    });

    describe("POST /", () => {
        let token;
        let params;

        beforeEach(() => {
            token = new Account({
                accessLevel: roles.doctor,
            }).generateAuthToken();
            params = { name: "recordType1" };
        });

        const exec = function () {
            return request(server)
                .post("/api/recordTypes")
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const response = await exec();

            expect(response.status).toBe(401);
        });

        it("should return 403 if client is not at least a doctor", async () => {
            token = new Account().generateAuthToken();
            const response = await exec();

            expect(response.status).toBe(403);
        });

        it("should return 400 if recordType has less than 3 characters", async () => {
            params = { name: "ge" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if recordType name is not passed", async () => {
            params = {};
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params = { name: "recordType1", title: "new" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if recordType is not unique", async () => {
            const recordType = new RecordType(params);
            await recordType.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save recordType if request is valid", async () => {
            await exec();

            const recordType = await RecordType.findOne({
                name: "recordType1",
            });
            expect(recordType).not.toBeNull();
        });

        it("should return recordType if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("name", "recordType1");
        });
    });

    describe("PUT /:id", () => {
        let id;
        let token;
        let params;

        // beforeAll(async () => {});

        beforeEach(async () => {
            const recordType = new RecordType({ name: "recordType1" });
            await recordType.save();
            id = recordType._id;

            token = new Account({
                accessLevel: roles.doctor,
            }).generateAuthToken();
            params = { name: "recordType2" };
        });

        const exec = function () {
            return request(server)
                .put("/api/recordTypes/" + id)
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const response = await exec();

            expect(response.status).toBe(401);
        });

        it("should return 403 if client is not at least a doctor", async () => {
            token = new Account().generateAuthToken();
            const response = await exec();

            expect(response.status).toBe(403);
        });

        it("should return 400 if recordType has less than 3 characters", async () => {
            params = { name: "ge" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if recordType name is not passed", async () => {
            params = {};
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params = { name: "recordType1", title: "new" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no recordType with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 400 if recordType is not unique", async () => {
            const recordType = new RecordType({ name: "recordType2" });
            await recordType.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save recordType if request is valid", async () => {
            await exec();

            const recordType = await RecordType.findOne({
                name: "recordType2",
            });
            expect(recordType).not.toBeNull();
        });

        it("should return recordType if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("name", "recordType2");
        });
    });

    describe("DELETE /:id", () => {
        let id;
        let token;

        // beforeAll(async () => {});

        beforeEach(async () => {
            const recordType = new RecordType({ name: "recordType1" });
            await recordType.save();
            id = recordType._id;

            token = new Account({
                accessLevel: roles.doctor,
            }).generateAuthToken();
        });

        const exec = function () {
            return request(server)
                .delete("/api/recordTypes/" + id)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const response = await exec();

            expect(response.status).toBe(401);
        });

        it("should return 403 if client is not at least a doctor", async () => {
            token = new Account().generateAuthToken();
            const response = await exec();

            expect(response.status).toBe(403);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no recordType with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should remove recordType from the db if id is valid", async () => {
            await exec();

            const recordType = await RecordType.findOne({
                name: "recordType1",
            });
            expect(recordType).toBeNull();
        });

        it("should return recordType if id is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("name", "recordType1");
        });
    });
});
