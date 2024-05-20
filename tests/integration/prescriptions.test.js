import mongoose from "mongoose";
import moment from "moment";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Prescription } from "../../models/prescription-model.js";
import { Profile } from "../../models/profile-model.js";
import { Account, Roles } from "../../models/account-model.js";
import { Specialization } from "../../models/specialization-model.js";
import { Hospital } from "../../models/hospitalModel";
import { Doctor } from "../../models/doctorModel";

describe("/api/prescriptions", () => {
    afterEach(async () => {
        await Prescription.collection.deleteMany({});
        await Profile.collection.deleteMany({});
        await Hospital.collection.deleteMany({});
        await Doctor.collection.deleteMany({});
        await Account.collection.deleteMany({});
        await Specialization.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        let token, queryStr, profileId, profileId2, account;

        beforeEach(async () => {
            profileId = mongoose.Types.ObjectId();
            profileId2 = mongoose.Types.ObjectId();
            account = new Account({
                accessLevel: Roles.User,
                profiles: [profileId],
            });
            token = account.generateAuthToken();
            queryStr = "/?profileId=" + profileId;

            await Prescription.collection.insertMany([
                {
                    profile: profileId2,
                    doctor: mongoose.Types.ObjectId(),
                    content: "report1234",
                    dateOnDocument: moment().subtract(1, "days").toDate(),
                    folderPath: "abc/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId,
                    doctor: mongoose.Types.ObjectId(),
                    content: "report1234",
                    folderPath: "abcd/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId,
                    doctorName: "doctor1",
                    hospitalName: "hospital1",
                    specialization: mongoose.Types.ObjectId(),
                    content: "report1234",
                    folderPath: "abc/report2",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId2,
                    doctor: mongoose.Types.ObjectId(),
                    content: "report1234",
                    folderPath: "abcs/report",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId2,
                    doctor: mongoose.Types.ObjectId(),
                    content: "report1234",
                    folderPath: "abcs/report2",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
            ]);
        });
        const exec = async function () {
            return await request(server)
                .get("/api/prescriptions" + queryStr)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 400 if client is a user and profileId is not provided in query", async () => {
            queryStr = "";

            const res = await exec();
            expect(res.status).toBe(400);
        });

        it("should return 403 if client is a user and profileId is not in the user's list of profiles", async () => {
            queryStr = "/?profileId=" + profileId2;

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return 400 if client is a hospital and profileId is not provided in query", async () => {
            token = new Account({
                accessLevel: Roles.Hospital,
            }).generateAuthToken();
            queryStr = "";

            const res = await exec();
            expect(res.status).toBe(400);
        });

        it("should return only prescriptions of the profileId if profileId exists in user's profiles list", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });

        it("should return the prescriptions of the profileId if client is a hospital", async () => {
            token = new Account({
                accessLevel: Roles.Hospital,
            }).generateAuthToken();
            queryStr = "/?profileId=" + profileId2;

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(3);
        });

        it("should return all the prescriptions if client is an admin", async () => {
            token = new Account({
                accessLevel: Roles.Admin,
            }).generateAuthToken();
            queryStr = "";

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(5);
        });
    });

    // describe("GET /:id", () => {
    //     let token, id, prescription;

    //     beforeEach(async () => {
    //         prescription = new Prescription({
    //             timeSlot: moment().add(7, "days"),
    //             profileId: mongoose.Types.ObjectId(),
    //             content: {
    //                 _id: mongoose.Types.ObjectId().toString(),
    //                 name: "report1234",
    //             },
    //         });
    //         await prescription.save();
    //         id = prescription._id;

    //         token = new Account({
    //             profiles: [prescription.profileId],
    //         }).generateAuthToken();
    //     });

    //     const exec = async function () {
    //         return await request(server)
    //             .get("/api/prescriptions/" + id)
    //             .set("x-auth-token", token);
    //     };

    //     it("should return 401 if client is not logged in", async () => {
    //         token = "";
    //         const res = await exec();
    //         expect(res.status).toBe(401);
    //     });

    //     it("should return 403 if prescription does not belong to doctor", async () => {
    //         token = new Account().generateAuthToken();
    //         const res = await exec();
    //         expect(res.status).toBe(403);
    //     });

    //     it("should allow for retrieval if account is admin", async () => {
    //         token = new Account({
    //             accessLevel: Roles.Admin,
    //         }).generateAuthToken();
    //         const res = await exec();
    //         expect(res.status).toBe(200);
    //     });

    //     it("should return 404 status if id is not valid", async () => {
    //         id = 1;
    //         const response = await exec();
    //         expect(response.status).toBe(404);
    //     });

    //     it("should return 404 status if no prescription with given id is found", async () => {
    //         id = mongoose.Types.ObjectId();
    //         const response = await exec();
    //         expect(response.status).toBe(404);
    //     });

    //     it("should return the prescription if request is valid", async () => {
    //         const res = await exec();
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("_id", prescription._id.toString());
    //         expect(res.body).toHaveProperty(
    //             "profileId",
    //             prescription.profileId.toString()
    //         );

    //         expect(res.body.content._id).toEqual(
    //             prescription.content._id.toString()
    //         );
    //         expect(new Date(res.body.timeSlot)).toEqual(prescription.timeSlot);
    //     });
    // });

    describe("POST /", () => {
        let token,
            params,
            profile,
            hospital,
            doctor,
            specialization,
            hospitalAccount;

        beforeEach(async () => {
            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                account: mongoose.Types.ObjectId(),
            });
            await profile.save();

            doctor = new Doctor({
                name: "doctor1",
                specialization: mongoose.Types.ObjectId(),
                qualifications: "MBBS",
                practicingSince: "1995",
            });

            hospital = new Hospital({
                name: "hospital1",
                doctors: [doctor._id],
            });
            await hospital.save();

            doctor.hospital = hospital._id;
            await doctor.save();

            hospitalAccount = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: Roles.Hospital,
                hospital: hospital._id,
            });

            specialization = new Specialization({
                name: "Cardiology",
            });
            await specialization.save();

            token = hospitalAccount.generateAuthToken();

            params = {
                profileId: profile._id,
                doctorId: doctor._id,
                dateOnDocument: "02/19/2019",
                content: "report1234",
                s3Path: "abc/",
                recordName: "ECG",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            };
        });

        const exec = async function () {
            return await request(server)
                .post("/api/prescriptions")
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";

            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if account is not at least a hospital", async () => {
            token = new Account({
                accessLevel: Roles.User,
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 400 if profileId is not provided", async () => {
            delete params.profileId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if profileId is not valid", async () => {
            params.profileId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no profile with the given profileId exists", async () => {
            params.profileId = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if doctorId is not provided", async () => {
            delete params.doctorId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if doctorId is not valid", async () => {
            params.doctorId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no doctor with the given doctorId exists", async () => {
            params.doctorId = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 403 if account's hospital is not the same as doctor's hospital", async () => {
            doctor.hospital = mongoose.Types.ObjectId();
            await doctor.save();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 400 if dateOnDocument is not valid", async () => {
            params.dateOnDocument = "abc";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if dateOnDocument is in the future", async () => {
            params.dateOnDocument = "05/17/2050";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if content is not valid", async () => {
            params.content = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if content is less than 10 characters", async () => {
            params.content = "a".repeat(9);
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if content is more than 5000 characters", async () => {
            params.content = "a".repeat(5001);

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if s3Path is not provided", async () => {
            delete params.s3Path;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if s3Path is not valid", async () => {
            params.s3Path = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordName is not provided", async () => {
            delete params.recordName;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordName is not valid", async () => {
            params.recordName = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordName is less than 3 characters", async () => {
            params.recordName = "ab";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordName is greater than 50 characters", async () => {
            params.recordName =
                "kashdfjahskdfjkashdfkasdhfjksakjsahfdjkasdhfjksdfhskdf";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordName is not unique in this s3Path", async () => {
            await Prescription.collection.insertOne({
                folderPath: "abc/ECG",
            });

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if files is not an array", async () => {
            params.files = "abc";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        // it("should return 400 if files is an empty array", async () => {
        //     params.files = [];
        //     const response = await exec();
        //     expect(response.status).toBe(400);
        // });

        it("should return 400 if a file does not contain name", async () => {
            params.files = [{ sizeInBytes: 10400 }];
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if a file name is not a string", async () => {
            params.files = [{ name: 400, sizeInBytes: 10400 }];
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if a file sizeInBytes is not a number", async () => {
            params.files = [{ name: "abc", sizeInBytes: "abc" }];
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if a file sizeInBytes is not a positive number", async () => {
            params.files = [{ name: "abc", sizeInBytes: 0 }];
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if a file does not contain sizeInBytes", async () => {
            params.files = [{ name: "abc" }];
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params.other = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should add prescriptionId to the profile's prescriptions if request is valid", async () => {
            const res = await exec();
            const p = await Profile.findById(profile._id);

            expect(res.status).toBe(201);
            expect(p.prescriptions[0].toString()).toEqual(
                res.body._id.toString()
            );
        });

        it("should store the prescription in the db if request is valid", async () => {
            const res = await exec();
            const prescriptions = await Prescription.find({
                folderPath: params.s3Path + params.recordName,
            });

            expect(res.status).toBe(201);
            expect(prescriptions.length).toBe(1);
        });

        it("should return the prescription when request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(201);

            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profile",
                params.profileId.toString()
            );
            expect(res.body).toHaveProperty(
                "doctor",
                params.doctorId.toString()
            );
            expect(res.body).toHaveProperty("content", params.content);
            expect(moment(res.body.dateOnDocument).format()).toEqual(
                moment(params.dateOnDocument).format()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                params.s3Path + params.recordName
            );
            params.files.forEach((file) => {
                expect(res.body.files).toEqual(
                    expect.arrayContaining([expect.objectContaining(file)])
                );
            });
        });
    });

    describe("PATCH /", () => {
        let token,
            params,
            hospitalAccount,
            doctor,
            hospital,
            profile,
            prescription,
            id,
            specialization;

        beforeEach(async () => {
            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                account: mongoose.Types.ObjectId(),
            });
            await profile.save();

            hospitalAccount = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: Roles.Hospital,
            });

            hospital = new Hospital({ name: "Hospital1" });
            await hospital.save();

            hospitalAccount.hospital = hospital._id;

            doctor = new Doctor({
                name: "Doctor1",
                hospital: hospital._id,
                specialization: mongoose.Types.ObjectId(),
                qualifications: "MBBS, MD",
                practicingSince: 1999,
            });
            await doctor.save();

            prescription = new Prescription({
                profile: profile._id,
                doctor: doctor._id,
                content: "record1234",
                dateOnDocument: "12/25/2022",
                folderPath: "abc/report",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            });
            await prescription.save();

            specialization = new Specialization({
                name: "Orthopaedics",
            });
            await specialization.save();

            token = hospitalAccount.generateAuthToken();

            params = {
                content: "record12345",
                dateOnDocument: "10/23/2021",
            };

            id = prescription._id;
        });

        const exec = async function () {
            return await request(server)
                .patch("/api/prescriptions/" + id)
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";

            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if account is not at least a hospital", async () => {
            token = new Account({
                accessLevel: Roles.User,
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 400 if content is not valid", async () => {
            params.content = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if content is less than 10 characters", async () => {
            params.content = "a".repeat(9);

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if content is more than 5000 characters", async () => {
            params.content = "a".repeat(5001);

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if dateOnDocument is not valid", async () => {
            params.dateOnDocument = "abc";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if dateOnDocument is in the future", async () => {
            params.dateOnDocument = "05/17/2050";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if invalid parameters are passed", async () => {
            params.s3Path = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params.other = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no prescription with given id is found", async () => {
            id = mongoose.Types.ObjectId();

            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 403 if account is hospital and doctor does not belong to hospital", async () => {
            doctor.hospital = mongoose.Types.ObjectId();
            await doctor.save();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should change the params of the prescription in the db if request is valid", async () => {
            await exec();
            const p = await Prescription.findById(prescription._id);

            //Updated fields
            expect(p).toHaveProperty("content", params.content.toString());
            expect(moment(p.dateOnDocument).format()).toEqual(
                moment(params.dateOnDocument).format()
            );
        });

        it("should return the prescription if it doesnt have doctorId, client is user and request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(200);

            expect(res.body).toHaveProperty("content", params.content);
            expect(moment(res.body.dateOnDocument).format()).toEqual(
                moment(params.dateOnDocument).format()
            );

            //Other fields
            expect(res.body).toHaveProperty("_id", prescription._id.toString());
            expect(res.body).toHaveProperty(
                "profile",
                prescription.profile.toString()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                prescription.folderPath
            );
            expect(res.body).toHaveProperty("files");
        });
    });

    describe("DELETE /:id", () => {
        let token,
            hospitalAccount,
            doctor,
            hospital,
            profile,
            prescription,
            id,
            specialization;

        beforeEach(async () => {
            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                account: mongoose.Types.ObjectId(),
            });

            hospitalAccount = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: Roles.Hospital,
            });

            hospital = new Hospital({ name: "Hospital1" });
            await hospital.save();

            hospitalAccount.hospital = hospital._id;

            doctor = new Doctor({
                name: "Doctor1",
                hospital: hospital._id,
                specialization: mongoose.Types.ObjectId(),
                qualifications: "MBBS, MD",
                practicingSince: 1999,
            });
            await doctor.save();

            prescription = new Prescription({
                profile: profile._id,
                doctor: doctor._id,
                content: "record1234",
                dateOnDocument: "12/25/2022",
                folderPath: "abc/report",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            });
            await prescription.save();

            profile.prescriptions = [prescription._id];
            await profile.save();

            specialization = new Specialization({
                name: "Orthopaedics",
            });
            await specialization.save();

            token = hospitalAccount.generateAuthToken();

            id = prescription._id;
        });

        const exec = async function () {
            return await request(server)
                .delete("/api/prescriptions/" + id)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if account is not at least a hospital", async () => {
            token = new Account({
                accessLevel: Roles.User,
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no prescription with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 403 if doctor of medical record does not belong to hospital account", async () => {
            doctor.hospital = mongoose.Types.ObjectId();
            await doctor.save();

            token = hospitalAccount.generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should remove the prescription from the profile if request is valid", async () => {
            await exec();

            const p = await Profile.findById(prescription.profile);
            expect(p.prescriptions).toEqual([]);
        });

        it("should remove the prescription from the db if request is valid", async () => {
            await exec();

            const mr = await Prescription.findById(prescription._id);
            expect(mr).toBeNull();
        });

        it("should return the deleted prescription if request is valid", async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profile",
                prescription.profile.toString()
            );
            expect(res.body).toHaveProperty(
                "doctor",
                prescription.doctor.toString()
            );
            expect(res.body.content).toEqual(prescription.content);
            expect(res.body.dateOnDocument).toEqual(
                prescription.dateOnDocument.toISOString()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                prescription.folderPath
            );
            prescription.files.forEach((file) => {
                expect(res.body.files).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            name: file.name,
                            sizeInBytes: file.sizeInBytes,
                        }),
                    ])
                );
            });
        });
    });
});
