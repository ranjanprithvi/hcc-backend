import mongoose from "mongoose";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Patient } from "../../models/patientModel.js";
import bcrypt from "bcrypt";
import { Account, roles } from "../../models/accountModel.js";
import { admin } from "../../middleware/admin";

describe("/api/patients", () => {
    afterEach(async () => {
        await Patient.collection.deleteMany({});
        await Account.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        let token;
        const exec = async function () {
            return await request(server)
                .get("/api/patients")
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if client is not an admin", async () => {
            token = new Account().generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return all the patients if client is admin", async () => {
            await Patient.collection.insertMany([
                {
                    accountId: mongoose.Types.ObjectId(),
                    name: "patient1",
                    gender: "male",
                    dob: "09/16/1990",
                },
                {
                    accountId: mongoose.Types.ObjectId(),
                    name: "patient2",
                    gender: "other",
                    dob: "05/20/1990",
                },
            ]);

            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });
    });

    describe("GET /:id", () => {
        let token, id, patient, account;

        beforeEach(async () => {
            account = new Account({ email: "abc@abc.com", password: "123456" });

            patient = new Patient({
                accountId: account._id,
                name: "patient1",
                gender: "female",
                dob: new Date("09/14/1990"),
            });
            await patient.save();
            account.patients = [patient._id];
            await account.save();
            id = patient._id;

            token = account.generateAuthToken();
        });

        const exec = async function () {
            return await request(server)
                .get("/api/patients/" + id)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if patient does not belong to account", async () => {
            token = new Account().generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should allow for retrieval if account is admin", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(200);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no patient with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return the patient if request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id", patient._id.toString());
            expect(res.body).toHaveProperty(
                "accountId",
                patient.accountId.toString()
            );
            expect(res.body).toHaveProperty("name", patient.name);
            expect(res.body).toHaveProperty("gender", patient.gender);
            expect(new Date(res.body.dob)).toEqual(patient.dob);
        });
    });

    describe("POST /", () => {
        let token, params, account;

        beforeEach(async () => {
            account = new Account({ email: "abc@abc.com", password: "123456" });
            await account.save();
            token = account.generateAuthToken();

            params = {
                accountId: account._id,
                name: "patient1",
                gender: "female",
                dob: "09/14/1990",
            };
        });

        const exec = async function () {
            return await request(server)
                .post("/api/patients")
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should allow for patient creation if account is admin", async () => {
            const adminAccount = new Account({
                email: "admin@abc.com",
                password: "123456",
                accessLevel: roles.admin,
            });
            await adminAccount.save();
            token = adminAccount.generateAuthToken();

            const res = await exec();
            expect(res.status).toBe(201);
        });

        it("should return 400 if accountId is not provided", async () => {
            delete params.accountId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if accountId is invalid", async () => {
            params.accountId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no account with accountId exists", async () => {
            params.accountId = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if name is not provided", async () => {
            delete params.name;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if name is less than 3 characters", async () => {
            params.name = "be";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if name is more than 50 characters", async () => {
            params.name =
                "akshdfjkasdfkjsakdfjahkdfjahkdfhjkasdhfjkashdfjkashdfkashdfkasjhdfkjhasdf";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if gender is not provided", async () => {
            delete params.gender;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if gender is not a valid option", async () => {
            params.gender = "unknown";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if dob is not provided", async () => {
            delete params.dob;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if dob is not a date", async () => {
            params.dob = "a";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if dob is in the future", async () => {
            params.dob = "09/14/2100";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params.other = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should store the patient in the db if request is valid", async () => {
            await exec();
            const patient = await Patient.findOne({
                accountId: params.accountId,
                name: params.name,
                gender: params.gender,
                dob: new Date(params.dob).toISOString(),
            });

            expect(patient).not.toBeNull();
        });

        it("should return the patient if request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "accountId",
                params.accountId.toString()
            );
            expect(res.body).toHaveProperty("name", params.name);
            expect(res.body).toHaveProperty("gender", params.gender);
            expect(res.body).toHaveProperty(
                "dob",
                new Date(params.dob).toISOString()
            );
        });

        it("should add patient to account if request is valid", async () => {
            const res = await exec();
            account = await Account.findById(account._id);
            expect(res.status).toBe(201);
            expect(account.patients[0].toString()).toEqual(res.body._id);
        });
    });

    describe("PATCH /:id", () => {
        let token, params, account, patient, id;

        beforeEach(async () => {
            account = new Account({ email: "abc@abc.com", password: "123456" });

            patient = new Patient({
                accountId: account._id,
                name: "patient1",
                gender: "male",
                dob: new Date("09/18/1991"),
            });
            account.patients = [patient._id];
            await account.save();
            await patient.save();

            token = account.generateAuthToken();
            id = patient._id;
            params = {};
        });

        const exec = async function () {
            return await request(server)
                .patch("/api/patients/" + id)
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if patient does not belong to account", async () => {
            token = new Account().generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should allow for modification if account is admin", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(200);
        });

        it("should return 400 if accountId is provided", async () => {
            params.accountId = account._id;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no account with accountId exists", async () => {
            params.accountId = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if name is less than 3 characters", async () => {
            params.name = "be";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if name is more than 50 characters", async () => {
            params.name =
                "akshdfjkasdfkjsakdfjahkdfjahkdfhjkasdhfjkashdfjkashdfkashdfkasjhdfkjhasdf";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if gender is not a valid option", async () => {
            params.gender = "unknown";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if dob is not a date", async () => {
            params.dob = "a";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if dob is in the future", async () => {
            params.dob = "09/14/2100";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if unexpected parameter is passed", async () => {
            params.other = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no patient with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should change the property in the db if request is valid", async () => {
            params.name = "patient2";
            await exec();
            const patient = await Patient.findById(id);

            expect(patient).toHaveProperty("name", params.name);
        });

        it("should return the patient if request is valid", async () => {
            params.name = "patient2";
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id", id.toString());
            expect(res.body).toHaveProperty("accountId");
            expect(res.body).toHaveProperty("name", params.name);
            expect(res.body).toHaveProperty("gender");
            expect(res.body).toHaveProperty("dob");
        });
    });

    describe("DELETE /:id", () => {
        let token, id, patient, account;

        beforeEach(async () => {
            account = new Account({ email: "abc@abc.com", password: "123456" });

            patient = new Patient({
                accountId: account._id,
                name: "patient1",
                gender: "female",
                dob: new Date("09/14/1990"),
            });
            account.patients = [patient._id];

            await account.save();
            await patient.save();
            id = patient._id;

            token = account.generateAuthToken();
        });

        const exec = async function () {
            return await request(server)
                .delete("/api/patients/" + id)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if patient does not belong to account", async () => {
            token = new Account().generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should allow for deletion if account is admin", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(200);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no patient with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should remove the patient from the db if request is valid", async () => {
            await exec();

            const patient = await Patient.findById(id);
            expect(patient).toBeNull();
        });

        it("should remove the patient from the account if request is valid", async () => {
            await exec();

            account = await Account.findById(account._id);
            expect(account.patients).toEqual([]);
        });

        it("should return the patient if request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id", patient._id.toString());
            expect(res.body).toHaveProperty(
                "accountId",
                patient.accountId.toString()
            );
            expect(res.body).toHaveProperty("name", patient.name);
            expect(res.body).toHaveProperty("gender", patient.gender);
            expect(new Date(res.body.dob)).toEqual(patient.dob);
        });
    });
});
