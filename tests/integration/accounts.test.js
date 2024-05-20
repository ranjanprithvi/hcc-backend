import _ from "lodash";
import mongoose from "mongoose";
import request from "supertest";
import server from "../../dist/index";
import { logger } from "../../dist/startup/logger.js";
import { conn } from "../../dist/startup/mongo.js";
import { Account, Roles } from "../../dist/models/account-model.js";
import bcrypt from "bcrypt";
import { Hospital } from "../../dist/models/hospital-model.js";

describe("/api/accounts", () => {
    afterEach(async () => {
        await Account.collection.deleteMany({});
        await Hospital.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        let token;
        let account1;
        let account2;
        let hospital;

        beforeEach(async () => {
            hospital = new Hospital({ name: "hospital1" });
            account1 = new Account({
                email: "abc@abc.com",
                password: "12345",
                hospital: hospital._id,
            });
            account2 = new Account({
                email: "abcd@abcd.com",
                password: "123456",
                accessLevel: Roles.Admin,
            });
            await account1.save();
            await account2.save();
        });

        const exec = async function () {
            return await request(server)
                .get("/api/accounts")
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if client is not an admin", async () => {
            token = account1.generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return all the accounts if client is admin", async () => {
            token = account2.generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
            expect(res.body[0]).not.toHaveProperty("password");
        });
    });

    describe("GET /me", () => {
        let token;
        let account1;
        let account2;

        let hospital;

        beforeEach(async () => {
            hospital = new Hospital({ name: "hospital1" });
            await hospital.save();

            account1 = new Account({
                email: "abc@abc.com",
                password: "12345",
            });
            account2 = new Account({
                email: "abcd@abcd.com",
                password: "123456",
                hospital: hospital._id,
                accessLevel: Roles.Hospital,
            });

            await account1.save();
            await account2.save();

            token = account2.generateAuthToken();
        });

        const exec = async function () {
            return await request(server)
                .get(`/api/accounts/me`)
                .set("x-auth-token", token);
        };

        it("should return 401 status if token not passed", async () => {
            token = "";
            const response = await exec();

            expect(response.status).toBe(401);
        });

        it("should return 400 status if account doesnt exist in the db", async () => {
            token = new Account({
                email: "abcde@abcde.com",
                password: "1234567",
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return user account if role is not set in account", async () => {
            token = account1.generateAuthToken();
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                accessLevel: Roles.User,
                profiles: [],
            });
            expect(response.body).not.toHaveProperty("hospital");
            expect(response.body).not.toHaveProperty("password");
        });

        it("should return accessLevel if accessLevel is set in account and return hospital if role is hospital", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            // expect(response.body).toHaveProperty(
            //     "accessLevel",
            //     account2.accessLevel
            // );
            expect(response.body).toMatchObject({
                accessLevel: account2.accessLevel,
            });
            expect(response.body.hospital._id).toBe(
                account2.hospital.toString()
            );
            // expect(response.body).not.toHaveProperty("profiles");
            expect(response.body).not.toHaveProperty("password");
        });
    });

    describe("POST /registerUser", () => {
        let token;
        let params;

        beforeEach(() => {
            token = new Account().generateAuthToken();
            params = {
                email: "abc@abc.com",
                password: "Abc@starbooks1234",
            };
        });

        const exec = function () {
            return request(server)
                .post("/api/accounts/registerUser")
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 400 if email is not passed", async () => {
            delete params.email;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if email has less than 5 characters", async () => {
            params.email = "a@g.s";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if email is invalid", async () => {
            params.email = "au";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if email is already registered", async () => {
            const account = new Account(params);
            await account.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password is not passed", async () => {
            delete params.password;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password is less than 5 characters long", async () => {
            params.password = "123";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have a lowercase character", async () => {
            params.password = "ABC@1234";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have an uppercase character", async () => {
            params.password = "abc@starbooks1234";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have a numeric character", async () => {
            params.password = "Abc@starbooks";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have a special character", async () => {
            params.password = "Abcstarbooks1234";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalName is provided", async () => {
            params.hospitalName = "hospital1";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params.oldPassword = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save account if request is valid", async () => {
            await exec();

            const account = await Account.findOne({ email: "abc@abc.com" });
            expect(account).not.toBeNull();
        });

        it("should return non admin account if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("email", "abc@abc.com");
            expect(response.body).toHaveProperty("accessLevel", Roles.User);
            expect(response.body).not.toHaveProperty("password");
        });
    });

    describe("POST /registerHospital", () => {
        let token;
        let params;
        let hospital;

        beforeEach(async () => {
            hospital = new Hospital({ name: "hospital1" });
            await hospital.save();

            token = new Account({
                accessLevel: Roles.Admin,
            }).generateAuthToken();
            params = {
                email: "abc@abc.com",
                password: "Abc@starbooks1234",
                accessLevel: Roles.Hospital,
                hospitalId: hospital._id,
            };
        });

        const exec = function () {
            return request(server)
                .post("/api/accounts/registerHospital")
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

        it("should return 400 if email is not passed", async () => {
            delete params.email;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if email has less than 5 characters", async () => {
            params.email = "a@g.s";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if email is invalid", async () => {
            params.email = "au";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if email is already registered", async () => {
            const account = new Account(_.pick(params, ["email", "password"]));
            await account.save();

            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password is not passed", async () => {
            delete params.password;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password is less than 5 characters long", async () => {
            params.password = "123";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have a lowercase character", async () => {
            params.password = "ABC@1234";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have an uppercase character", async () => {
            params.password = "abc@starbooks1234";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have a numeric character", async () => {
            params.password = "Abc@starbooks";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have a special character", async () => {
            params.password = "Abcstarbooks1234";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalId is not provided", async () => {
            delete params.hospitalId;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalId is not a valid Id", async () => {
            params.hospitalId = 1234;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if no hospital with the given hospitalId exists", async () => {
            params.hospitalId = new mongoose.Types.ObjectId();
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if accessLevel is not among the existing Roles", async () => {
            params.accessLevel = 8;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if accessLevel is not Roles.Hospital", async () => {
            params.accessLevel = Roles.Admin;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params.other = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save account if request is valid", async () => {
            await exec();

            const account = await Account.findOne({ email: params.email });
            expect(account).not.toBeNull();
        });

        it("should return non admin account if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("email", params.email);
            expect(response.body).toHaveProperty("accessLevel", Roles.Hospital);
            expect(response.body).not.toHaveProperty("password");
        });
    });

    describe("PATCH /changePassword", () => {
        let id;
        // let token;
        let params;

        // beforeAll(async () => {});

        beforeEach(async () => {
            const salt = await bcrypt.genSalt(10);
            const password = await bcrypt.hash("Abc@starbooks1234", salt);

            const account = new Account({
                email: "abc@abc.com",
                password: password,
            });
            await account.save();
            id = account._id;

            // token = account.generateAuthToken();
            params = {
                email: "abc@abc.com",
                oldPassword: "Abc@starbooks1234",
                password: "Abc@starbooks123",
            };
        });

        const exec = function () {
            return (
                request(server)
                    .patch("/api/accounts/changePassword")
                    // .set("x-auth-token", token)
                    .send(params)
            );
        };

        // it("should return 401 if client is not logged in", async () => {
        //     token = "";
        //     const response = await exec();

        //     expect(response.status).toBe(401);
        // });

        it("should return 400 if email is not provided", async () => {
            delete params.email;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password is not provided", async () => {
            delete params.password;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if oldPassword is not provided", async () => {
            delete params.oldPassword;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password is less than 5 characters long", async () => {
            params.password = "123";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have a lowercase character", async () => {
            params.password = "ABC@1234";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have an uppercase character", async () => {
            params.password = "abc@starbooks1234";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have a numeric character", async () => {
            params.password = "Abc@starbooks";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have a special character", async () => {
            params.password = "Abcstarbooks1234";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params.title = "new";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 if email is not found", async () => {
            params.email = "as@ad.com";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if oldPassword is incorrect", async () => {
            params.oldPassword = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        // it("should change password if password is valid", async () => {
        //     await exec();

        //     const account = await Account.findById(id);

        //     const validPassword = await bcrypt.compare(
        //         params.password,
        //         account.password
        //     );
        //     expect(validPassword).toBe(true);
        // });

        it("should return account if password is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("email", "abc@abc.com");
            expect(response.body).not.toHaveProperty("password");
        });
    });

    // describe("PATCH /forgotPassword", () => {});

    describe("PATCH /forgotPassword", () => {
        let id;
        let token;
        let params;

        // beforeAll(async () => {});

        beforeEach(async () => {
            const salt = await bcrypt.genSalt(10);
            const password = await bcrypt.hash("Abc@starbooks1234", salt);

            const account = new Account({
                email: "abc@abc.com",
                password: password,
            });
            await account.save();
            id = account._id;

            token = account.generateAuthToken();
            params = {
                password: "Abc@starbooks123",
            };
        });

        const exec = function () {
            return request(server)
                .patch("/api/accounts/forgotPassword")
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client doesnt provide token", async () => {
            token = "";
            const response = await exec();

            expect(response.status).toBe(401);
        });

        it("should return 400 if password is not provided", async () => {
            delete params.password;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password is less than 5 characters long", async () => {
            params.password = "123";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have a lowercase character", async () => {
            params.password = "ABC@1234";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have an uppercase character", async () => {
            params.password = "abc@starbooks1234";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have a numeric character", async () => {
            params.password = "Abc@starbooks";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password doesnt have a special character", async () => {
            params.password = "Abcstarbooks1234";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params = { email: "abc@abc.com", title: "new" };
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 status if no account with given id is found", async () => {
            token = new Account().generateAuthToken();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        // it("should change password if password is valid", async () => {
        //     await exec();

        //     const account = await Account.findById(id);

        //     const validPassword = await bcrypt.compare(
        //         params.password,
        //         account.password
        //     );
        //     expect(validPassword).toBe(true);
        // });

        it("should return account if password is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("email", "abc@abc.com");
            expect(response.body).not.toHaveProperty("password");
        });
    });

    // describe("PATCH /changerole/:id", () => {
    //     let id;
    //     let token;
    //     let params;

    //     // beforeAll(async () => {});

    //     beforeEach(async () => {
    //         const salt = await bcrypt.genSalt(10);
    //         const password = await bcrypt.hash("Abc@starbooks1234", salt);

    //         const account = new Account({
    //             email: "abc@abc.com",
    //             password: password,
    //         });
    //         await account.save();
    //         id = account._id;

    //         token = new Account({ accessLevel: Roles.Admin }).generateAuthToken();
    //         params = {};
    //     });

    //     const exec = function () {
    //         return request(server)
    //             .patch("/api/accounts/" + id)
    //             .set("x-auth-token", token)
    //             .send(params);
    //     };

    //     it("should return 401 if client is not logged in", async () => {
    //         token = "";
    //         const response = await exec();

    //         expect(response.status).toBe(401);
    //     });

    //     it("should return 403 if client is not an admin", async () => {
    //         token = new Account().generateAuthToken();

    //         const response = await exec();

    //         expect(response.status).toBe(403);
    //     });

    //     it("should return 400 if email has less than 5 characters", async () => {
    //         params.email = "a@g.s";
    //         const response = await exec();

    //         expect(response.status).toBe(400);
    //     });

    //     it("should return 400 if email is invalid", async () => {
    //         params.email = "au";
    //         const response = await exec();

    //         expect(response.status).toBe(400);
    //     });

    //     it("should return 400 if email is not unique", async () => {
    //         const account = new Account({
    //             email: "abcd@abcd.com",
    //             password: "Abc@starbooks1234",
    //         });
    //         await account.save();

    //         params.email = "abcd@abcd.com";

    //         const response = await exec();

    //         expect(response.status).toBe(400);
    //     });

    //     it("should return 400 if password is less than 5 characters long", async () => {
    //         params.password = "123";
    //         const response = await exec();

    //         expect(response.status).toBe(400);
    //     });

    //     it("should return 400 if password doesnt have a lowercase character", async () => {
    //         params.password = "ABC@1234";
    //         const response = await exec();

    //         expect(response.status).toBe(400);
    //     });

    //     it("should return 400 if password doesnt have an uppercase character", async () => {
    //         params.password = "abc@starbooks1234";
    //         const response = await exec();

    //         expect(response.status).toBe(400);
    //     });

    //     it("should return 400 if password doesnt have a numeric character", async () => {
    //         params.password = "Abc@starbooks";
    //         const response = await exec();

    //         expect(response.status).toBe(400);
    //     });

    //     it("should return 400 if password doesnt have a special character", async () => {
    //         params.password = "Abcstarbooks1234";
    //         const response = await exec();

    //         expect(response.status).toBe(400);
    //     });

    //     it("should return 400 if additional parameters are passed", async () => {
    //         params = { email: "abc@abc.com", title: "new" };
    //         const response = await exec();

    //         expect(response.status).toBe(400);
    //     });

    //     it("should return 404 status if id is not valid", async () => {
    //         id = 1;
    //         const response = await exec();
    //         expect(response.status).toBe(404);
    //     });

    //     it("should return 404 status if no account with given id is found", async () => {
    //         id = mongoose.Types.ObjectId();
    //         const response = await exec();
    //         expect(response.status).toBe(404);
    //     });

    //     it("should save account if id is valid", async () => {
    //         params = { email: "abc2@abc.com", password: "Abc@starbooks123" };
    //         await exec();

    //         const account = await Account.findOne({ name: "account2" });
    //         expect(account).not.toBeNull();
    //     });

    //     it("should return account if id is valid", async () => {
    //         params = { name: "account2" };
    //         const response = await exec();

    //         expect(response.status).toBe(200);
    //         expect(response.body).toHaveProperty("name", "account2");
    //     });
    // });

    describe("DELETE /:id", () => {
        let id;
        let token;

        // beforeAll(async () => {});

        beforeEach(async () => {
            const salt = await bcrypt.genSalt(10);
            const password = await bcrypt.hash("Abc@starbooks1234", salt);

            const account = new Account({
                email: "abc@abc.com",
                password: password,
            });
            await account.save();
            id = account._id;

            token = new Account({
                accessLevel: Roles.Admin,
            }).generateAuthToken();
        });

        const exec = function () {
            return request(server)
                .delete("/api/accounts/" + id)
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

        it("should return 404 status if no account with given id is found", async () => {
            id = new mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should remove account from the db if id is valid", async () => {
            await exec();

            const account = await Account.findOne({ email: "abc@abc.com" });
            expect(account).toBeNull();
        });

        it("should return account if id is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("email", "abc@abc.com");
        });
    });
});
