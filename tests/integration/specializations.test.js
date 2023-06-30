import mongoose from "mongoose";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Specialization } from "../../models/specializationModel.js";
import { Account, roles } from "../../models/accountModel.js";
import { param } from "express/lib/router";

describe("/api/specializations", () => {
    // beforeEach(() => {
    //     server = require("../../index");
    // });
    // afterEach(() => {
    //     server.close();
    // });
    afterEach(async () => {
        await Specialization.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        it("should return all the specializations", async () => {
            await Specialization.collection.insertMany([
                { name: "Cardiology" },
                { name: "Orthopaedics" },
            ]);
            const res = await request(server).get("/api/specializations");
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });
    });
    describe("GET /:id", () => {
        it("should return a specialization if valid id is passed", async () => {
            const specialization = new Specialization({ name: "Cardiology" });
            await specialization.save();

            const response = await request(server).get(
                `/api/specializations/${specialization._id}`
            );
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("name", "Cardiology");
        });

        it("should return 404 status if id is not valid", async () => {
            const response = await request(server).get(
                "/api/specializations/1"
            );
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no specialization with given id is found", async () => {
            const id = mongoose.Types.ObjectId();
            const response = await request(server).get(
                "/api/specializations/" + id
            );
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
            params = { name: "Cardiology" };
        });

        const exec = function () {
            return request(server)
                .post("/api/specializations")
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const response = await exec();

            expect(response.status).toBe(401);
        });

        it("should return 403 if client is not an admin", async () => {
            token = new Account({
                accessLevel: roles.hospital,
            }).generateAuthToken();
            const response = await exec();

            expect(response.status).toBe(403);
        });

        it("should return 400 if specialization has less than 3 characters", async () => {
            params = { name: "ge" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if specialization name is not passed", async () => {
            params = {};
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params.title = "new";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if specialization is not unique", async () => {
            const specialization = new Specialization(params);
            await specialization.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save specialization if request is valid", async () => {
            await exec();

            const specialization = await Specialization.findOne(params);
            expect(specialization).not.toBeNull();
        });

        it("should return specialization if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("name", params.name);
        });
    });

    describe("PUT /:id", () => {
        let id;
        let token;
        let params;
        let specialization;

        // beforeAll(async () => {});

        beforeEach(async () => {
            specialization = new Specialization({ name: "Cardiology" });
            await specialization.save();
            id = specialization._id;

            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            params = { name: "Orthopaedics" };
        });

        const exec = function () {
            return request(server)
                .put("/api/specializations/" + id)
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const response = await exec();

            expect(response.status).toBe(401);
        });

        it("should return 403 if client is not an admin", async () => {
            token = new Account({
                accessLevel: roles.hospital,
            }).generateAuthToken();
            const response = await exec();

            expect(response.status).toBe(403);
        });

        it("should return 400 if specialization has less than 3 characters", async () => {
            params = { name: "ge" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if specialization name is not passed", async () => {
            params = {};
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params = { name: "Cardiology", title: "new" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no specialization with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 400 if specialization is not unique", async () => {
            const specialization = new Specialization(params);
            await specialization.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save specialization if request is valid", async () => {
            await exec();

            const s = await Specialization.findById(specialization._id);
            expect(s).toHaveProperty("name", params.name);
        });

        it("should return specialization if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("name", params.name);
        });
    });

    describe.only("DELETE /:id", () => {
        let id;
        let token;
        let specialization;

        // beforeAll(async () => {});

        beforeEach(async () => {
            specialization = new Specialization({ name: "Cardiology" });
            await specialization.save();
            id = specialization._id;

            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
        });

        const exec = function () {
            return request(server)
                .delete("/api/specializations/" + id)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const response = await exec();

            expect(response.status).toBe(401);
        });

        it("should return 403 if client is not an admin", async () => {
            token = new Account({
                accessLevel: roles.hospital,
            }).generateAuthToken();
            const response = await exec();

            expect(response.status).toBe(403);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no specialization with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should remove specialization from the db if id is valid", async () => {
            await exec();

            const s = await Specialization.findOne({
                name: specialization.name,
            });
            expect(s).toBeNull();
        });

        it("should return specialization if id is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("name", specialization.name);
        });
    });
});
