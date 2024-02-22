import mongoose from "mongoose";
import moment from "moment";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Prescription } from "../../models/prescription-model.js";
import { Profile } from "../../models/profile-model.js";
import { Account, roles } from "../../models/account-model.js";
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

    describe.only("GET /", () => {
        let token, queryStr, profileId, profileId2, account;

        beforeEach(async () => {
            profileId = mongoose.Types.ObjectId();
            profileId2 = mongoose.Types.ObjectId();
            account = new Account({
                accessLevel: roles.user,
                profiles: [profileId],
            });
            token = account.generateAuthToken();
            queryStr = "/?profileId=" + profileId;

            await Prescription.collection.insertMany([
                {
                    profile: profileId2,
                    doctor: mongoose.Types.ObjectId(),
                    content: "a".repeat(11),
                    dateOnDocument: moment().subtract(1, "days").toDate(),
                },
                {
                    profile: profileId,
                    doctor: mongoose.Types.ObjectId(),
                    folderPath: "abcd/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId,
                    doctorName: "doctor1",
                    hospitalName: "hospital1",
                    specialization: mongoose.Types.ObjectId(),
                    folderPath: "abc/report2",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId2,
                    doctor: mongoose.Types.ObjectId(),
                    content: "a".repeat(11),
                },
                {
                    profile: profileId2,
                    doctor: mongoose.Types.ObjectId(),
                    content: "a".repeat(11),
                    folderPath: "abcs/report2",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                    dateOnDocument: moment().subtract(1, "days").toDate(),
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
                accessLevel: roles.hospital,
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
                accessLevel: roles.hospital,
            }).generateAuthToken();
            queryStr = "/?profileId=" + profileId2;

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(3);
        });

        it("should return all the prescriptions if client is an admin", async () => {
            token = new Account({
                accessLevel: roles.admin,
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
    //             recordType: {
    //                 _id: mongoose.Types.ObjectId().toString(),
    //                 name: "report",
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
    //             accessLevel: roles.admin,
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

    //         expect(res.body.recordType._id).toEqual(
    //             prescription.recordType._id.toString()
    //         );
    //         expect(new Date(res.body.timeSlot)).toEqual(prescription.timeSlot);
    //     });
    // });

    describe("POST /", () => {
        let token,
            params,
            params2,
            profile,
            hospital,
            doctor,
            specialization,
            userAccount,
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

            userAccount = new Account({
                email: "abcd@abc.com",
                password: "123456",
                accessLevel: roles.user,
                profiles: [profile._id],
            });

            hospitalAccount = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
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
                content: "a".repeat(11),
            };
            params2 = {
                profileId: profile._id,
                doctorName: "doctor1",
                hospitalName: "hospital2",
                specializationId: specialization._id,
                dateOnDocument: "02/19/2019",
                s3Path: "abc/",
                recordName: "pre1",
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

        it("should return 403 if profileId is not in the user's list of profiles", async () => {
            userAccount.profiles = [];
            token = userAccount.generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
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

        it("should return 400 if doctorName is not provided when doctorId is not provided", async () => {
            delete params2.doctorName;
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if doctorName is provided when doctorId is provided", async () => {
            params.doctorName = "doctor1";

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalName is not provided when doctorId is not provided", async () => {
            delete params2.hospitalName;
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalName is provided when doctorId is provided", async () => {
            params.hospitalName = "hospital1";

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if specializationId is not provided when doctorId is not provided", async () => {
            delete params2.specializationId;
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if specializationId is provided when doctorId is provided", async () => {
            params.specializationId = mongoose.Types.ObjectId();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no specialization with the given specializationId exists", async () => {
            params2.specializationId = mongoose.Types.ObjectId();
            params = params2;

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

        it("should return 400 if content is greater than 5000 characters", async () => {
            params.content = "a".repeat(5001);
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if s3Path is not provided when content is not provided", async () => {
            delete params2.s3Path;
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if s3Path is provided when content is provided", async () => {
            params.s3Path = "s3Path";

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if s3Path is not valid", async () => {
            params2.s3Path = 1;
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordName is not provided when content is not provided", async () => {
            delete params2.recordName;
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordName is provided when content is provided", async () => {
            params.recordName = "recordName";

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordName is not valid", async () => {
            params2.recordName = 1;
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordName is less than 3 characters", async () => {
            params2.recordName = "ab";
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordName is greater than 50 characters", async () => {
            params2.recordName = "a".repeat(51);
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordName is not unique in this s3Path", async () => {
            await Prescription.collection.insertOne({
                folderPath: "abc/pre1",
            });
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if files is not provided when content is not provided", async () => {
            delete params2.files;
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if files is provided when content is provided", async () => {
            params2.files = [{ name: "file1.jpeg", sizeInBytes: 10400 }];
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if files is not an array", async () => {
            params2.files = "abc";
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if files is an empty array", async () => {
            params2.files = [];
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if a file does not contain name", async () => {
            params2.files = [{ sizeInBytes: 10400 }];
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if a file name is not a string", async () => {
            params2.files = [{ name: 400, sizeInBytes: 10400 }];
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if a file sizeInBytes is not a number", async () => {
            params2.files = [{ name: "abc", sizeInBytes: "abc" }];
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if a file sizeInBytes is not a positive number", async () => {
            params2.files = [{ name: "abc", sizeInBytes: 0 }];
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if a file does not contain sizeInBytes", async () => {
            params2.files = [{ name: "abc" }];
            params = params2;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params.other = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 403 if client is a user and profileId does not belong to the account", async () => {
            token = new Account({
                accessLevel: roles.user,
                profiles: [mongoose.Types.ObjectId()],
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should add prescriptionId to the profile's prescriptions if request is valid", async () => {
            const res = await exec();
            const p = await Profile.findById(profile._id);

            expect(p.prescriptions[0].toString()).toEqual(
                res.body._id.toString()
            );
        });

        it("should store the prescription in the db if request is valid", async () => {
            await exec();
            const prescriptions = await Prescription.find({
                content: params.content,
            });

            expect(prescriptions.length).toBe(1);
        });

        it("should store the prescription in the db if request is valid", async () => {
            params = params2;

            await exec();
            const prescriptions = await Prescription.find({
                folderPath: params2.s3Path + params2.recordName,
            });

            expect(prescriptions.length).toBe(1);
        });

        it("should return the prescription when client is hospital, doctorId is not provided and request is valid", async () => {
            params = params2;
            const res = await exec();
            expect(res.status).toBe(201);

            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profile",
                params2.profileId.toString()
            );
            expect(res.body).toHaveProperty("doctorName", params2.doctorName);
            expect(res.body).toHaveProperty(
                "hospitalName",
                params2.hospitalName
            );
            expect(res.body).toHaveProperty(
                "specialization",
                params2.specializationId.toString()
            );
            expect(moment(res.body.dateOnDocument).format()).toEqual(
                moment(params2.dateOnDocument).format()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                params2.s3Path + params2.recordName
            );
            params2.files.forEach((file) => {
                expect(res.body.files).toEqual(
                    expect.arrayContaining([expect.objectContaining(file)])
                );
            });
        });

        it("should return the prescription when client is hospital, doctorId is provided and request is valid", async () => {
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
            expect(moment(res.body.dateOnDocument).format()).toEqual(
                moment(params.dateOnDocument).format()
            );
            expect(res.body).toHaveProperty("content", params.content);
        });

        it("should return the prescription when client is user and request is valid", async () => {
            token = userAccount.generateAuthToken();
            params = params2;

            const res = await exec();
            expect(res.status).toBe(201);

            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profile",
                params2.profileId.toString()
            );
            expect(res.body).toHaveProperty("doctorName", params2.doctorName);
            expect(res.body).toHaveProperty(
                "hospitalName",
                params2.hospitalName
            );
            expect(res.body).toHaveProperty(
                "specialization",
                params2.specializationId.toString()
            );
            expect(moment(res.body.dateOnDocument).format()).toEqual(
                moment(params2.dateOnDocument).format()
            );
            expect(res.body).toHaveProperty("external", true);
            expect(res.body).toHaveProperty(
                "folderPath",
                params2.s3Path + params2.recordName
            );
            params2.files.forEach((file) => {
                expect(res.body.files).toEqual(
                    expect.arrayContaining([expect.objectContaining(file)])
                );
            });
        });
    });

    describe("PATCH /", () => {
        let token,
            params,
            userAccount,
            hospitalAccount,
            doctor,
            hospital,
            profile,
            prescription1,
            prescription2,
            id,
            specialization;

        beforeEach(async () => {
            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
            });

            userAccount = new Account({
                email: "abcd@gmail.com",
                password: "123456",
                profiles: [profile._id],
            });
            profile.account = userAccount._id;
            await profile.save();

            hospitalAccount = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
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

            prescription1 = new Prescription({
                profile: profile._id,
                doctor: doctor._id,
                recordType: "type1",
                dateOnDocument: "12/25/2022",
                folderPath: "abc/report",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            });
            await prescription1.save();

            prescription2 = new Prescription({
                profile: profile._id,
                doctorName: "doctor1",
                hospitalName: "hospital1",
                specialization: mongoose.Types.ObjectId(),
                recordType: "type1",
                dateOnDocument: "12/25/2022",
                external: true,
                folderPath: "abc/report2",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            });
            await prescription2.save();

            specialization = new Specialization({
                name: "Orthopaedics",
            });
            await specialization.save();

            token = userAccount.generateAuthToken();

            params = {
                recordType: "type2",
                dateOnDocument: "10/23/2021",
                doctorName: "doctor2",
                hospitalName: "hospital2",
                specializationId: specialization._id,
            };

            id = prescription2._id;
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

        it("should return 400 if hospitalName is not valid", async () => {
            params.hospitalName = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if doctorName is not valid", async () => {
            params.doctorName = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if specializationId is not valid", async () => {
            params.specializationId = 1;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no specialization with the given specializationId exists", async () => {
            params.specializationId = mongoose.Types.ObjectId();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordType is not valid", async () => {
            params.recordType = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordType is more than 10 characters", async () => {
            params.recordType = "a".repeat(11);

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

        it("should return 403 if account is user and profile does not belong to account", async () => {
            token = new Account({
                accessLevel: roles.user,
                profiles: [],
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 403 if account is user but record is not external", async () => {
            id = prescription1._id;

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 403 if account is hospital but medical record is external", async () => {
            token = hospitalAccount.generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        // it("should return 403 if account is hospital and doctor does not belong to hospital", async () => {
        //     doctor.hospital = mongoose.Types.ObjectId();
        //     await doctor.save();

        //     const response = await exec();
        //     expect(response.status).toBe(403);
        // });

        it("should change the params of the prescription in the db if request is valid", async () => {
            await exec();
            const prescription = await Prescription.findById(prescription2._id);

            //Updated fields
            expect(prescription).toHaveProperty(
                "recordType",
                params.recordType.toString()
            );
            expect(moment(prescription.dateOnDocument).format()).toEqual(
                moment(params.dateOnDocument).format()
            );
            expect(prescription).toHaveProperty(
                "doctorName",
                params.doctorName
            );
            expect(prescription).toHaveProperty(
                "hospitalName",
                params.hospitalName
            );
            expect(prescription.specialization.toString()).toEqual(
                params.specializationId.toString()
            );
        });

        it("should return the prescription if it doesnt have doctorId, client is user and request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(200);

            expect(res.body).toHaveProperty("doctorName", params.doctorName);
            expect(res.body).toHaveProperty(
                "hospitalName",
                params.hospitalName
            );
            expect(res.body).toHaveProperty(
                "specialization",
                params.specializationId.toString()
            );
            expect(res.body).toHaveProperty("recordType", params.recordType);
            expect(moment(res.body.dateOnDocument).format()).toEqual(
                moment(params.dateOnDocument).format()
            );

            //Other fields
            expect(res.body).toHaveProperty(
                "_id",
                prescription2._id.toString()
            );
            expect(res.body).toHaveProperty(
                "profile",
                prescription2.profile.toString()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                prescription2.folderPath
            );
            expect(res.body).toHaveProperty("files");
        });

        // it("should return the prescription when client is hospital, doctorId is provided and request is valid", async () => {
        //     params.doctorId = doctor._id;
        //     delete params.doctorName;
        //     delete params.hospitalName;
        //     delete params.specializationId;

        //     const res = await exec();
        //     expect(res.status).toBe(201);

        //     // Modified fields
        //     expect(res.body).toHaveProperty(
        //         "doctor",
        //         params.doctorId.toString()
        //     );
        //     expect(res.body).toHaveProperty("recordType", params.recordType);
        //     expect(moment(res.body.dateOnDocument).format()).toEqual(
        //         moment(params.dateOnDocument).format()
        //     );

        //     // Other fields
        //     expect(res.body).toHaveProperty("_id");
        //     expect(res.body).toHaveProperty(
        //         "profile",
        //         params.profileId.toString()
        //     );
        //     expect(res.body).toHaveProperty(
        //         "doctor",
        //         params.doctorId.toString()
        //     );
        //     expect(res.body).toHaveProperty("recordType", params.recordType);
        //     expect(res.body).toHaveProperty(
        //         "folderPath",
        //         params.s3Path + params.recordName
        //     );
        //     params.files.forEach((file) => {
        //         expect(res.body.files).toEqual(
        //             expect.arrayContaining([expect.objectContaining(file)])
        //         );
        //     });
        // });
    });

    describe("DELETE /:id", () => {
        let token,
            params,
            userAccount,
            hospitalAccount,
            doctor,
            hospital,
            profile,
            prescriptionH,
            prescriptionU,
            id,
            specialization;

        beforeEach(async () => {
            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
            });

            userAccount = new Account({
                email: "abcd@gmail.com",
                password: "123456",
                profiles: [profile._id],
            });
            profile.account = userAccount._id;

            hospitalAccount = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
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

            prescriptionH = new Prescription({
                profile: profile._id,
                doctor: doctor._id,
                recordType: "type1",
                dateOnDocument: "12/25/2022",
                folderPath: "abc/report",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            });
            await prescriptionH.save();

            prescriptionU = new Prescription({
                profile: profile._id,
                doctorName: "doctor1",
                hospitalName: "hospital1",
                specialization: mongoose.Types.ObjectId(),
                recordType: "type1",
                dateOnDocument: "12/25/2022",
                external: true,
                folderPath: "abc/report2",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            });
            await prescriptionU.save();

            profile.prescriptions = [prescriptionH._id, prescriptionU._id];
            await profile.save();

            specialization = new Specialization({
                name: "Orthopaedics",
            });
            await specialization.save();

            token = userAccount.generateAuthToken();

            id = prescriptionU._id;
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

        it("should return 403 if profile of medical record does not belong to user account", async () => {
            profile.account = mongoose.Types.ObjectId();
            await profile.save();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 403 if doctor of medical record does not belong to hospital account", async () => {
            doctor.account = mongoose.Types.ObjectId();
            await doctor.save();

            token = hospitalAccount.generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 403 if account is user and medical record is not external", async () => {
            id = prescriptionH._id;

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 403 if account is hospital but medical record is external", async () => {
            token = hospitalAccount.generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should remove the prescription from the profile if account is user and record is external", async () => {
            await exec();

            const p = await Profile.findById(prescriptionU.profile);
            expect(p.prescriptions).toEqual([prescriptionH._id]);
        });

        // it("should remove the prescription from the profile if account is hospital and record is external", async () => {
        //     token = hospitalAccount.generateAuthToken();

        //     await exec();

        //     const p = await Profile.findById(prescriptionU.profile);
        //     expect(p.prescriptions).toEqual([prescriptionU._id]);
        // });

        it("should remove the prescription from the profile if account is hospital and record is not external", async () => {
            token = hospitalAccount.generateAuthToken();
            id = prescriptionH._id;

            await exec();

            const p = await Profile.findById(prescriptionH.profile);
            expect(p.prescriptions).toEqual([prescriptionU._id]);
        });

        it("should remove the prescription from the db if account is user and record is external", async () => {
            await exec();

            const mr = await Prescription.findById(prescriptionU._id);
            expect(mr).toBeNull();
        });

        // it("should remove the prescription from the db if account is hospital and record is external", async () => {
        //     token = hospitalAccount.generateAuthToken();
        //     await exec();

        //     const mr = await Prescription.findById(prescriptionU._id);
        //     expect(mr).toBeNull();
        // });

        it("should remove the prescription from the db if account is hospital and record is not external", async () => {
            token = hospitalAccount.generateAuthToken();
            id = prescriptionH._id;
            await exec();

            const mr = await Prescription.findById(prescriptionH._id);
            expect(mr).toBeNull();
        });

        it("should return the deleted prescription if request is valid", async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profile",
                prescriptionU.profile.toString()
            );
            expect(res.body).toHaveProperty(
                "doctorName",
                prescriptionU.doctorName.toString()
            );
            expect(res.body).toHaveProperty(
                "hospitalName",
                prescriptionU.hospitalName.toString()
            );
            expect(res.body).toHaveProperty(
                "specialization",
                prescriptionU.specialization.toString()
            );
            expect(res.body.recordType).toEqual(prescriptionU.recordType);
            expect(res.body.dateOnDocument).toEqual(
                prescriptionU.dateOnDocument.toISOString()
            );
            expect(res.body).toHaveProperty("external", prescriptionU.external);
            expect(res.body).toHaveProperty(
                "folderPath",
                prescriptionU.folderPath
            );
            prescriptionU.files.forEach((file) => {
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
