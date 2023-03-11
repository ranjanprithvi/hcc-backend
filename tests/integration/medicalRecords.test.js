import mongoose from "mongoose";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { MedicalRecord } from "../../models/medicalRecordModel.js";
import { Patient } from "../../models/patientModel.js";
import { Account, roles } from "../../models/accountModel.js";
import { RecordType } from "../../models/recordTypeModel.js";
import { Field } from "../../models/fieldModel.js";

describe("/api/medicalRecords", () => {
    afterEach(async () => {
        await MedicalRecord.collection.deleteMany({});
        await Account.collection.deleteMany({});
        await Patient.collection.deleteMany({});
        await RecordType.collection.deleteMany({});
        await Field.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        let token, queryStr, patientId, account;

        beforeEach(async () => {
            patientId = mongoose.Types.ObjectId();
            account = new Account({
                accessLevel: roles.doctor,
                patients: [patientId],
            });
            token = account.generateAuthToken();
            queryStr = "/?patientId=" + patientId;

            await MedicalRecord.collection.insertMany([
                {
                    patientId: mongoose.Types.ObjectId(),
                    createdByAccountId: account._id,
                    recordType: {
                        _id: mongoose.Types.ObjectId(),
                        name: "report",
                    },
                    folderPath: "abc/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                    hospitalName: "hospital1",
                    field: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Cardiology",
                    },
                },
                {
                    patientId: patientId,
                    createdByAccountId: account._id,
                    recordType: {
                        _id: mongoose.Types.ObjectId(),
                        name: "report",
                    },
                    folderPath: "abcd/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                    hospitalName: "hospital1",
                    field: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Cardiology",
                    },
                },
                {
                    patientId: patientId,
                    createdByAccountId: mongoose.Types.ObjectId(),
                    recordType: {
                        _id: mongoose.Types.ObjectId(),
                        name: "report",
                    },
                    folderPath: "abcs/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                    hospitalName: "hospital2",
                    field: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Orthopaedics",
                    },
                },
                {
                    patientId: mongoose.Types.ObjectId(),
                    createdByAccountId: mongoose.Types.ObjectId(),
                    recordType: {
                        _id: mongoose.Types.ObjectId(),
                        name: "report",
                    },
                    folderPath: "abcs/report2",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                    field: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Gynecology",
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

        it("should return 400 if client is not an admin and patientId is not provided in query", async () => {
            queryStr = "";

            const res = await exec();
            expect(res.status).toBe(400);
        });

        it("should return only medicalRecords belonging to the account or of those patients belonging to the account", async () => {
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
    //             patientId: mongoose.Types.ObjectId(),
    //             recordType: {
    //                 _id: mongoose.Types.ObjectId().toString(),
    //                 name: "report",
    //             },
    //         });
    //         await medicalRecord.save();
    //         id = medicalRecord._id;

    //         token = new Account({
    //             patients: [medicalRecord.patientId],
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
    //             "patientId",
    //             medicalRecord.patientId.toString()
    //         );

    //         expect(res.body.recordType._id).toEqual(
    //             medicalRecord.recordType._id.toString()
    //         );
    //         expect(new Date(res.body.timeSlot)).toEqual(medicalRecord.timeSlot);
    //     });
    // });

    describe("POST /", () => {
        let token, params, account, patient, recordType, field;

        beforeEach(async () => {
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.doctor,
                hospitalName: "hospital1",
            });
            await account.save();

            patient = new Patient({
                name: "patient1",
                gender: "male",
                dob: "04/24/1995",
                accountId: mongoose.Types.ObjectId(),
            });
            await patient.save();

            recordType = new RecordType({
                name: "report",
            });
            await recordType.save();

            field = new Field({
                name: "Cardiology",
            });
            await field.save();

            token = account.generateAuthToken();

            params = {
                patientId: patient._id,
                recordName: "report1",
                recordTypeId: recordType._id,
                s3Path: "abc/",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                hospitalName: "hospital2",
                fieldId: field._id,
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

        it("should return 400 if patientId is not provided", async () => {
            delete params.patientId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if patientId is not valid", async () => {
            params.patientId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no patient with the given patientId exists", async () => {
            params.patientId = mongoose.Types.ObjectId();
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

        it("should return 400 if fieldId is not provided", async () => {
            delete params.fieldId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if fieldId is not valid", async () => {
            params.fieldId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no recordType with the given fieldId exists", async () => {
            params.fieldId = mongoose.Types.ObjectId();
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

        it("should return 403 if client is a user and patientId does not belong to the account", async () => {
            token = new Account({
                accessLevel: roles.user,
                patients: [mongoose.Types.ObjectId()],
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should add medicalRecordId to the patient's medicalRecords if request is valid", async () => {
            const res = await exec();
            const p = await Patient.findById(patient._id);

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

        it("should return the medicalRecord with hospitalName of account when client is doctor and request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(201);

            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "patientId",
                params.patientId.toString()
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
            expect(res.body).toHaveProperty("dateUploaded");
            expect(res.body).toHaveProperty(
                "hospitalName",
                account.hospitalName
            );
        });

        it("should return the medicalRecord with hospitalName of params when client is user and request is valid", async () => {
            account = new Account({
                accessLevel: roles.user,
                patients: [patient._id],
            });

            token = account.generateAuthToken();

            const res = await exec();
            expect(res.status).toBe(201);

            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "patientId",
                params.patientId.toString()
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
            expect(res.body).toHaveProperty("dateUploaded");
            expect(res.body).toHaveProperty(
                "hospitalName",
                params.hospitalName
            );
            expect(res.body.field._id).toEqual(params.fieldId.toString());
        });
    });

    describe("PATCH /", () => {
        let token, params, account, recordType, medicalRecord, id, field;

        beforeEach(async () => {
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.doctor,
                hospitalName: "hospital1",
            });
            await account.save();

            medicalRecord = new MedicalRecord({
                patientId: mongoose.Types.ObjectId(),
                createdByAccountId: account._id,
                recordType: { _id: mongoose.Types.ObjectId(), name: "type1" },
                folderPath: "abc/report",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                hospitalName: "hospital1",
                dateUploaded: new Date(),
                dateOnDocument: "12/25/2022",
                field: { _id: mongoose.Types.ObjectId(), name: "Cardiology" },
            });
            await medicalRecord.save();

            recordType = new RecordType({
                name: "report",
            });
            await recordType.save();

            field = new Field({
                name: "Orthopaedics",
            });
            await field.save();

            token = account.generateAuthToken();

            params = {
                recordName: "report2",
                recordTypeId: recordType._id,
                hospitalName: "hospital2",
                fieldId: field._id,
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
        it("should return 400 if fieldId is not valid", async () => {
            params.fieldId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if no recordType with the given fieldId exists", async () => {
            params.fieldId = mongoose.Types.ObjectId();
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
            expect(mr.field._id).toEqual(params.fieldId);
        });

        it("should return the medicalRecord when request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(200);

            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "patientId",
                medicalRecord.patientId.toString()
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
            expect(res.body.field._id).toEqual(params.fieldId.toString());
            expect(res.body.dateUploaded).toEqual(
                medicalRecord.dateUploaded.toISOString()
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
        let token, account, medicalRecord, id, patient;

        beforeEach(async () => {
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.doctor,
                hospitalName: "hospital1",
            });
            await account.save();

            medicalRecord = new MedicalRecord({
                createdByAccountId: account._id,
                recordType: { _id: mongoose.Types.ObjectId(), name: "type1" },
                folderPath: "abc/file1",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                hospitalName: "hospital1",
                dateUploaded: new Date(),
                dateOnDocument: "02/15/2018",
                field: { _id: mongoose.Types.ObjectId(), name: "Cardiology" },
            });

            patient = new Patient({
                name: "patient1",
                gender: "male",
                dob: "04/24/1995",
                accountId: mongoose.Types.ObjectId(),
                medicalRecords: [medicalRecord._id],
            });
            medicalRecord.patientId = patient._id;

            await medicalRecord.save();
            await patient.save();

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

        it("should remove the medicalRecord from the patient if request is valid", async () => {
            await exec();

            const p = await Patient.findById(medicalRecord.patientId);
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
                "patientId",
                medicalRecord.patientId.toString()
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
            expect(res.body.dateUploaded).toEqual(
                medicalRecord.dateUploaded.toISOString()
            );
            expect(res.body.field._id).toEqual(
                medicalRecord.field._id.toString()
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
