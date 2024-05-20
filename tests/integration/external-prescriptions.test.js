import mongoose from "mongoose";
import moment from "moment";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger.js";
import { conn } from "../../startup/mongo.js";
import { ExternalPrescription } from "../../models/external-prescription-model.js";
import { Profile } from "../../models/profile-model.js";
import { Account, Roles } from "../../models/account-model.js";
import { Specialization } from "../../models/specialization-model.js";
import { Hospital } from "../../models/hospitalModel";
import { Doctor } from "../../models/doctorModel";

describe("/api/externalPrescriptions", () => {
    afterEach(async () => {
        await ExternalPrescription.collection.deleteMany({});
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

            await ExternalPrescription.collection.insertMany([
                {
                    profile: profileId2,
                    doctor: "doctor1",
                    hospital: "hospital1",
                    specialization: mongoose.Types.ObjectId(),
                    dateOnDocument: moment().subtract(1, "days").toDate(),
                    folderPath: "abc/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId,
                    doctor: "doctor3",
                    hospital: "hospital2",
                    specialization: mongoose.Types.ObjectId(),
                    folderPath: "abcd/report1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId,
                    doctor: "doctor2",
                    hospital: "hospital1",
                    specialization: mongoose.Types.ObjectId(),
                    content: "report1234",
                    folderPath: "abc/report2",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId2,
                    doctor: "doctor4",
                    hospital: "hospital2",
                    specialization: mongoose.Types.ObjectId(),
                    folderPath: "abcs/report",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
                {
                    profile: profileId2,
                    doctor: "doctor5",
                    hospital: "hospital1",
                    specialization: mongoose.Types.ObjectId(),
                    content: "report1234",
                    folderPath: "abcs/report2",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                },
            ]);
        });
        const exec = async function () {
            return await request(server)
                .get("/api/externalPrescriptions" + queryStr)
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

        it("should return only externalPrescriptions of the profileId if profileId exists in user's profiles list", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });

        it("should return the externalPrescriptions of the profileId if client is a hospital", async () => {
            token = new Account({
                accessLevel: Roles.Hospital,
            }).generateAuthToken();
            queryStr = "/?profileId=" + profileId2;

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(3);
        });

        it("should return all the externalPrescriptions if client is an admin", async () => {
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
    //     let token, id, externalPrescription;

    //     beforeEach(async () => {
    //         externalPrescription = new ExternalPrescription({
    //             timeSlot: moment().add(7, "days"),
    //             profileId: mongoose.Types.ObjectId(),
    //             content: {
    //                 _id: mongoose.Types.ObjectId().toString(),
    //                 name: "report1234",
    //             },
    //         });
    //         await externalPrescription.save();
    //         id = externalPrescription._id;

    //         token = new Account({
    //             profiles: [externalPrescription.profileId],
    //         }).generateAuthToken();
    //     });

    //     const exec = async function () {
    //         return await request(server)
    //             .get("/api/externalPrescriptions/" + id)
    //             .set("x-auth-token", token);
    //     };

    //     it("should return 401 if client is not logged in", async () => {
    //         token = "";
    //         const res = await exec();
    //         expect(res.status).toBe(401);
    //     });

    //     it("should return 403 if externalPrescription does not belong to doctor", async () => {
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

    //     it("should return 404 status if no externalPrescription with given id is found", async () => {
    //         id = mongoose.Types.ObjectId();
    //         const response = await exec();
    //         expect(response.status).toBe(404);
    //     });

    //     it("should return the externalPrescription if request is valid", async () => {
    //         const res = await exec();
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("_id", externalPrescription._id.toString());
    //         expect(res.body).toHaveProperty(
    //             "profileId",
    //             externalPrescription.profileId.toString()
    //         );

    //         expect(res.body.content._id).toEqual(
    //             externalPrescription.content._id.toString()
    //         );
    //         expect(new Date(res.body.timeSlot)).toEqual(externalPrescription.timeSlot);
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
            await userAccount.save();

            profile.account = userAccount._id;
            await profile.save();

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
                doctor: "doctor1",
                hospital: "hospital2",
                specializationId: specialization._id,
                dateOnDocument: "02/19/2019",
                s3Path: "abc/",
                recordName: "ECG",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            };
        });

        const exec = async function () {
            return await request(server)
                .post("/api/externalPrescriptions")
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

        it("should return 403 if account of profile is not the user account", async () => {
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

        it("should return 400 if specializationId is not provided when doctorId is not provided", async () => {
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
            await ExternalPrescription.collection.insertOne({
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

        it("should add externalPrescriptionId to the profile's externalPrescriptions if request is valid", async () => {
            const res = await exec();
            const p = await Profile.findById(profile._id);

            expect(p.externalPrescriptions[0].toString()).toEqual(
                res.body._id.toString()
            );
        });

        it("should store the externalPrescription in the db if request is valid", async () => {
            await exec();
            const externalPrescriptions = await ExternalPrescription.find({
                folderPath: params.s3Path + params.recordName,
            });

            expect(externalPrescriptions.length).toBe(1);
        });

        it("should return the externalPrescription when client is hospital, doctorId is not provided and request is valid", async () => {
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

        it("should return the externalPrescription when request is valid", async () => {
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
            externalPrescription,
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

            externalPrescription = new ExternalPrescription({
                profile: profile._id,
                doctor: "doctor1",
                hospital: "hospital1",
                specialization: mongoose.Types.ObjectId(),
                dateOnDocument: "12/25/2022",
                external: true,
                folderPath: "abc/report2",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            });
            await externalPrescription.save();

            specialization = new Specialization({
                name: "Orthopaedics",
            });
            await specialization.save();

            token = userAccount.generateAuthToken();

            params = {
                dateOnDocument: "10/23/2021",
                doctor: "doctor2",
                hospital: "hospital2",
                specializationId: specialization._id,
            };

            id = externalPrescription._id;
        });

        const exec = async function () {
            return await request(server)
                .patch("/api/externalPrescriptions/" + id)
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

        it("should return 404 status if no externalPrescription with given id is found", async () => {
            id = mongoose.Types.ObjectId();

            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 403 if account is user and profile does not belong to account", async () => {
            profile.account = mongoose.Types.ObjectId();
            await profile.save();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should change the params of the externalPrescription in the db if request is valid", async () => {
            await exec();
            const ep = await ExternalPrescription.findById(
                externalPrescription._id
            );

            //Updated fields
            expect(moment(ep.dateOnDocument).format()).toEqual(
                moment(params.dateOnDocument).format()
            );
            expect(ep).toHaveProperty("doctor", params.doctor);
            expect(ep).toHaveProperty("hospital", params.hospital);
            expect(ep.specialization.toString()).toEqual(
                params.specializationId.toString()
            );
        });

        it("should return the externalPrescription if request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(200);

            expect(res.body).toHaveProperty("doctor", params.doctor);
            expect(res.body).toHaveProperty("hospital", params.hospital);
            expect(res.body).toHaveProperty(
                "specialization",
                params.specializationId.toString()
            );
            expect(moment(res.body.dateOnDocument).format()).toEqual(
                moment(params.dateOnDocument).format()
            );

            //Other fields
            expect(res.body).toHaveProperty(
                "_id",
                externalPrescription._id.toString()
            );
            expect(res.body).toHaveProperty(
                "profile",
                externalPrescription.profile.toString()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                externalPrescription.folderPath
            );
            expect(res.body).toHaveProperty("files");
        });
    });

    describe("DELETE /:id", () => {
        let token,
            userAccount,
            hospitalAccount,
            doctor,
            hospital,
            profile,
            externalPrescription,
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

            externalPrescription = new ExternalPrescription({
                profile: profile._id,
                doctor: "doctor1",
                hospital: "hospital1",
                specialization: mongoose.Types.ObjectId(),
                content: "record1234",
                dateOnDocument: "12/25/2022",
                external: true,
                folderPath: "abc/report2",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
            });
            await externalPrescription.save();

            profile.externalPrescriptions = [externalPrescription._id];
            await profile.save();

            specialization = new Specialization({
                name: "Orthopaedics",
            });
            await specialization.save();

            token = userAccount.generateAuthToken();

            id = externalPrescription._id;
        });

        const exec = async function () {
            return await request(server)
                .delete("/api/externalPrescriptions/" + id)
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

        it("should return 404 status if no externalPrescription with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 403 if profile of external prescription does not belong to user account", async () => {
            profile.account = mongoose.Types.ObjectId();
            await profile.save();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should remove the externalPrescription from the profile if account is user and record is external", async () => {
            await exec();

            const p = await Profile.findById(externalPrescription.profile);
            expect(p.externalPrescriptions).toEqual([]);
        });

        it("should remove the externalPrescription from the db if request is valid", async () => {
            await exec();

            const mr = await ExternalPrescription.findById(
                externalPrescription._id
            );
            expect(mr).toBeNull();
        });

        it("should return the deleted externalPrescription if request is valid", async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profile",
                externalPrescription.profile.toString()
            );
            expect(res.body).toHaveProperty(
                "doctor",
                externalPrescription.doctor
            );
            expect(res.body).toHaveProperty(
                "hospital",
                externalPrescription.hospital
            );
            expect(res.body).toHaveProperty(
                "specialization",
                externalPrescription.specialization.toString()
            );
            expect(res.body.dateOnDocument).toEqual(
                externalPrescription.dateOnDocument.toISOString()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                externalPrescription.folderPath
            );
            externalPrescription.files.forEach((file) => {
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
