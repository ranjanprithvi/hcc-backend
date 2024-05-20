import mongoose from "mongoose";
import moment from "moment";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger.js";
import { conn } from "../../startup/mongo.js";
import { ExternalRecord } from "../../models/external-record-model.js";
import { Profile } from "../../models/profile-model.js";
import { Account, Roles } from "../../models/account-model.js";
import { Specialization } from "../../models/specialization-model.js";
import { Hospital } from "../../models/hospital-model.js";
import { Doctor } from "../../models/doctor-model.js";

describe("/api/externalRecords", () => {
    afterEach(async () => {
        await ExternalRecord.collection.deleteMany({});
        await Hospital.collection.deleteMany({});
        await Doctor.collection.deleteMany({});
        await Profile.collection.deleteMany({});
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

            await ExternalRecord.collection.insertMany([
                {
                    profile: profileId2,
                    doctor: "doc1",
                    hospital: "hospital1",
                    specialization: mongoose.Types.ObjectId(),
                    recordType: "report",
                    dateOnDocument: moment().subtract(1, "days").toDate(),
                    folderPath: "abc/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId,
                    doctor: "doc2",
                    hospital: "hospital2",
                    specialization: mongoose.Types.ObjectId(),
                    recordType: "report",
                    folderPath: "abcd/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId,
                    doctor: "doc1",
                    hospital: "hospital1",
                    specialization: mongoose.Types.ObjectId(),
                    recordType: "report",
                    folderPath: "abc/report2",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId2,
                    doctor: "doc1",
                    hospital: "hospital1",
                    specialization: mongoose.Types.ObjectId(),
                    recordType: "report",
                    folderPath: "abcs/report",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId2,
                    doctor: "doc1",
                    hospital: "hospital1",
                    specialization: mongoose.Types.ObjectId(),
                    recordType: "report",
                    folderPath: "abcs/report2",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
            ]);
        });
        const exec = async function () {
            return await request(server)
                .get("/api/externalRecords" + queryStr)
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

        it("should return only externalRecords of the profileId if profileId exists in user's profiles list", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });

        it("should return the externalRecords of the profileId if client is a hospital", async () => {
            token = new Account({
                accessLevel: Roles.Hospital,
            }).generateAuthToken();
            queryStr = "/?profileId=" + profileId2;

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(3);
        });

        it("should return all the externalRecords if client is an admin", async () => {
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
    //     let token, id, externalRecord;

    //     beforeEach(async () => {
    //         externalRecord = new ExternalRecord({
    //             timeSlot: moment().add(7, "days"),
    //             profileId: mongoose.Types.ObjectId(),
    //             recordType: {
    //                 _id: mongoose.Types.ObjectId().toString(),
    //                 name: "report",
    //             },
    //         });
    //         await externalRecord.save();
    //         id = externalRecord._id;

    //         token = new Account({
    //             profiles: [externalRecord.profileId],
    //         }).generateAuthToken();
    //     });

    //     const exec = async function () {
    //         return await request(server)
    //             .get("/api/externalRecords/" + id)
    //             .set("x-auth-token", token);
    //     };

    //     it("should return 401 if client is not logged in", async () => {
    //         token = "";
    //         const res = await exec();
    //         expect(res.status).toBe(401);
    //     });

    //     it("should return 403 if externalRecord does not belong to doctor", async () => {
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

    //     it("should return 404 status if no externalRecord with given id is found", async () => {
    //         id = mongoose.Types.ObjectId();
    //         const response = await exec();
    //         expect(response.status).toBe(404);
    //     });

    //     it("should return the externalRecord if request is valid", async () => {
    //         const res = await exec();
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("_id", externalRecord._id.toString());
    //         expect(res.body).toHaveProperty(
    //             "profileId",
    //             externalRecord.profileId.toString()
    //         );

    //         expect(res.body.recordType._id).toEqual(
    //             externalRecord.recordType._id.toString()
    //         );
    //         expect(new Date(res.body.timeSlot)).toEqual(externalRecord.timeSlot);
    //     });
    // });

    describe("POST /", () => {
        let token,
            params,
            profile,
            hospital,
            doctor,
            specialization,
            userAccount;

        beforeEach(async () => {
            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
            });

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
                accessLevel: Roles.User,
                profiles: [profile._id],
            });
            profile.account = userAccount._id;
            await profile.save();
            await userAccount.save();

            specialization = new Specialization({
                name: "Cardiology",
            });
            await specialization.save();

            token = userAccount.generateAuthToken();

            params = {
                profileId: profile._id,
                doctor: "doctor1",
                hospital: "hospital2",
                specializationId: specialization._id,
                dateOnDocument: "02/19/2019",
                recordType: "report",
                s3Path: "abc/",
                recordName: "ECG",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            };
        });

        const exec = async function () {
            return await request(server)
                .post("/api/externalRecords")
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
            profile.account = mongoose.Types.ObjectId();
            await profile.save();

            token = userAccount.generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 400 if doctor is not provided", async () => {
            delete params.doctor;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if hospital is not provided", async () => {
            delete params.hospital;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if specializationId is not provided", async () => {
            delete params.specializationId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no specialization with the given specializationId exists", async () => {
            params.specializationId = mongoose.Types.ObjectId();
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

        it("should return 400 if recordType is not valid", async () => {
            params.recordType = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordType is greater than 10 characters", async () => {
            params.recordType = "abcdefghijk";
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
            await ExternalRecord.collection.insertOne({
                folderPath: "abc/ECG",
            });

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if files is not provided", async () => {
            delete params.files;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if files is not an array", async () => {
            params.files = "abc";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if files is an empty array", async () => {
            params.files = [];
            const response = await exec();
            expect(response.status).toBe(400);
        });

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

        it("should return 403 if client is a user and profileId does not belong to the account", async () => {
            token = new Account({
                accessLevel: Roles.User,
                profiles: [mongoose.Types.ObjectId()],
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should add externalRecordId to the profile's externalRecords if request is valid", async () => {
            const res = await exec();
            const p = await Profile.findById(profile._id);

            expect(p.externalRecords[0].toString()).toEqual(
                res.body._id.toString()
            );
        });

        it("should store the externalRecord in the db if request is valid", async () => {
            await exec();
            const externalRecords = await ExternalRecord.find({
                folderPath: params.s3Path + params.recordName,
            });

            expect(externalRecords.length).toBe(1);
        });

        it("should return the externalRecord when client is user and request is valid", async () => {
            token = userAccount.generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(201);

            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profile",
                params.profileId.toString()
            );
            expect(res.body).toHaveProperty("doctor", params.doctor);
            expect(res.body).toHaveProperty("hospital", params.hospital);
            expect(res.body).toHaveProperty(
                "specialization",
                params.specializationId.toString()
            );
            expect(res.body).toHaveProperty("recordType", params.recordType);
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
            userAccount,
            hospitalAccount,
            doctor,
            hospital,
            profile,
            externalRecord,
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

            externalRecord = new ExternalRecord({
                profile: profile._id,
                doctor: "doctor1",
                hospital: "hospital1",
                specialization: mongoose.Types.ObjectId(),
                recordType: "type1",
                dateOnDocument: "12/25/2022",
                folderPath: "abc/report2",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            });
            await externalRecord.save();

            specialization = new Specialization({
                name: "Orthopaedics",
            });
            await specialization.save();

            token = userAccount.generateAuthToken();

            params = {
                recordType: "type2",
                dateOnDocument: "10/23/2021",
                doctor: "doctor2",
                hospital: "hospital2",
                specializationId: specialization._id,
            };

            id = externalRecord._id;
        });

        const exec = async function () {
            return await request(server)
                .patch("/api/externalRecords/" + id)
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";

            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 400 if hospital is not valid", async () => {
            params.hospital = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if doctor is not valid", async () => {
            params.doctor = 1;
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

        it("should return 404 status if no externalRecord with given id is found", async () => {
            id = mongoose.Types.ObjectId();

            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 403 if account is user and profile does not belong to account", async () => {
            token = new Account({
                accessLevel: Roles.User,
                profiles: [],
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        // it("should return 403 if account is hospital and doctor does not belong to hospital", async () => {
        //     doctor.hospital = mongoose.Types.ObjectId();
        //     await doctor.save();

        //     const response = await exec();
        //     expect(response.status).toBe(403);
        // });

        it("should change the params of the externalRecord in the db if request is valid", async () => {
            await exec();
            const er = await ExternalRecord.findById(externalRecord._id);

            //Updated fields
            expect(er).toHaveProperty(
                "recordType",
                params.recordType.toString()
            );
            expect(moment(er.dateOnDocument).format()).toEqual(
                moment(params.dateOnDocument).format()
            );
            expect(er).toHaveProperty("doctor", params.doctor);
            expect(er).toHaveProperty("hospital", params.hospital);
            expect(er.specialization.toString()).toEqual(
                params.specializationId.toString()
            );
        });

        it("should return the externalRecord if it doesnt have doctorId, client is user and request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(200);

            expect(res.body).toHaveProperty("doctor", params.doctor);
            expect(res.body).toHaveProperty("hospital", params.hospital);
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
                externalRecord._id.toString()
            );
            expect(res.body).toHaveProperty(
                "profile",
                externalRecord.profile.toString()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                externalRecord.folderPath
            );
            expect(res.body).toHaveProperty("files");
        });

        // it("should return the externalRecord when client is hospital, doctorId is provided and request is valid", async () => {
        //     params.doctorId = doctor._id;
        //     delete params.doctor;
        //     delete params.hospital;
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
            userAccount,
            hospitalAccount,
            doctor,
            hospital,
            profile,
            externalRecord,
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

            externalRecord = new ExternalRecord({
                profile: profile._id,
                doctor: "doctor1",
                hospital: "hospital1",
                specialization: mongoose.Types.ObjectId(),
                recordType: "type1",
                dateOnDocument: "12/25/2022",
                folderPath: "abc/report2",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            });
            await externalRecord.save();

            profile.externalRecords = [externalRecord._id];
            await profile.save();

            specialization = new Specialization({
                name: "Orthopaedics",
            });
            await specialization.save();

            token = userAccount.generateAuthToken();

            id = externalRecord._id;
        });

        const exec = async function () {
            return await request(server)
                .delete("/api/externalRecords/" + id)
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

        it("should return 404 status if no externalRecord with given id is found", async () => {
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

        it("should remove the externalRecord from the profile if account is user and record is external", async () => {
            await exec();

            const p = await Profile.findById(externalRecord.profile);
            expect(p.externalRecords).toEqual([]);
        });

        // it("should remove the externalRecord from the profile if account is hospital and record is external", async () => {
        //     token = hospitalAccount.generateAuthToken();

        //     await exec();

        //     const p = await Profile.findById(externalRecordU.profile);
        //     expect(p.externalRecords).toEqual([externalRecordU._id]);
        // });

        it("should remove the externalRecord from the db if account is user and record is external", async () => {
            await exec();

            const mr = await ExternalRecord.findById(externalRecord._id);
            expect(mr).toBeNull();
        });

        // it("should remove the externalRecord from the db if account is hospital and record is external", async () => {
        //     token = hospitalAccount.generateAuthToken();
        //     await exec();

        //     const mr = await ExternalRecord.findById(externalRecordU._id);
        //     expect(mr).toBeNull();
        // });

        it("should return the deleted externalRecord if request is valid", async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profile",
                externalRecord.profile.toString()
            );
            expect(res.body).toHaveProperty("doctor", externalRecord.doctor);
            expect(res.body).toHaveProperty(
                "hospital",
                externalRecord.hospital
            );
            expect(res.body).toHaveProperty(
                "specialization",
                externalRecord.specialization.toString()
            );
            expect(res.body.recordType).toEqual(externalRecord.recordType);
            expect(res.body.dateOnDocument).toEqual(
                externalRecord.dateOnDocument.toISOString()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                externalRecord.folderPath
            );
            externalRecord.files.forEach((file) => {
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
