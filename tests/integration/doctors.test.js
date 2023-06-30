import mongoose from "mongoose";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Doctor } from "../../models/doctorModel.js";
import { Account, roles } from "../../models/accountModel.js";
import { Hospital } from "../../models/hospitalModel";
import { Specialization } from "../../models/specializationModel";
import moment from "moment";

describe("/api/doctors", () => {
    // beforeEach(() => {
    //     server = require("../../index");
    // });
    // afterEach(() => {
    //     server.close();
    // });
    afterEach(async () => {
        await Doctor.collection.deleteMany({});
        await Hospital.collection.deleteMany({});
        await Specialization.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        it("should return all the doctors which match the query", async () => {
            const hospitalId = mongoose.Types.ObjectId();
            const specializationId = mongoose.Types.ObjectId();
            await Doctor.collection.insertMany([
                {
                    name: "Doctor1",
                    hospital: hospitalId,
                    specialization: specializationId,
                    qualifications: "MBBS, MD",
                    practicingSince: 1999,
                },
                {
                    name: "Doctor2",
                    hospital: mongoose.Types.ObjectId(),
                    specialization: mongoose.Types.ObjectId(),
                    qualifications: "MBBS, DnB",
                    practicingSince: 1998,
                },
                {
                    name: "Doctor3",
                    hospital: mongoose.Types.ObjectId(),
                    specialization: specializationId,
                    qualifications: "MBBS, Wtv",
                    practicingSince: 2008,
                },
                {
                    name: "Doctor4",
                    hospital: hospitalId,
                    specialization: specializationId,
                    qualifications: "MBBS",
                    practicingSince: 2005,
                },
            ]);

            const res = await request(server).get(
                `/api/doctors/?hospital=${hospitalId}&specialization=${specializationId}`
            );
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });
    });

    describe("GET /:id", () => {
        let doctor, id, token, doctorObj;
        beforeEach(async () => {
            doctorObj = {
                name: "Doctor1",
                hospital: mongoose.Types.ObjectId(),
                specialization: mongoose.Types.ObjectId(),
                qualifications: "MBBS, MD",
                practicingSince: 1999,
            };
            doctor = new Doctor(doctorObj);
            await doctor.save();

            id = doctor._id;

            token = new Account().generateAuthToken();
        });

        const exec = function () {
            return request(server)
                .get("/api/doctors/" + id)
                .set("x-auth-token", token);
        };

        it("should return a doctor if valid id is passed", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject(doctorObj);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no doctor with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });
    });

    describe("POST /", () => {
        let token, params;

        beforeEach(async () => {
            const hospital = new Hospital({ name: "Hospital1" });
            await hospital.save();

            const specialization = new Specialization({ name: "Cardiology" });
            await specialization.save();

            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();

            params = {
                name: "Doctor1",
                hospitalId: hospital._id,
                specializationId: specialization._id,
                qualifications: "MBBS, MD",
                practicingSince: 1999,
            };
        });

        const exec = function () {
            return request(server)
                .post("/api/doctors")
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

        it("should return 400 if name is not passed", async () => {
            delete params.name;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if name has less than 3 characters", async () => {
            params.name = "do";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalId is not passed", async () => {
            delete params.hospitalId;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalId is invalid", async () => {
            params.hospitalId = 1;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if hospital with the given hospitalId doesnt exist", async () => {
            params.hospitalId = mongoose.Types.ObjectId();
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if specializationId is not passed", async () => {
            delete params.specializationId;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if specializationId is invalid", async () => {
            params.specializationId = 1;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if specialization with the given specializationId doesnt exist", async () => {
            params.specializationId = mongoose.Types.ObjectId();
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if qualifications is not passed", async () => {
            delete params.qualifications;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if practicingSince is not passed", async () => {
            delete params.practicingSince;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if practicingSince year is less than 1950", async () => {
            params.practicingSince = 1949;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if practicingSince year is greater than current year", async () => {
            params.practicingSince = moment().year() + 1;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params.title = "new";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should save doctor if request is valid", async () => {
            await exec();

            const doctor = await Doctor.find({
                name: "Doctor1",
            });
            expect(doctor).not.toBeNull();
        });

        it("should add doctor to hospital if request is valid", async () => {
            const response = await exec();

            const hospital = await Hospital.findById(params.hospitalId);
            expect(hospital.doctors[0].toString()).toEqual(response.body._id);
        });

        it("should return doctor if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("_id");
            expect(response.body).toHaveProperty("name", params.name);
            expect(response.body).toHaveProperty(
                "hospital",
                params.hospitalId.toString()
            );
            expect(response.body).toHaveProperty(
                "specialization",
                params.specializationId.toString()
            );
            expect(response.body).toHaveProperty(
                "qualifications",
                params.qualifications
            );
            expect(response.body).toHaveProperty(
                "practicingSince",
                params.practicingSince
            );
        });
    });

    describe("PATCH /:id", () => {
        let id, token, params, doctor, hospital1, hospital2;

        // beforeAll(async () => {});

        beforeEach(async () => {
            hospital1 = new Hospital({ name: "Hospital1" });
            await hospital1.save();

            const doctorObj = {
                name: "Doctor1",
                hospital: hospital1._id,
                specialization: mongoose.Types.ObjectId(),
                qualifications: "MBBS, MD",
                practicingSince: 1999,
            };
            doctor = new Doctor(doctorObj);
            await doctor.save();

            id = doctor._id;

            hospital1.doctors.push(doctor._id);
            hospital1.save();

            hospital2 = new Hospital({ name: "Hospital2" });
            await hospital2.save();

            const specialization = new Specialization({ name: "Cardiology" });
            await specialization.save();

            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            params = {
                name: "Doctor2",
                hospitalId: hospital2._id,
                specializationId: specialization._id,
                qualifications: "MBBS",
                practicingSince: 1998,
            };
        });
        const exec = function () {
            return request(server)
                .patch("/api/doctors/" + id)
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

        it("should return 400 if name has less than 3 characters", async () => {
            params.name = "do";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalId is invalid", async () => {
            params.hospitalId = 1;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if hospital with the given hospitalId doesnt exist", async () => {
            params.hospitalId = mongoose.Types.ObjectId();
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if specializationId is invalid", async () => {
            params.specializationId = 1;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if specialization with the given specializationId doesnt exist", async () => {
            params.specializationId = mongoose.Types.ObjectId();
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if practicingSince year is less than 1950", async () => {
            params.practicingSince = 1949;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if practicingSince year is greater than current year", async () => {
            params.practicingSince = moment().year() + 1;
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params.title = "new";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no doctor with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should add doctor to new hospital and remove doctor from old hospital if request is valid", async () => {
            let h1 = await Hospital.findById(hospital1._id);
            expect(h1.doctors.length).toEqual(1);

            const response = await exec();

            h1 = await Hospital.findById(hospital1._id);
            expect(h1.doctors.length).toEqual(0);

            const h2 = await Hospital.findById(params.hospitalId);
            expect(h2.doctors[0].toString()).toEqual(response.body._id);
        });

        it("should return doctor if request is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("_id", id.toString());
            expect(response.body).toHaveProperty("name", params.name);
            expect(response.body).toHaveProperty(
                "hospital",
                params.hospitalId.toString()
            );
            expect(response.body).toHaveProperty(
                "specialization",
                params.specializationId.toString()
            );
            expect(response.body).toHaveProperty(
                "qualifications",
                params.qualifications
            );
            expect(response.body).toHaveProperty(
                "practicingSince",
                params.practicingSince
            );
        });
    });

    describe("DELETE /:id", () => {
        let id, doctor, token;

        beforeEach(async () => {
            const doctorObj = {
                name: "Doctor1",
                hospital: mongoose.Types.ObjectId(),
                specialization: mongoose.Types.ObjectId(),
                qualifications: "MBBS, MD",
                practicingSince: 1999,
            };
            doctor = new Doctor(doctorObj);
            await doctor.save();

            id = doctor._id;

            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
        });

        const exec = function () {
            return request(server)
                .delete("/api/doctors/" + id)
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

        it("should return 404 status if no doctor with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should remove doctor from the db if id is valid", async () => {
            await exec();

            const doctorInDb = await Doctor.findById(id);
            expect(doctorInDb).toBeNull();
        });

        it("should return doctor if id is valid", async () => {
            const response = await exec();

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("_id", id.toString());
            expect(response.body).toHaveProperty("name", doctor.name);
            expect(response.body).toHaveProperty(
                "hospital",
                doctor.hospital.toString()
            );
            expect(response.body).toHaveProperty(
                "specialization",
                doctor.specialization.toString()
            );
            expect(response.body).toHaveProperty(
                "qualifications",
                doctor.qualifications
            );
            expect(response.body).toHaveProperty(
                "practicingSince",
                doctor.practicingSince
            );
        });
    });
});
