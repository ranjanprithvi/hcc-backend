import mongoose from "mongoose";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Purpose } from "../../models/purposeModel.js";
import { Account, roles } from "../../models/accountModel.js";

describe("/api/purposes", () => {
    // beforeEach(() => {
    //     server = require("../../index");
    // });
    // afterEach(() => {
    //     server.close();
    // });
    afterEach(async () => {
        await Purpose.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        it("should return all the purposes", async () => {
            await Purpose.collection.insertMany([
                { name: "purpose1" },
                { name: "purpose2" },
            ]);
            const res = await request(server).get("/api/purposes");
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });
    });
    describe("GET /:id", () => {
        it("should return a purpose if valid id is passed", async () => {
            const purpose = new Purpose({ name: "purpose1" });
            await purpose.save();

            const response = await request(server).get(
                `/api/purposes/${purpose._id}`
            );
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("name", "purpose1");
        });

        it("should return 404 status if id is not valid", async () => {
            const response = await request(server).get("/api/purposes/1");
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no purpose with given id is found", async () => {
            const id = mongoose.Types.ObjectId();
            const response = await request(server).get("/api/purposes/" + id);
            expect(response.status).toBe(404);
        });
    });

    describe("POST /", () => {
        let token;
        let params;

        beforeEach(() => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            params = { name: "purpose1" };
        });

        const exec = function () {
            return request(server)
                .post("/api/purposes")
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const response = await exec();

            expect(response.status).toBe(401);
        });

        it("should return 403 if client is not an admin", async () => {
            token = new Account().generateAuthToken();
            const response = await exec();

            expect(response.status).toBe(403);
        });

        it("should return 400 if purpose has less than 3 characters", async () => {
            params = { name: "ge" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if purpose name is not passed", async () => {
            params = {};
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params = { name: "purpose1", title: "new" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if purpose is not unique", async () => {
            const purpose = new Purpose(params);
            await purpose.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save purpose if request is valid", async () => {
            await exec();

            const purpose = await Purpose.findOne({ name: "purpose1" });
            expect(purpose).not.toBeNull();
        });

        it("should return purpose if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("name", "purpose1");
        });
    });

    describe("PUT /:id", () => {
        let id;
        let token;
        let params;

        // beforeAll(async () => {});

        beforeEach(async () => {
            const purpose = new Purpose({ name: "purpose1" });
            await purpose.save();
            id = purpose._id;

            token = new Account().generateAuthToken();
            params = { name: "purpose2" };
        });

        const exec = function () {
            return request(server)
                .put("/api/purposes/" + id)
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const response = await exec();

            expect(response.status).toBe(401);
        });

        it("should return 400 if purpose has less than 3 characters", async () => {
            params = { name: "ge" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if purpose name is not passed", async () => {
            params = {};
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params = { name: "purpose1", title: "new" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no purpose with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 400 if purpose is not unique", async () => {
            const purpose = new Purpose({ name: "purpose2" });
            await purpose.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save purpose if request is valid", async () => {
            await exec();

            const purpose = await Purpose.findOne({ name: "purpose2" });
            expect(purpose).not.toBeNull();
        });

        it("should return purpose if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("name", "purpose2");
        });
    });

    describe("DELETE /:id", () => {
        let id;
        let token;

        // beforeAll(async () => {});

        beforeEach(async () => {
            const purpose = new Purpose({ name: "purpose1" });
            await purpose.save();
            id = purpose._id;

            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
        });

        const exec = function () {
            return request(server)
                .delete("/api/purposes/" + id)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const response = await exec();

            expect(response.status).toBe(401);
        });

        it("should return 403 if client is not an admin", async () => {
            token = new Account().generateAuthToken();

            const response = await exec();

            expect(response.status).toBe(403);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no purpose with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should remove purpose from the db if id is valid", async () => {
            await exec();

            const purpose = await Purpose.findOne({ name: "purpose1" });
            expect(purpose).toBeNull();
        });

        it("should return purpose if id is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("name", "purpose1");
        });
    });
});
