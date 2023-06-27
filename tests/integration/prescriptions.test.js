import mongoose, { mongo } from "mongoose";
import moment from "moment";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Prescription } from "../../models/prescriptionModel.js";
import { Profile } from "../../models/profileModel.js";
import { Account, roles } from "../../models/accountModel.js";
import { Specialization } from "../../models/specializationModel.js";
import { Medication } from "../../models/medicationModel.js";
import _ from "lodash";

describe("/api/prescriptions", () => {
    afterEach(async () => {
        await Prescription.collection.deleteMany({});
        await Account.collection.deleteMany({});
        await Profile.collection.deleteMany({});
        await Medication.collection.deleteMany({});
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

            await Prescription.collection.insertMany([
                {
                    profileId: mongoose.Types.ObjectId(),
                    createdByAccountId: account._id,
                    folderPath: "abc/prescription1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                    hospitalName: "hospital1",
                    specialization: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Cardiology",
                    },
                    medications: [
                        {
                            medication: {
                                _id: mongoose.Types.ObjectId(),
                                name: "medication",
                            },
                            interval: "1-0-1",
                            durationInDays: 3,
                        },
                    ],
                },
                {
                    profileId: profileId,
                    createdByAccountId: account._id,
                    content: "abcaksjdfkladsf",
                    hospitalName: "hospital1",
                    specialization: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Cardiology",
                    },
                    medications: [
                        {
                            medication: {
                                _id: mongoose.Types.ObjectId(),
                                name: "medication1",
                            },
                            dosage: "100mg",
                            interval: "1-0-1",
                            durationInDays: 3,
                        },
                    ],
                },
                {
                    profileId: profileId,
                    createdByAccountId: mongoose.Types.ObjectId(),
                    content: "abcaksjdfkladsf",
                    folderPath: "abcs/prescription1",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                    hospitalName: "hospital2",
                    specialization: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Orthopaedics",
                    },
                    medications: [
                        {
                            medication: {
                                _id: mongoose.Types.ObjectId(),
                                name: "medication1",
                            },
                            dosage: "100mg",
                            interval: "1-0-1",
                            durationInDays: 3,
                        },
                        {
                            medication: {
                                _id: mongoose.Types.ObjectId(),
                                name: "medication2",
                            },
                            dosage: "100mg",
                            interval: "1-0-1",
                        },
                    ],
                },
                {
                    profileId: mongoose.Types.ObjectId(),
                    createdByAccountId: mongoose.Types.ObjectId(),
                    content: "abcaksjdfkladsf",
                    folderPath: "abcs/prescription2",
                    files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                    specialization: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Gynecology",
                    },
                    medications: [
                        {
                            medication: {
                                _id: mongoose.Types.ObjectId(),
                                name: "medication3",
                            },
                            interval: "1-0-1",
                            durationInDays: 3,
                        },
                    ],
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

        it("should return 400 if client is not an admin and profileId is not provided in query", async () => {
            queryStr = "";

            const res = await exec();
            expect(res.status).toBe(400);
        });

        it("should return only prescriptions belonging to the account or of those profiles belonging to the account", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
        });

        it("should return all the prescriptions if client is an admin", async () => {
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
    //     let token, id, prescription;

    //     beforeEach(async () => {
    //         prescription = new Prescription({
    //             timeSlot: moment().add(7, "days"),
    //             profileId: mongoose.Types.ObjectId(),
    //             recordType: {
    //                 _id: mongoose.Types.ObjectId().toString(),
    //                 name: "prescription",
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
            account,
            profile,
            medication,
            medication2,
            specialization;

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

            medication = new Medication({
                name: "med1",
            });
            await medication.save();

            medication2 = new Medication({
                name: "med2",
            });
            await medication2.save();

            specialization = new Specialization({
                name: "Cardiology",
            });
            await specialization.save();

            token = account.generateAuthToken();

            params = {
                profileId: profile._id,
                recordName: "prescription1",
                content: "kahsdjfkashdkasdfj",
                s3Path: "abc/",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                hospitalName: "hospital2",
                specializationId: specialization._id,
                dateOnDocument: "12/19/2000",
                medications: [
                    {
                        medicationId: medication._id,
                        dosage: "10mg",
                        interval: "1-0-1",
                        durationInDays: 4,
                    },
                    {
                        medicationId: medication2._id,
                        interval: "0-0-1",
                        durationInDays: 7,
                    },
                    {
                        medicationId: medication._id,
                        durationInDays: 4,
                    },
                    {
                        medicationId: medication2._id,
                        dosage: "10mg",
                        interval: "0-0-1",
                    },
                ],
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
                folderPath: "abc/prescription1",
            });

            const response = await exec();
            expect(response.status).toBe(400);
        });

        // it("should return 400 if recordTypeId is not provided", async () => {
        //     delete params.recordTypeId;
        //     const response = await exec();
        //     expect(response.status).toBe(400);
        // });

        it("should return 400 if content is not valid", async () => {
            params.content = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if content is less than 10 characters", async () => {
            params.content = "abc";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if content is greater than 5000 characters", async () => {
            params.content =
                "Lorem ipsum dolor sit amet consectetur, adipisicing elit. Inventore impedit dolorem odio neque libero sequi nisi dolores id perferendis distinctio dignissimos rem suscipit, totam accusamus at repellendus quos blanditiis perspiciatis doloribus provident reiciendis. Laboriosam labore soluta culpa tenetur cum quis ullam magnam sed doloribus. Distinctio atque quam beatae accusantium non delectus perferendis reprehenderit repudiandae consequatur minima incidunt laborum ullam, doloremque perspiciatis sapiente quisquam. Impedit deserunt, provident commodi facilis veritatis, corporis nesciunt sint unde non maiores quidem velit magnam? Numquam architecto perferendis unde aliquid fugiat! Quam, libero, quo nemo odit vitae rem pariatur dolores atque commodi quae accusantium quidem itaque? Id pariatur doloremque nam consectetur, omnis nesciunt quia qui esse ullam optio reiciendis saepe hic suscipit. Facilis recusandae illum error officiis optio cumque atque labore tempora natus dolor, quia delectus quidem, aliquam pariatur voluptatibus harum earum sed alias eaque iusto? A fuga eaque tenetur quisquam reprehenderit nesciunt amet deleniti pariatur quasi? Accusamus modi molestiae id consequatur quos officia odio, delectus cum ipsam itaque aperiam voluptatem, est, praesentium libero. Perspiciatis, ad deleniti! Lorem ipsum dolor sit amet consectetur, adipisicing elit. Inventore impedit dolorem odio neque libero sequi nisi dolores id perferendis distinctio dignissimos rem suscipit, totam accusamus at repellendus quos blanditiis perspiciatis doloribus provident reiciendis. Laboriosam labore soluta culpa tenetur cum quis ullam magnam sed doloribus. Distinctio atque quam beatae accusantium non delectus perferendis reprehenderit repudiandae consequatur minima incidunt laborum ullam, doloremque perspiciatis sapiente quisquam. Impedit deserunt, provident commodi facilis veritatis, corporis nesciunt sint unde non maiores quidem velit magnam? Numquam architecto perferendis unde aliquid fugiat! Quam, libero, quo nemo odit vitae rem pariatur dolores atque commodi quae accusantium quidem itaque? Id pariatur doloremque nam consectetur, omnis nesciunt quia qui esse ullam optio reiciendis saepe hic suscipit. Facilis recusandae illum error officiis optio cumque atque labore tempora natus dolor, quia delectus quidem, aliquam pariatur voluptatibus harum earum sed alias eaque iusto? A fuga eaque tenetur quisquam reprehenderit nesciunt amet deleniti pariatur quasi? Accusamus modi molestiae id consequatur quos officia odio, delectus cum ipsam itaque aperiam voluptatem, est, praesentium libero. Perspiciatis, ad deleniti! Lorem ipsum dolor sit amet consectetur, adipisicing elit. Inventore impedit dolorem odio neque libero sequi nisi dolores id perferendis distinctio dignissimos rem suscipit, totam accusamus at repellendus quos blanditiis perspiciatis doloribus provident reiciendis. Laboriosam labore soluta culpa tenetur cum quis ullam magnam sed doloribus. Distinctio atque quam beatae accusantium non delectus perferendis reprehenderit repudiandae consequatur minima incidunt laborum ullam, doloremque perspiciatis sapiente quisquam. Impedit deserunt, provident commodi facilis veritatis, corporis nesciunt sint unde non maiores quidem velit magnam? Numquam architecto perferendis unde aliquid fugiat! Quam, libero, quo nemo odit vitae rem pariatur dolores atque commodi quae accusantium quidem itaque? Id pariatur doloremque nam consectetur, omnis nesciunt quia qui esse ullam optio reiciendis saepe hic suscipit. Facilis recusandae illum error officiis optio cumque atque labore tempora natus dolor, quia delectus quidem, aliquam pariatur voluptatibus harum earum sed alias eaque iusto? A fuga eaque tenetur quisquam reprehenderit nesciunt amet deleniti pariatur quasi? Accusamus modi molestiae id consequatur quos officia odio, delectus cum ipsam itaque aperiam voluptatem, est, praesentium libero. Perspiciatis, ad deleniti! Lorem ipsum dolor sit amet consectetur, adipisicing elit. Inventore impedit dolorem odio neque libero sequi nisi dolores id perferendis distinctio dignissimos rem suscipit, totam accusamus at repellendus quos blanditiis perspiciatis doloribus provident reiciendis. Laboriosam labore soluta culpa tenetur cum quis ullam magnam sed doloribus. Distinctio atque quam beatae accusantium non delectus perferendis reprehenderit repudiandae consequatur minima incidunt laborum ullam, doloremque perspiciatis sapiente quisquam. Impedit deserunt, provident commodi facilis veritatis, corporis nesciunt sint unde non maiores quidem velit magnam? Numquam architecto perferendis unde aliquid fugiat! Quam, libero, quo nemo odit vitae rem pariatur dolores atque commodi quae accusantium quidem itaque? Id pariatur doloremque nam consectetur, omnis nesciunt quia qui esse ullam optio reiciendis saepe hic suscipit. Facilis recusandae illum error officiis optio cumque atque labore tempora natus dolor, quia delectus quidem, aliquam pariatur voluptatibus harum earum sed alias eaque iusto? A fuga eaque tenetur quisquam reprehenderit nesciunt amet deleniti pariatur quasi? Accusamus modi molestiae id consequatur quos officia odio, delectus cum ipsam itaque aperiam voluptatem, est, praesentium libero. Perspiciatis, ad deleniti!";
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

        it("should return 400 if medication with no medicationId is added", async () => {
            params.medications.push({});

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if invalid medicationId is added", async () => {
            params.medications.push({
                medicationId: mongoose.Types.ObjectId(),
            });

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if medication dosage is invalid", async () => {
            params.medications.push({
                medicationId: medication._id,
                dosage: 4,
            });

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if medication dosage is greater than 20 characters", async () => {
            params.medications.push({
                medicationId: medication._id,
                dosage: "abcdeabcdeabcdeabcdea",
            });

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if medication interval is invalid", async () => {
            params.medications.push({
                medicationId: medication._id,
                interval: 4,
            });

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if medication interval is greater than 20 characters", async () => {
            params.medications.push({
                medicationId: medication._id,
                interval: "abcdeabcdeabcdeabcdea",
            });

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if medication durationInDays is invalid", async () => {
            params.medications.push({
                medicationId: medication._id,
                durationInDays: "abc",
            });

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if medication durationInDays is greater than 300", async () => {
            params.medications.push({
                medicationId: medication._id,
                durationInDays: 301,
            });

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if medication instructions is invalid", async () => {
            params.medications.push({
                medicationId: medication._id,
                instructions: 2,
            });

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if medication instructions is greater than 100 characters", async () => {
            params.medications.push({
                medicationId: medication._id,
                instructions:
                    "abcdeabcdeabcdeabcdeaabcdeabcdeabcdeabcdeaabcdeabcdeabcdeabcdeaabcdeabcdeabcdeabcdeaabcdeabcdeabcdeabcdea",
            });

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
                folderPath: params.s3Path + params.recordName,
            });

            expect(prescriptions.length).toBe(1);
        });

        it("should return the prescription with hospitalName of account when client is hospital and request is valid", async () => {
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
            expect(res.body).toHaveProperty("content", params.content);
            expect(res.body).toHaveProperty(
                "folderPath",
                params.s3Path + params.recordName
            );
            params.files.forEach((file) => {
                expect(res.body.files).toEqual(
                    expect.arrayContaining([expect.objectContaining(file)])
                );
            });
            expect(res.body).toHaveProperty(
                "hospitalName",
                account.hospitalName
            );
            expect(
                res.body.medications.map((m) => {
                    return {
                        medicationId: m.medication._id.toString(),
                        ..._.pick(m, [
                            "dosage",
                            "interval",
                            "durationInDays",
                            "instructions",
                        ]),
                    };
                })
            ).toEqual(
                params.medications.map((m) => {
                    return {
                        medicationId: m.medicationId.toString(),
                        ..._.pick(m, [
                            "dosage",
                            "interval",
                            "durationInDays",
                            "instructions",
                        ]),
                    };
                })
            );
        });

        it("should return the prescription with hospitalName of params when client is user and request is valid", async () => {
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

            expect(
                res.body.medications.map((m) => {
                    return {
                        medicationId: m.medication._id,
                        ..._.pick(m, [
                            "dosage",
                            "interval",
                            "durationInDays",
                            "instructions",
                        ]),
                    };
                })
            ).toEqual(
                params.medications.map((m) => {
                    return {
                        medicationId: m.medicationId.toString(),
                        ..._.pick(m, [
                            "dosage",
                            "interval",
                            "durationInDays",
                            "instructions",
                        ]),
                    };
                })
            );
        });
    });

    describe("PATCH /", () => {
        let token,
            params,
            account,
            recordType,
            prescription,
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

            prescription = new Prescription({
                profileId: mongoose.Types.ObjectId(),
                createdByAccountId: account._id,
                content: "absdkasdfkasd",
                folderPath: "abc/prescription",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                hospitalName: "hospital1",
                dateOnDocument: "12/25/2022",
                specialization: {
                    _id: mongoose.Types.ObjectId(),
                    name: "Cardiology",
                },
                medications: [
                    {
                        _id: mongoose.Types.ObjectId(),
                        medication: {
                            _id: mongoose.Types.ObjectId(),
                            name: "med1",
                        },
                        dosage: "10mg",
                        interval: "1-0-1",
                        durationInDays: 5,
                        instructions: "After food",
                    },
                ],
            });
            await prescription.save();

            specialization = new Specialization({
                name: "Orthopaedics",
            });
            await specialization.save();

            token = account.generateAuthToken();

            params = {
                recordName: "prescription2",
                content: "askdjfjadsfaklsdfkasdjfasdkfjsadf",
                hospitalName: "hospital2",
                specializationId: specialization._id,
                dateOnDocument: "11/29/2019",
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

        it("should return 400 if recordName is not valid", async () => {
            params.recordName = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if recordName is not unique in this s3Path", async () => {
            await Prescription.collection.insertOne({
                folderPath: "abc/prescription2",
            });

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

        it("should return 400 if content is less than 10 characters", async () => {
            params.content = "abc";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if content is greater than 5000 characters", async () => {
            params.content =
                "Lorem ipsum dolor sit amet consectetur, adipisicing elit. Inventore impedit dolorem odio neque libero sequi nisi dolores id perferendis distinctio dignissimos rem suscipit, totam accusamus at repellendus quos blanditiis perspiciatis doloribus provident reiciendis. Laboriosam labore soluta culpa tenetur cum quis ullam magnam sed doloribus. Distinctio atque quam beatae accusantium non delectus perferendis reprehenderit repudiandae consequatur minima incidunt laborum ullam, doloremque perspiciatis sapiente quisquam. Impedit deserunt, provident commodi facilis veritatis, corporis nesciunt sint unde non maiores quidem velit magnam? Numquam architecto perferendis unde aliquid fugiat! Quam, libero, quo nemo odit vitae rem pariatur dolores atque commodi quae accusantium quidem itaque? Id pariatur doloremque nam consectetur, omnis nesciunt quia qui esse ullam optio reiciendis saepe hic suscipit. Facilis recusandae illum error officiis optio cumque atque labore tempora natus dolor, quia delectus quidem, aliquam pariatur voluptatibus harum earum sed alias eaque iusto? A fuga eaque tenetur quisquam reprehenderit nesciunt amet deleniti pariatur quasi? Accusamus modi molestiae id consequatur quos officia odio, delectus cum ipsam itaque aperiam voluptatem, est, praesentium libero. Perspiciatis, ad deleniti! Lorem ipsum dolor sit amet consectetur, adipisicing elit. Inventore impedit dolorem odio neque libero sequi nisi dolores id perferendis distinctio dignissimos rem suscipit, totam accusamus at repellendus quos blanditiis perspiciatis doloribus provident reiciendis. Laboriosam labore soluta culpa tenetur cum quis ullam magnam sed doloribus. Distinctio atque quam beatae accusantium non delectus perferendis reprehenderit repudiandae consequatur minima incidunt laborum ullam, doloremque perspiciatis sapiente quisquam. Impedit deserunt, provident commodi facilis veritatis, corporis nesciunt sint unde non maiores quidem velit magnam? Numquam architecto perferendis unde aliquid fugiat! Quam, libero, quo nemo odit vitae rem pariatur dolores atque commodi quae accusantium quidem itaque? Id pariatur doloremque nam consectetur, omnis nesciunt quia qui esse ullam optio reiciendis saepe hic suscipit. Facilis recusandae illum error officiis optio cumque atque labore tempora natus dolor, quia delectus quidem, aliquam pariatur voluptatibus harum earum sed alias eaque iusto? A fuga eaque tenetur quisquam reprehenderit nesciunt amet deleniti pariatur quasi? Accusamus modi molestiae id consequatur quos officia odio, delectus cum ipsam itaque aperiam voluptatem, est, praesentium libero. Perspiciatis, ad deleniti! Lorem ipsum dolor sit amet consectetur, adipisicing elit. Inventore impedit dolorem odio neque libero sequi nisi dolores id perferendis distinctio dignissimos rem suscipit, totam accusamus at repellendus quos blanditiis perspiciatis doloribus provident reiciendis. Laboriosam labore soluta culpa tenetur cum quis ullam magnam sed doloribus. Distinctio atque quam beatae accusantium non delectus perferendis reprehenderit repudiandae consequatur minima incidunt laborum ullam, doloremque perspiciatis sapiente quisquam. Impedit deserunt, provident commodi facilis veritatis, corporis nesciunt sint unde non maiores quidem velit magnam? Numquam architecto perferendis unde aliquid fugiat! Quam, libero, quo nemo odit vitae rem pariatur dolores atque commodi quae accusantium quidem itaque? Id pariatur doloremque nam consectetur, omnis nesciunt quia qui esse ullam optio reiciendis saepe hic suscipit. Facilis recusandae illum error officiis optio cumque atque labore tempora natus dolor, quia delectus quidem, aliquam pariatur voluptatibus harum earum sed alias eaque iusto? A fuga eaque tenetur quisquam reprehenderit nesciunt amet deleniti pariatur quasi? Accusamus modi molestiae id consequatur quos officia odio, delectus cum ipsam itaque aperiam voluptatem, est, praesentium libero. Perspiciatis, ad deleniti! Lorem ipsum dolor sit amet consectetur, adipisicing elit. Inventore impedit dolorem odio neque libero sequi nisi dolores id perferendis distinctio dignissimos rem suscipit, totam accusamus at repellendus quos blanditiis perspiciatis doloribus provident reiciendis. Laboriosam labore soluta culpa tenetur cum quis ullam magnam sed doloribus. Distinctio atque quam beatae accusantium non delectus perferendis reprehenderit repudiandae consequatur minima incidunt laborum ullam, doloremque perspiciatis sapiente quisquam. Impedit deserunt, provident commodi facilis veritatis, corporis nesciunt sint unde non maiores quidem velit magnam? Numquam architecto perferendis unde aliquid fugiat! Quam, libero, quo nemo odit vitae rem pariatur dolores atque commodi quae accusantium quidem itaque? Id pariatur doloremque nam consectetur, omnis nesciunt quia qui esse ullam optio reiciendis saepe hic suscipit. Facilis recusandae illum error officiis optio cumque atque labore tempora natus dolor, quia delectus quidem, aliquam pariatur voluptatibus harum earum sed alias eaque iusto? A fuga eaque tenetur quisquam reprehenderit nesciunt amet deleniti pariatur quasi? Accusamus modi molestiae id consequatur quos officia odio, delectus cum ipsam itaque aperiam voluptatem, est, praesentium libero. Perspiciatis, ad deleniti!";
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

        it("should return 404 status if no prescription with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 403 if prescription does not belong to account", async () => {
            token = new Account().generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should change the passed properties in the db if request is valid", async () => {
            await exec();
            const mr = await Prescription.findById(prescription._id);

            expect(mr).toHaveProperty("folderPath", "abc/prescription2");
            expect(mr).toHaveProperty("content", params.content);
            expect(mr.dateOnDocument.toISOString()).toEqual(
                new Date(params.dateOnDocument).toISOString()
            );
            expect(mr).toHaveProperty("hospitalName", params.hospitalName);
            expect(mr.specialization._id).toEqual(params.specializationId);
        });

        it("should return the prescription when request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(200);

            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty(
                "profileId",
                prescription.profileId.toString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                prescription.createdByAccountId.toString()
            );
            expect(res.body).toHaveProperty("content", params.content);
            expect(res.body).toHaveProperty("folderPath", "abc/prescription2");
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
            expect(
                res.body.medications.map((m) => {
                    return {
                        medicationId: m.medication._id.toString(),
                        ..._.pick(m, [
                            "dosage",
                            "interval",
                            "durationInDays",
                            "instructions",
                        ]),
                    };
                })
            ).toEqual(
                prescription.medications.map((m) => {
                    return {
                        medicationId: m.medication._id.toString(),
                        ..._.pick(m, [
                            "dosage",
                            "interval",
                            "durationInDays",
                            "instructions",
                        ]),
                    };
                })
            );
        });
    });

    describe("DELETE /:id", () => {
        let token, account, prescription, id, profile;

        beforeEach(async () => {
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
                hospitalName: "hospital1",
            });
            await account.save();

            prescription = new Prescription({
                profileId: mongoose.Types.ObjectId(),
                createdByAccountId: account._id,
                content: "absdkasdfkasd",
                folderPath: "abc/prescription",
                files: [{ name: "file1.jpeg", sizeInBytes: 10400 }],
                hospitalName: "hospital1",
                dateOnDocument: "12/25/2022",
                specialization: {
                    _id: mongoose.Types.ObjectId(),
                    name: "Cardiology",
                },
                medications: [
                    {
                        _id: mongoose.Types.ObjectId(),
                        medication: {
                            _id: mongoose.Types.ObjectId(),
                            name: "med1",
                        },
                        dosage: "10mg",
                        interval: "1-0-1",
                        durationInDays: 5,
                        instructions: "After food",
                    },
                ],
            });

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                accountId: mongoose.Types.ObjectId(),
                prescriptions: [prescription._id],
            });
            prescription.profileId = profile._id;

            await prescription.save();
            await profile.save();

            token = account.generateAuthToken();

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

        it("should return 403 if prescription does not belong to account", async () => {
            token = new Account().generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should remove the prescription from the profile if request is valid", async () => {
            await exec();

            const p = await Profile.findById(prescription.profileId);
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
                "profileId",
                prescription.profileId.toString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                prescription.createdByAccountId.toString()
            );
            expect(res.body).toHaveProperty(
                "folderPath",
                prescription.folderPath
            );
            expect(res.body.content).toEqual(prescription.content);
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
            expect(res.body.specialization._id).toEqual(
                prescription.specialization._id.toString()
            );
            expect(res.body.dateOnDocument).toEqual(
                prescription.dateOnDocument.toISOString()
            );
            expect(res.body).toHaveProperty(
                "hospitalName",
                prescription.hospitalName
            );
            expect(
                res.body.medications.map((m) => {
                    return {
                        medicationId: m.medication._id.toString(),
                        ..._.pick(m, [
                            "dosage",
                            "interval",
                            "durationInDays",
                            "instructions",
                        ]),
                    };
                })
            ).toEqual(
                prescription.medications.map((m) => {
                    return {
                        medicationId: m.medication._id.toString(),
                        ..._.pick(m, [
                            "dosage",
                            "interval",
                            "durationInDays",
                            "instructions",
                        ]),
                    };
                })
            );
        });
    });
});
