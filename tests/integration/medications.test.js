import mongoose from "mongoose";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Medication } from "../../models/medicationModel.js";
import { Account, roles } from "../../models/accountModel.js";

describe("/api/medications", () => {
    // beforeEach(() => {
    //     server = require("../../index");
    // });
    // afterEach(() => {
    //     server.close();
    // });
    afterEach(async () => {
        await Medication.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        it("should return all the medications", async () => {
            await Medication.collection.insertMany([
                { name: "medication1" },
                { name: "medication2" },
            ]);
            const res = await request(server).get("/api/medications");
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });
    });
    describe("GET /:id", () => {
        it("should return a medication if valid id is passed", async () => {
            const medication = new Medication({ name: "medication1" });
            await medication.save();

            const response = await request(server).get(
                `/api/medications/${medication._id}`
            );
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("name", "medication1");
        });

        it("should return 404 status if id is not valid", async () => {
            const response = await request(server).get("/api/medications/1");
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no medication with given id is found", async () => {
            const id = mongoose.Types.ObjectId();
            const response = await request(server).get(
                "/api/medications/" + id
            );
            expect(response.status).toBe(404);
        });
    });

    describe("POST /", () => {
        let token;
        let params;

        beforeEach(() => {
            token = new Account({
                accessLevel: roles.hospital,
            }).generateAuthToken();
            params = { name: "medication1" };
        });

        const exec = function () {
            return request(server)
                .post("/api/medications")
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

        it("should return 400 if medication has less than 3 characters", async () => {
            params = { name: "ge" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if medication name is not passed", async () => {
            params = {};
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params = { name: "medication1", title: "new" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if medication is not unique", async () => {
            const medication = new Medication(params);
            await medication.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save medication if request is valid", async () => {
            await exec();

            const medication = await Medication.findOne({
                name: params.name,
            });
            expect(medication).not.toBeNull();
        });

        it("should return medication if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("name", "medication1");
        });
    });

    describe("PUT /:id", () => {
        let id;
        let token;
        let params;

        // beforeAll(async () => {});

        beforeEach(async () => {
            const medication = new Medication({ name: "medication1" });
            await medication.save();
            id = medication._id;

            token = new Account({
                accessLevel: roles.hospital,
            }).generateAuthToken();
            params = { name: "medication2" };
        });

        const exec = function () {
            return request(server)
                .put("/api/medications/" + id)
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

        it("should return 400 if medication has less than 3 characters", async () => {
            params = { name: "ge" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if medication name is not passed", async () => {
            params = {};
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params = { name: "medication1", title: "new" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no medication with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 400 if medication is not unique", async () => {
            const medication = new Medication({ name: "medication2" });
            await medication.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save medication if request is valid", async () => {
            await exec();

            const medication = await Medication.findOne({
                name: "medication2",
            });
            expect(medication).not.toBeNull();
        });

        it("should return medication if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("name", "medication2");
        });
    });

    describe("DELETE /:id", () => {
        let id;
        let token;

        // beforeAll(async () => {});

        beforeEach(async () => {
            const medication = new Medication({ name: "medication1" });
            await medication.save();
            id = medication._id;

            token = new Account({
                accessLevel: roles.hospital,
            }).generateAuthToken();
        });

        const exec = function () {
            return request(server)
                .delete("/api/medications/" + id)
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

        it("should return 404 status if no medication with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should remove medication from the db if id is valid", async () => {
            await exec();

            const medication = await Medication.findOne({
                name: "medication1",
            });
            expect(medication).toBeNull();
        });

        it("should return medication if id is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("name", "medication1");
        });
    });
});
