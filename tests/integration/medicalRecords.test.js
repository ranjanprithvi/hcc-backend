import mongoose from "mongoose";
import moment from "moment";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { MedicalRecord } from "../../models/medicalRecordModel.js";
import { Profile } from "../../models/profileModel.js";
import { Account, roles } from "../../models/accountModel.js";
import { Specialization } from "../../models/specializationModel.js";

describe("/api/medicalRecords", () => {
    afterEach(async () => {
        await MedicalRecord.collection.deleteMany({});
        await Account.collection.deleteMany({});
        await Profile.collection.deleteMany({});
        await Specialization.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        let token, queryStr, profileId, account;

        beforeEach(async () => {
            profileId = mongoose.Types.ObjectId();
            account = new Account({
                accessLevel: roles.hospital,
                profiles: [profileId],
            });
            token = account.generateAuthToken();
            queryStr = "/?profileId=" + profileId;

            await MedicalRecord.collection.insertMany([
                {
                    profileId: mongoose.Types.ObjectId(),
                    createdByAccountId: account._id,
                    recordType: "report",
                    folderPath: "abc/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                    hospitalName: "hospital1",
                    doctor: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Doctor1",
                    },
                },
                {
                    profileId: profileId,
                    createdByAccountId: account._id,
                    recordType: "report",
                    folderPath: "abcd/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                    hospitalName: "hospital1",
                    doctor: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Doctor2",
                    },
                },
                {
                    profileId: profileId,
                    createdByAccountId: mongoose.Types.ObjectId(),
                    recordType: "report",
                    folderPath: "abc/report2",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                    hospitalName: "hospital2",
                    doctor: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Doctor3",
                    },
                },
                {
                    profileId: mongoose.Types.ObjectId(),
                    createdByAccountId: mongoose.Types.ObjectId(),
                    recordType: "report",
                    folderPath: "abcs/report",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                    doctor: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Doctor4",
                    },
                },
            ]);
        });
        const exec = async function () {
            return await request(server)
                .get("/api/medicalRecords" + queryStr)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 400 if client is not an admin and profileId is not provided in query", async () => {
            queryStr = "";

            const res = await exec();
            expect(res.status).toBe(400);
        });

        it("should return only medicalRecords belonging to the account or of those profiles belonging to the account", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });

        it("should return all the medicalRecords if client is an admin", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            queryStr = "";

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(4);
        });
    });

    // describe("GET /:id", () => {
    //     let token, id, medicalRecord;

    //     beforeEach(async () => {
    //         medicalRecord = new MedicalRecord({
    //             timeSlot: moment().add(7, "days"),
    //             profileId: mongoose.Types.ObjectId(),
    //             recordType: {
    //                 _id: mongoose.Types.ObjectId().toString(),
    //                 name: "report",
    //             },
    //         });
    //         await medicalRecord.save();
    //         id = medicalRecord._id;

    //         token = new Account({
    //             profiles: [medicalRecord.profileId],
    //         }).generateAuthToken();
    //     });

    //     const exec = async function () {
    //         return await request(server)
    //             .get("/api/medicalRecords/" + id)
    //             .set("x-auth-token", token);
    //     };

    //     it("should return 401 if client is not logged in", async () => {
    //         token = "";
    //         const res = await exec();
    //         expect(res.status).toBe(401);
    //     });

    //     it("should return 403 if medicalRecord does not belong to doctor", async () => {
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

    //     it("should return 404 status if no medicalRecord with given id is found", async () => {
    //         id = mongoose.Types.ObjectId();
    //         const response = await exec();
    //         expect(response.status).toBe(404);
    //     });

    //     it("should return the medicalRecord if request is valid", async () => {
    //         const res = await exec();
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("_id", medicalRecord._id.toString());
    //         expect(res.body).toHaveProperty(
    //             "profileId",
    //             medicalRecord.profileId.toString()
    //         );

    //         expect(res.body.recordType._id).toEqual(
    //             medicalRecord.recordType._id.toString()
    //         );
    //         expect(new Date(res.body.timeSlot)).toEqual(medicalRecord.timeSlot);
    //     });
    // });

    describe("POST /", () => {
        let token, params, account, profile, recordType, specialization;

        beforeEach(async () => {
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
                hospitalName: "hospital1",
            });
            await account.save();

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                accountId: mongoose.Types.ObjectId(),
            });
            await profile.save();

            recordType = new RecordType({
                name: "report",
            });
            await recordType.save();

            specialization = new Specialization({
                name: "Cardiology",
            });
            await specialization.save();

            token = account.generateAuthToken();

            params = {
                profileId: profile._id,
                recordName: "report1",
                recordTypeId: recordType._id,
                s3Path: "abc/",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                hospitalName: "hospital2",
                specializationId: specialization._id,
                dateOnDocument: "02/19/2019",
            };
        });

        const exec = async function () {
            return await request(server)
                .post("/api/medicalRecords")
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
            await MedicalRecord.collection.insertOne({
                folderPath: "abc/report1",
            });

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordTypeId is not provided", async () => {
            delete params.recordTypeId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordTypeId is not valid", async () => {
            params.recordTypeId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no recordType with the given recordTypeId exists", async () => {
            params.recordTypeId = mongoose.Types.ObjectId();
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

        it("should return 400 if hospitalName is not provided", async () => {
            delete params.hospitalName;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalName is not valid", async () => {
            params.hospitalName = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if specializationId is not provided", async () => {
            delete params.specializationId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if specializationId is not valid", async () => {
            params.specializationId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no recordType with the given specializationId exists", async () => {
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

        it("should add medicalRecordId to the profile's medicalRecords if request is valid", async () => {
            const res = await exec();
            const p = await Profile.findById(profile._id);

            expect(p.medicalRecords[0].toString()).toEqual(
                res.body._id.toString()
            );
        });

        it("should store the medicalRecord in the db if request is valid", async () => {
            await exec();
            const medicalRecords = await MedicalRecord.find({
                folderPath: params.s3Path + params.recordName,
            });

            expect(medicalRecords.length).toBe(1);
        });

        it("should return the medicalRecord with hospitalName of account when client is hospital and request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(201);

            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profileId",
                params.profileId.toString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                account._id.toString()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                params.s3Path + params.recordName
            );
            expect(res.body).toHaveProperty("recordType");
            params.files.forEach((file) => {
                expect(res.body.files).toEqual(
                    expect.arrayContaining([expect.objectContaining(file)])
                );
            });
            expect(res.body).toHaveProperty(
                "hospitalName",
                account.hospitalName
            );
        });

        it("should return the medicalRecord with hospitalName of params when client is user and request is valid", async () => {
            account = new Account({
                accessLevel: roles.user,
                profiles: [profile._id],
            });

            token = account.generateAuthToken();

            const res = await exec();
            expect(res.status).toBe(201);

            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profileId",
                params.profileId.toString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                account._id.toString()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                params.s3Path + params.recordName
            );
            expect(res.body.recordType._id).toEqual(
                params.recordTypeId.toString()
            );
            params.files.forEach((file) => {
                expect(res.body.files).toEqual(
                    expect.arrayContaining([expect.objectContaining(file)])
                );
            });
            // expect(res.body.files).toEqual(
            //     expect.arrayContaining(params.files)
            // );
            expect(res.body).toHaveProperty(
                "hospitalName",
                params.hospitalName
            );
            expect(res.body.specialization._id).toEqual(
                params.specializationId.toString()
            );
        });
    });

    describe("PATCH /", () => {
        let token,
            params,
            account,
            recordType,
            medicalRecord,
            id,
            specialization;

        beforeEach(async () => {
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
                hospitalName: "hospital1",
            });
            await account.save();

            medicalRecord = new MedicalRecord({
                profileId: mongoose.Types.ObjectId(),
                createdByAccountId: account._id,
                recordType: { _id: mongoose.Types.ObjectId(), name: "type1" },
                folderPath: "abc/report",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                hospitalName: "hospital1",
                dateOnDocument: "12/25/2022",
                specialization: {
                    _id: mongoose.Types.ObjectId(),
                    name: "Cardiology",
                },
            });
            await medicalRecord.save();

            recordType = new RecordType({
                name: "report",
            });
            await recordType.save();

            specialization = new Specialization({
                name: "Orthopaedics",
            });
            await specialization.save();

            token = account.generateAuthToken();

            params = {
                recordName: "report2",
                recordTypeId: recordType._id,
                hospitalName: "hospital2",
                specializationId: specialization._id,
                dateOnDocument: "10/23/2021",
            };

            id = medicalRecord._id;
        });

        const exec = async function () {
            return await request(server)
                .patch("/api/medicalRecords/" + id)
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";

            const res = await exec();
            expect(res.status).toBe(401);
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
            await MedicalRecord.collection.insertOne({
                folderPath: "abc/report2",
            });

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordTypeId is not valid", async () => {
            params.recordTypeId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no recordType with the given recordTypeId exists", async () => {
            params.recordTypeId = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalName is not valid", async () => {
            params.hospitalName = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });
        it("should return 400 if specializationId is not valid", async () => {
            params.specializationId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no recordType with the given specializationId exists", async () => {
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

        it("should return 404 status if no medicalRecord with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 403 if medicalRecord does not belong to account", async () => {
            token = new Account().generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should change the passed properties in the db if request is valid", async () => {
            await exec();
            const mr = await MedicalRecord.findById(medicalRecord._id);

            expect(mr).toHaveProperty("folderPath", "abc/report2");
            expect(mr.recordType._id).toEqual(params.recordTypeId);
            expect(mr.dateOnDocument.toISOString()).toEqual(
                new Date(params.dateOnDocument).toISOString()
            );
            expect(mr).toHaveProperty("hospitalName", params.hospitalName);
            expect(mr.specialization._id).toEqual(params.specializationId);
        });

        it("should return the medicalRecord when request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(200);

            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profileId",
                medicalRecord.profileId.toString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                medicalRecord.createdByAccountId.toString()
            );
            expect(res.body).toHaveProperty(
                "recordType._id",
                params.recordTypeId.toString()
            );
            expect(res.body).toHaveProperty("folderPath", "abc/report2");
            medicalRecord.files.forEach((file) => {
                expect(res.body.files).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            name: file.name,
                            sizeInBytes: file.sizeInBytes,
                        }),
                    ])
                );
            });
            expect(res.body.specialization._id).toEqual(
                params.specializationId.toString()
            );
            expect(res.body.dateOnDocument.toString()).toEqual(
                new Date(params.dateOnDocument).toISOString()
            );
            expect(res.body).toHaveProperty(
                "hospitalName",
                params.hospitalName
            );
        });
    });

    describe("DELETE /:id", () => {
        let token, account, medicalRecord, id, profile;

        beforeEach(async () => {
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
                hospitalName: "hospital1",
            });
            await account.save();

            medicalRecord = new MedicalRecord({
                createdByAccountId: account._id,
                recordType: { _id: mongoose.Types.ObjectId(), name: "type1" },
                folderPath: "abc/file1",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                hospitalName: "hospital1",
                dateOnDocument: "02/15/2018",
                specialization: {
                    _id: mongoose.Types.ObjectId(),
                    name: "Cardiology",
                },
            });

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                accountId: mongoose.Types.ObjectId(),
                medicalRecords: [medicalRecord._id],
            });
            medicalRecord.profileId = profile._id;

            await medicalRecord.save();
            await profile.save();

            token = account.generateAuthToken();

            id = medicalRecord._id;
        });

        const exec = async function () {
            return await request(server)
                .delete("/api/medicalRecords/" + id)
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

        it("should return 404 status if no medicalRecord with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 403 if medicalRecord does not belong to account", async () => {
            token = new Account().generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should remove the medicalRecord from the profile if request is valid", async () => {
            await exec();

            const p = await Profile.findById(medicalRecord.profileId);
            expect(p.medicalRecords).toEqual([]);
        });

        it("should remove the medicalRecord from the db if request is valid", async () => {
            await exec();

            const mr = await MedicalRecord.findById(medicalRecord._id);
            expect(mr).toBeNull();
        });

        it("should return the deleted medicalRecord if request is valid", async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profileId",
                medicalRecord.profileId.toString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                medicalRecord.createdByAccountId.toString()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                medicalRecord.folderPath
            );
            expect(res.body.recordType._id).toEqual(
                medicalRecord.recordType._id.toString()
            );
            medicalRecord.files.forEach((file) => {
                expect(res.body.files).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            name: file.name,
                            sizeInBytes: file.sizeInBytes,
                        }),
                    ])
                );
            });
            expect(res.body.specialization._id).toEqual(
                medicalRecord.specialization._id.toString()
            );
            expect(res.body.dateOnDocument).toEqual(
                medicalRecord.dateOnDocument.toISOString()
            );
            expect(res.body).toHaveProperty(
                "hospitalName",
                medicalRecord.hospitalName
            );
        });
    });
});
