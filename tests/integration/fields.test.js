import mongoose from "mongoose";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Field } from "../../models/fieldModel.js";
import { Account, roles } from "../../models/accountModel.js";

describe("/api/fields", () => {
    // beforeEach(() => {
    //     server = require("../../index");
    // });
    // afterEach(() => {
    //     server.close();
    // });
    afterEach(async () => {
        await Field.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        it("should return all the fields", async () => {
            await Field.collection.insertMany([
                { name: "Cardiology" },
                { name: "Orthopaedics" },
            ]);
            const res = await request(server).get("/api/fields");
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });
    });
    describe("GET /:id", () => {
        it("should return a field if valid id is passed", async () => {
            const field = new Field({ name: "Cardiology" });
            await field.save();

            const response = await request(server).get(
                `/api/fields/${field._id}`
            );
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("name", "Cardiology");
        });

        it("should return 404 status if id is not valid", async () => {
            const response = await request(server).get("/api/fields/1");
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no field with given id is found", async () => {
            const id = mongoose.Types.ObjectId();
            const response = await request(server).get("/api/fields/" + id);
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
            params = { name: "Cardiology" };
        });

        const exec = function () {
            return request(server)
                .post("/api/fields")
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

        it("should return 400 if field has less than 3 characters", async () => {
            params = { name: "ge" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if field name is not passed", async () => {
            params = {};
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params = { name: "Cardiology", title: "new" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if field is not unique", async () => {
            const field = new Field(params);
            await field.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save field if request is valid", async () => {
            await exec();

            const field = await Field.findOne({
                name: "Cardiology",
            });
            expect(field).not.toBeNull();
        });

        it("should return field if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("name", "Cardiology");
        });
    });

    describe("PUT /:id", () => {
        let id;
        let token;
        let params;

        // beforeAll(async () => {});

        beforeEach(async () => {
            const field = new Field({ name: "Cardiology" });
            await field.save();
            id = field._id;

            token = new Account({
                accessLevel: roles.doctor,
            }).generateAuthToken();
            params = { name: "Orthopaedics" };
        });

        const exec = function () {
            return request(server)
                .put("/api/fields/" + id)
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

        it("should return 400 if field has less than 3 characters", async () => {
            params = { name: "ge" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if field name is not passed", async () => {
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

        it("should return 404 status if no field with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 400 if field is not unique", async () => {
            const field = new Field({ name: "Orthopaedics" });
            await field.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save field if request is valid", async () => {
            await exec();

            const field = await Field.findOne({
                name: "Orthopaedics",
            });
            expect(field).not.toBeNull();
        });

        it("should return field if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("name", "Orthopaedics");
        });
    });

    describe("DELETE /:id", () => {
        let id;
        let token;

        // beforeAll(async () => {});

        beforeEach(async () => {
            const field = new Field({ name: "Cardiology" });
            await field.save();
            id = field._id;

            token = new Account({
                accessLevel: roles.doctor,
            }).generateAuthToken();
        });

        const exec = function () {
            return request(server)
                .delete("/api/fields/" + id)
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

        it("should return 404 status if no field with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should remove field from the db if id is valid", async () => {
            await exec();

            const field = await Field.findOne({
                name: "Cardiology",
            });
            expect(field).toBeNull();
        });

        it("should return field if id is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("name", "Cardiology");
        });
    });
});
