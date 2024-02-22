import mongoose from "mongoose";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Profile } from "../../models/profile-model.js";
import bcrypt from "bcrypt";
import { Account, roles } from "../../models/account-model.js";
import { admin } from "../../middleware/admin";
import { hospital } from "../../middleware/hospital.js";

describe("/api/profiles", () => {
    afterEach(async () => {
        await Profile.collection.deleteMany({});
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
                .get("/api/profiles")
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

        it("should return all the profiles if client is admin", async () => {
            await Profile.collection.insertMany([
                {
                    account: mongoose.Types.ObjectId(),
                    name: "profile1",
                    gender: "male",
                    dob: "09/16/1990",
                },
                {
                    account: mongoose.Types.ObjectId(),
                    name: "profile2",
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
        let token, id, profile, account;

        beforeEach(async () => {
            account = new Account({ email: "abc@abc.com", password: "123456" });

            profile = new Profile({
                account: account._id,
                name: "profile1",
                gender: "female",
                dob: new Date("09/14/1990"),
            });
            await profile.save();
            account.profiles = [profile._id];
            await account.save();
            id = profile._id;

            token = account.generateAuthToken();
        });

        const exec = async function () {
            return await request(server)
                .get("/api/profiles/" + id)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if profile does not belong to account", async () => {
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

        it("should return 404 status if no profile with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return the profile if request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id", profile._id.toString());
            expect(res.body).toHaveProperty(
                "account",
                profile.account.toString()
            );
            expect(res.body).toHaveProperty("name", profile.name);
            expect(res.body).toHaveProperty("gender", profile.gender);
            expect(new Date(res.body.dob)).toEqual(profile.dob);
        });
    });

    describe("POST /", () => {
        let token, params, account;

        beforeEach(async () => {
            account = new Account({ email: "abc@abc.com", password: "123456" });
            await account.save();
            token = account.generateAuthToken();

            params = {
                name: "profile1",
                gender: "female",
                dob: "09/14/1990",
                phone: "1234567890",
            };
        });

        const exec = async function () {
            return await request(server)
                .post("/api/profiles")
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        // it("should return 403 if account is hospital", async () => {
        //     token = new Account({
        //         accessLevel: roles.hospital,
        //     }).generateAuthToken();

        //     const res = await exec();
        //     expect(res.status).toBe(403);
        // });

        it("should return 400 if account is admin and accountId is not provided", async () => {
            const adminAccount = new Account({
                email: "admin@abc.com",
                password: "123456",
                accessLevel: roles.admin,
            });
            await adminAccount.save();
            token = adminAccount.generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if account is admin and accountId is not a user account", async () => {
            const adminAccount = new Account({
                email: "admin@abc.com",
                password: "123456",
                accessLevel: roles.admin,
            });
            await adminAccount.save();
            token = adminAccount.generateAuthToken();
            params.accountId = adminAccount._id;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if accountId is invalid", async () => {
            params.accountId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if account is not user and no account with accountId exists", async () => {
            token = new Account({
                accessLevel: roles.hospital,
            }).generateAuthToken();
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

        it("should return 400 if phone number is less than 10 characters", async () => {
            params.phone = "123";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if phone number is greater than 14 characters", async () => {
            params.phone = "+91 12345123456";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params.other = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should allow for profile creation if account is admin and accountId is provided", async () => {
            const adminAccount = new Account({
                email: "admin@abc.com",
                password: "123456",
                accessLevel: roles.admin,
            });
            await adminAccount.save();
            token = adminAccount.generateAuthToken();
            params.accountId = account._id;

            const res = await exec();
            expect(res.status).toBe(201);
        });

        it("should store the profile in the db if request is valid", async () => {
            await exec();
            const profile = await Profile.findOne({
                account: account._id,
                name: params.name,
                gender: params.gender,
                dob: new Date(params.dob).toISOString(),
            });

            expect(profile).not.toBeNull();
        });

        it("should return the profile if request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty("account", account._id.toString());
            expect(res.body).toHaveProperty("name", params.name);
            expect(res.body).toHaveProperty("gender", params.gender);
            expect(res.body).toHaveProperty(
                "dob",
                new Date(params.dob).toISOString()
            );
        });

        it("should add profile to account if request is valid", async () => {
            const res = await exec();
            account = await Account.findById(account._id);
            expect(res.status).toBe(201);
            expect(account.profiles[0].toString()).toEqual(res.body._id);
        });
    });

    describe("PATCH /:id", () => {
        let token, params, account, profile, id;

        beforeEach(async () => {
            account = new Account({ email: "abc@abc.com", password: "123456" });

            profile = new Profile({
                account: account._id,
                name: "profile1",
                gender: "male",
                dob: new Date("09/18/1991"),
            });
            account.profiles = [profile._id];
            await account.save();
            await profile.save();

            token = account.generateAuthToken();
            id = profile._id;
            params = {};
        });

        const exec = async function () {
            return await request(server)
                .patch("/api/profiles/" + id)
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if profile does not belong to account", async () => {
            token = new Account().generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        // it("should return 403 if account is hospital", async () => {
        //     token = new Account({
        //         accessLevel: roles.hospital,
        //     }).generateAuthToken();

        //     const res = await exec();
        //     expect(res.status).toBe(403);
        // });

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

        it("should return 400 if phone number is less than 10 characters", async () => {
            params.phone = "123";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if phone number is greater than 14 characters", async () => {
            params.phone = "+91 12345123456";
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

        it("should return 404 status if no profile with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should change the property in the db if request is valid", async () => {
            params.name = "profile2";
            await exec();
            const profile = await Profile.findById(id);

            expect(profile).toHaveProperty("name", params.name);
        });

        it("should return the profile if request is valid", async () => {
            params.name = "profile2";
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id", id.toString());
            expect(res.body).toHaveProperty("account");
            expect(res.body).toHaveProperty("name", params.name);
            expect(res.body).toHaveProperty("gender");
            expect(res.body).toHaveProperty("dob");
        });
    });

    describe("DELETE /:id", () => {
        let token, id, profile, account;

        beforeEach(async () => {
            account = new Account({ email: "abc@abc.com", password: "123456" });

            profile = new Profile({
                account: account._id,
                name: "profile1",
                gender: "female",
                dob: new Date("09/14/1990"),
            });
            account.profiles = [profile._id];

            await account.save();
            await profile.save();
            id = profile._id;

            token = account.generateAuthToken();
        });

        const exec = async function () {
            return await request(server)
                .delete("/api/profiles/" + id)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if profile does not belong to account", async () => {
            token = new Account().generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        // it("should return 403 if account is hospital", async () => {
        //     token = new Account({
        //         accessLevel: roles.hospital,
        //     }).generateAuthToken();

        //     const res = await exec();
        //     expect(res.status).toBe(403);
        // });

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

        it("should return 404 status if no profile with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should remove the profile from the db if request is valid", async () => {
            await exec();

            const profile = await Profile.findById(id);
            expect(profile).toBeNull();
        });

        it("should remove the profile from the account if request is valid", async () => {
            await exec();

            account = await Account.findById(account._id);
            expect(account.profiles).toEqual([]);
        });

        it("should return the profile if request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id", profile._id.toString());
            expect(res.body).toHaveProperty(
                "account",
                profile.account.toString()
            );
            expect(res.body).toHaveProperty("name", profile.name);
            expect(res.body).toHaveProperty("gender", profile.gender);
            expect(new Date(res.body.dob)).toEqual(profile.dob);
        });
    });
});
