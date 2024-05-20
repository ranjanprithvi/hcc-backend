import mongoose from "mongoose";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Hospital } from "../../models/hospital-model.js";
import { Account, Roles } from "../../models/account-model.js";

describe("/api/hospitals", () => {
    // beforeEach(() => {
    //     server = require("../../index");
    // });
    // afterEach(() => {
    //     server.close();
    // });
    afterEach(async () => {
        await Hospital.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        it("should return all the hospitals", async () => {
            await Hospital.collection.insertMany([
                { name: "hospital1" },
                { name: "hospital2" },
            ]);
            const res = await request(server).get("/api/hospitals");
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });
    });
    describe("GET /:id", () => {
        it("should return 404 status if id is not valid", async () => {
            const response = await request(server).get("/api/hospitals/1");
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no hospital with given id is found", async () => {
            const id = mongoose.Types.ObjectId();
            const response = await request(server).get("/api/hospitals/" + id);
            expect(response.status).toBe(404);
        });

        it("should return a hospital if valid id is passed", async () => {
            const hospital = new Hospital({ name: "Hospital1" });
            await hospital.save();

            const response = await request(server).get(
                `/api/hospitals/${hospital._id}`
            );
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("name", hospital.name);
        });
    });

    describe("POST /", () => {
        let token;
        let params;

        beforeEach(() => {
            token = new Account({
                accessLevel: Roles.Admin,
            }).generateAuthToken();
            params = { name: "Hospital1" };
        });

        const exec = function () {
            return request(server)
                .post("/api/hospitals")
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

        it("should return 400 if hospital has less than 3 characters", async () => {
            params = { name: "ge" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if hospital name is not passed", async () => {
            params = {};
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params = { name: "hospital1", title: "new" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if hospital is not unique", async () => {
            const hospital = new Hospital(params);
            await hospital.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save hospital if request is valid", async () => {
            await exec();

            const hospital = await Hospital.findOne({ name: params.name });
            expect(hospital).not.toBeNull();
        });

        it("should return hospital if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("name", params.name);
            expect(response.body).toHaveProperty("doctors", []);
        });
    });

    describe("PATCH /:id", () => {
        let id;
        let token;
        let params;

        // beforeAll(async () => {});

        beforeEach(async () => {
            const hospital = new Hospital({ name: "Hospital1" });
            await hospital.save();
            id = hospital._id;

            token = new Account({
                accessLevel: Roles.Admin,
            }).generateAuthToken();
            params = { name: "Hospital2" };
        });

        const exec = function () {
            return request(server)
                .patch("/api/hospitals/" + id)
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const response = await exec();

            expect(response.status).toBe(401);
        });

        it("should return 400 if hospital has less than 3 characters", async () => {
            params = { name: "ho" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params = { name: "hospital1", title: "new" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no hospital with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 400 if hospital is not unique", async () => {
            const hospital = new Hospital({ name: params.name });
            await hospital.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save hospital if request is valid", async () => {
            await exec();

            const hospital = await Hospital.findOne({ name: params.name });
            expect(hospital).not.toBeNull();
        });

        it("should return hospital if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("name", params.name);
            expect(response.body).toHaveProperty("doctors");
        });
    });

    describe("DELETE /:id", () => {
        let id;
        let token;

        // beforeAll(async () => {});

        beforeEach(async () => {
            const hospital = new Hospital({ name: "hospital1" });
            await hospital.save();
            id = hospital._id;

            token = new Account({
                accessLevel: Roles.Admin,
            }).generateAuthToken();
        });

        const exec = function () {
            return request(server)
                .delete("/api/hospitals/" + id)
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

        it("should return 404 status if no hospital with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should remove hospital from the db if id is valid", async () => {
            await exec();

            const hospital = await Hospital.findOne({ name: "hospital1" });
            expect(hospital).toBeNull();
        });

        it("should return hospital if id is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("name", "hospital1");
        });
    });
});
