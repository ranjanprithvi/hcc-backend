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
import { Hospital } from "../../models/hospitalModel";
import { Doctor } from "../../models/doctorModel";

describe("/api/medicalRecords", () => {
    afterEach(async () => {
        await MedicalRecord.collection.deleteMany({});
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
                accessLevel: roles.user,
                profiles: [profileId],
            });
            token = account.generateAuthToken();
            queryStr = "/?profileId=" + profileId;

            await MedicalRecord.collection.insertMany([
                {
                    profile: profileId2,
                    doctor: mongoose.Types.ObjectId(),
                    recordType: "report",
                    dateOnDocument: moment().subtract(1, "days").toDate(),
                    folderPath: "abc/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId,
                    doctor: mongoose.Types.ObjectId(),
                    recordType: "report",
                    folderPath: "abcd/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId,
                    doctorName: "doctor1",
                    hospitalName: "hospital1",
                    specialization: mongoose.Types.ObjectId(),
                    recordType: "report",
                    folderPath: "abc/report2",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId2,
                    doctor: mongoose.Types.ObjectId(),
                    recordType: "report",
                    folderPath: "abcs/report",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId2,
                    doctor: mongoose.Types.ObjectId(),
                    recordType: "report",
                    folderPath: "abcs/report2",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
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

        it("should return only medicalRecords of the profileId if profileId exists in user's profiles list", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });

        it("should return the medicalRecords of the profileId if client is a hospital", async () => {
            token = new Account({
                accessLevel: roles.hospital,
            }).generateAuthToken();
            queryStr = "/?profileId=" + profileId2;

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(3);
        });

        it("should return all the medicalRecords if client is an admin", async () => {
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
        let token,
            params,
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
                doctorName: "doctor1",
                hospitalName: "hospital2",
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
            params.doctorId = doctor._id;
            delete params.doctorName;
            delete params.hospitalName;
            delete params.specializationId;

            doctor.hospital = mongoose.Types.ObjectId();
            await doctor.save();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 400 if doctorName is not provided when doctorId is not provided", async () => {
            delete params.doctorName;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if doctorName is provided when doctorId is provided", async () => {
            params.doctor = doctor._id;
            delete params.hospitalName;
            delete params.specializationId;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalName is not provided when doctorId is not provided", async () => {
            delete params.hospitalName;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalName is provided when doctorId is provided", async () => {
            params.doctor = doctor._id;
            delete params.doctorName;
            delete params.specializationId;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if specializationId is not provided when doctorId is not provided", async () => {
            delete params.specializationId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if specializationId is provided when doctorId is provided", async () => {
            params.doctor = doctor._id;
            delete params.doctorName;
            delete params.hospitalName;

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
            await MedicalRecord.collection.insertOne({
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

        it("should return the medicalRecord when client is hospital, doctorId is not provided and request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(201);

            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profile",
                params.profileId.toString()
            );
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

        it("should return the medicalRecord when client is hospital, doctorId is provided and request is valid", async () => {
            params.doctorId = doctor._id;
            delete params.doctorName;
            delete params.hospitalName;
            delete params.specializationId;

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

        it("should return the medicalRecord when client is user and request is valid", async () => {
            token = userAccount.generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(201);

            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profile",
                params.profileId.toString()
            );
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
            expect(res.body).toHaveProperty("external", true);
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

    describe.only("PATCH /", () => {
        let token,
            params,
            userAccount,
            hospitalAccount,
            doctor,
            hospital,
            profile,
            medicalRecord1,
            medicalRecord2,
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

            medicalRecord1 = new MedicalRecord({
                profile: profile._id,
                doctor: doctor._id,
                recordType: "type1",
                dateOnDocument: "12/25/2022",
                external: true,
                folderPath: "abc/report",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            });
            await medicalRecord1.save();

            medicalRecord2 = new MedicalRecord({
                profile: profile._id,
                doctorName: "doctor1",
                hospitalName: "hospital1",
                specialization: mongoose.Types.ObjectId(),
                recordType: "type1",
                dateOnDocument: "12/25/2022",
                folderPath: "abc/report2",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            });
            await medicalRecord2.save();

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

            id = medicalRecord2._id;
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

        it.only("should return 400 if no specialization with the given specializationId exists", async () => {
            params.specializationId = mongoose.Types.ObjectId();

            const response = await exec();
            console.log(response);
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

        it("should return 404 status if no medicalRecord with given id is found", async () => {
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
            token = new Account({
                accessLevel: roles.user,
                profiles: [],
            }).generateAuthToken();
            id = medicalRecord2._id;

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 403 if account is hospital and doctor does not belong to hospital", async () => {
            doctor.hospital = mongoose.Types.ObjectId();
            await doctor.save();

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

        it("should change the params of the medicalRecord in the db if request is valid", async () => {
            await exec();
            const medicalRecord = await MedicalRecord.findById(
                medicalRecord1._id
            );

            //Updated fields
            expect(medicalRecord).toHaveProperty(
                "recordType",
                params.recordTypeId.toString()
            );
            expect(moment(medicalRecord.dateOnDocument).format()).toEqual(
                moment(params.dateOnDocument).format()
            );
            expect(medicalRecord).toHaveProperty(
                "doctorName",
                params.doctorName
            );
            expect(medicalRecord).toHaveProperty(
                "hospitalName",
                params.hospitalName
            );
            expect(medicalRecord).toHaveProperty(
                "specialization",
                params.specializationId.toString()
            );
        });

        it("should return the medicalRecord if it doesnt have doctorId, client is user and request is valid", async () => {
            token = userAccount.generateAuthToken();

            const res = await exec();
            expect(res.status).toBe(201);

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
                medicalRecord1._id.toString()
            );
            expect(res.body).toHaveProperty(
                "profile",
                medicalRecord1.profile.toString()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                medicalRecord1.folderPath
            );
            expect(res.body).toHaveProperty("files");
        });

        // it("should return the medicalRecord when client is hospital, doctorId is provided and request is valid", async () => {
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
            profileId,
            medicalRecord1,
            medicalRecord2,
            id,
            specialization;

        beforeEach(async () => {
            profileId = mongoose.Types.ObjectId();
            userAccount = new Account({
                email: "abcd@gmail.com",
                password: "123456",
            });

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

            medicalRecord1 = new MedicalRecord({
                profile: profileId,
                doctor: doctor._id,
                recordType: "type1",
                dateOnDocument: "12/25/2022",
                external: true,
                folderPath: "abc/report",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            });
            await medicalRecord1.save();

            specialization = new Specialization({
                name: "Orthopaedics",
            });
            await specialization.save();

            token = hospitalAccount.generateAuthToken();

            id = medicalRecord1._id;
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
