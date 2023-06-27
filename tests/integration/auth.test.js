import request from "supertest";
import server from "../../index";
import { conn } from "../../startup/mongo";
import { logger } from "../../startup/logger";
import { Hospital } from "../../models/hospitalModel.js";
import { Account, roles } from "../../models/accountModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "config";

describe("auth", () => {
    afterAll(() => {
        conn.close();
        logger.close();
        server.close();
    });
    describe("middleware", () => {
        let token;

        beforeEach(() => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
        });

        afterEach(async () => {
            await Hospital.collection.deleteMany({});
            // server.close();
        });

        const exec = function () {
            return request(server)
                .post("/api/hospitals")
                .set("x-auth-token", token)
                .send({ name: "hospital1" });
        };

        it("should return 401 if no token is passed", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 400 if invalid token is passed", async () => {
            token = "1234";
            const res = await exec();
            expect(res.status).toBe(400);
        });

        it("should return 201 if valid token is passed", async () => {
            const res = await exec();
            expect(res.status).toBe(201);
        });
    });

    describe("login", () => {
        let account;
        let params;

        beforeEach(async () => {
            const salt = await bcrypt.genSalt(10);
            const password = await bcrypt.hash("Abc@starbooks1234", salt);

            account = new Account({
                name: "account1",
                email: "abc@abc.com",
                password: password,
            });
            await account.save();
            params = { email: "abc@abc.com", password: "Abc@starbooks1234" };
        });

        afterEach(async () => {
            await Account.collection.deleteMany({});
            // server.close();
        });

        const exec = function () {
            return request(server).post("/api/auth/login").send(params);
        };
        it("should return 400 if account email is not passed", async () => {
            delete params.email;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if account password is not passed", async () => {
            delete params.password;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if email is invalid", async () => {
            params.email = "abc@abcd.com";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if password is invalid", async () => {
            params.password = "Abc@starbooks123";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return valid token if credentials are valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            const data = jwt.verify(
                response.body.token,
                config.get("JWTPrivateKey")
            );
            expect(data).toHaveProperty("_id");
            expect(data).toHaveProperty("email", "abc@abc.com");
            expect(data).toHaveProperty("accessLevel", roles.user);
        });
    });
});
