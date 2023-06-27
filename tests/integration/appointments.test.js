import mongoose from "mongoose";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Appointment } from "../../models/appointmentModel.js";
import { Profile } from "../../models/profileModel.js";
import { Account, roles } from "../../models/accountModel.js";
import moment from "moment";
import { Hospital } from "../../models/hospitalModel.js";

describe("/api/appointments", () => {
    afterEach(async () => {
        await Appointment.collection.deleteMany({});
        await Account.collection.deleteMany({});
        await Profile.collection.deleteMany({});
        await Hospital.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        let token, query, profileId, doctorAccount;

        beforeEach(async () => {
            profileId = mongoose.Types.ObjectId();
            doctorAccount = new Account({
                accessLevel: roles.hospital,
                hospital: mongoose.Types.ObjectId(),
            });
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            await Appointment.collection.insertMany([
                {
                    createdByAccountId: doctorAccount._id,
                    timeSlot: moment().add(7, "days"),
                    profile: mongoose.Types.ObjectId(),
                    hospital: {
                        _id: mongoose.Types.ObjectId(),
                        name: "General Checkup",
                    },
                },
                {
                    createdByAccountId: doctorAccount._id,
                    timeSlot: moment().add(7, "days"),
                },
                {
                    createdByAccountId: doctorAccount._id,
                    timeSlot: moment().add(7, "days"),
                    profile: profileId,
                    hospital: {
                        _id: mongoose.Types.ObjectId(),
                        name: "General Checkup",
                    },
                    cancelled: true,
                },
                {
                    createdByAccountId: mongoose.Types.ObjectId(),
                    timeSlot: moment().add(7, "days"),
                    profile: profileId,
                    hospital: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Follow-Up",
                    },
                },
            ]);
        });
        const exec = async function () {
            return await request(server)
                .get("/api/appointments")
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        // it("should return 400 if client is a user and profileId is not provided in query", async () => {
        //     token = new Account({ profiles: [profileId] }).generateAuthToken();
        //     const res = await exec();
        //     expect(res.status).toBe(400);
        // });

        // it("should return 403 if client is a user and profileId is not in account", async () => {
        //     token = new Account({ profiles: [profileId] }).generateAuthToken();
        //     query = { profileId: mongoose.Types.ObjectId().toString() };

        //     const res = await exec();
        //     expect(res.status).toBe(403);
        // });

        it("should return 403 if client is not one of the role options", async () => {
            token = new Account({ accessLevel: 8 }).generateAuthToken();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        // it("should return only appointments belonging to the profile when client is a user", async () => {
        //     token = new Account({ profiles: [profileId] }).generateAuthToken();
        //     query = { profileId: profileId.toString() };

        //     const res = await exec();
        //     expect(res.status).toBe(200);
        //     expect(res.body.length).toBe(2);
        // });

        it("should return only appointments of the hospital when client is a doctor", async () => {
            token = doctorAccount.generateAuthToken();

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(3);
        });

        it("should return all the appointments if client is an admin", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(4);
        });
    });

    describe("GET /openslots", () => {
        let token, query, profileId, doctorAccount;

        beforeEach(async () => {
            profileId = mongoose.Types.ObjectId();
            doctorAccount = new Account({
                accessLevel: roles.hospital,
                hospital: mongoose.Types.ObjectId(),
            });
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            await Appointment.collection.insertMany([
                {
                    createdByAccountId: doctorAccount._id,
                    timeSlot: moment("2023-03-16T19:42:00+05:30").add(1, "day"),
                    profile: mongoose.Types.ObjectId(),
                    hospital: {
                        _id: mongoose.Types.ObjectId(),
                        name: "General Checkup",
                    },
                },
                {
                    createdByAccountId: doctorAccount._id,
                    timeSlot: moment("2023-03-16T19:42:00+05:30").add(1, "day"),
                },
                {
                    createdByAccountId: doctorAccount._id,
                    timeSlot: moment("2023-03-16T22:42:00+05:30"),
                },
                {
                    createdByAccountId: doctorAccount._id,
                    timeSlot: moment("2023-03-17T22:42:00+05:30"),
                },
                {
                    createdByAccountId: mongoose.Types.ObjectId(),
                    timeSlot: moment("2023-03-17T21:42:00+05:30"),
                },

                {
                    createdByAccountId: doctorAccount._id,
                    timeSlot: moment("2023-03-17T22:42:00+05:30"),
                    profile: profileId,
                    hospital: {
                        _id: mongoose.Types.ObjectId(),
                        name: "General Checkup",
                    },
                    cancelled: true,
                },
                {
                    createdByAccountId: mongoose.Types.ObjectId(),
                    timeSlot: moment().add(7, "days"),
                    profile: profileId,
                    hospital: {
                        _id: mongoose.Types.ObjectId(),
                        name: "Follow-Up",
                    },
                },
            ]);
        });
        const exec = async function () {
            return await request(server)
                .get("/api/appointments/openslots")
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return only appointments belonging to the account when client is a doctor", async () => {
            token = doctorAccount.generateAuthToken();

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(3);
        });

        it("should return all the appointments if client is not a doctor", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(4);
        });
    });

    // describe("GET /:id", () => {
    //     let token, id, appointment;

    //     beforeEach(async () => {
    //         appointment = new Appointment({
    //             timeSlot: moment().add(7, "days"),
    //             profileId: mongoose.Types.ObjectId(),
    //             hospital: {
    //                 _id: mongoose.Types.ObjectId().toString(),
    //                 name: "General Checkup",
    //             },
    //         });
    //         await appointment.save();
    //         id = appointment._id;

    //         token = new Account({
    //             profiles: [appointment.profileId],
    //         }).generateAuthToken();
    //     });

    //     const exec = async function () {
    //         return await request(server)
    //             .get("/api/appointments/" + id)
    //             .set("x-auth-token", token);
    //     };

    //     it("should return 401 if client is not logged in", async () => {
    //         token = "";
    //         const res = await exec();
    //         expect(res.status).toBe(401);
    //     });

    //     it("should return 403 if appointment does not belong to doctor", async () => {
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

    //     it("should return 404 status if no appointment with given id is found", async () => {
    //         id = mongoose.Types.ObjectId();
    //         const response = await exec();
    //         expect(response.status).toBe(404);
    //     });

    //     it("should return the appointment if request is valid", async () => {
    //         const res = await exec();
    //         expect(res.status).toBe(200);
    //         expect(res.body).toHaveProperty("_id", appointment._id.toString());
    //         expect(res.body).toHaveProperty(
    //             "profileId",
    //             appointment.profileId.toString()
    //         );

    //         expect(res.body.hospital._id).toEqual(
    //             appointment.hospital._id.toString()
    //         );
    //         expect(new Date(res.body.timeSlot)).toEqual(appointment.timeSlot);
    //     });
    // });

    describe("POST /createslots", () => {
        let token, params, account, profile;

        beforeEach(async () => {
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
                hospital: mongoose.Types.ObjectId(),
                hospitalName: "hospital1",
            });
            await account.save();

            token = account.generateAuthToken();

            const startTime = moment("12-11-2031").format();
            const endTime = moment("12-11-2031").add(40, "minutes");
            params = {
                startTime,
                endTime,
            };
        });

        const exec = async function () {
            return await request(server)
                .post("/api/appointments/createSlots")
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";

            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if client is not at least a doctor", async () => {
            token = new Account({
                accessLevel: roles.user,
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 400 if client is admin and createdByAccountId is not provided", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if client is admin and createdByAccountId is invalid", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            params.createdByAccountId = { name: "blah" };

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if client is admin and no account with the given createdByAccountId exists", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            params.createdByAccountId = mongoose.Types.ObjectId();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if client is admin and the account with the given createdByAccountId is not a doctor", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            account = new Account({
                email: "abcd@abc.com",
                password: "123456",
                accessLevel: roles.admin,
            });
            await account.save();
            params.createdByAccountId = account._id;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should allow for appointment slots creation if client is admin and createdByAccountId is valid", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            params.createdByAccountId = account._id;

            const response = await exec();
            expect(response.status).toBe(201);
        });

        it("should return 400 if startTime is not provided", async () => {
            delete params.startTime;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if startTime is not a date", async () => {
            params.startTime = "a";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if startTime is not in the future", async () => {
            params.startTime = "09/14/2010";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if endTime is not provided", async () => {
            delete params.endTime;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if endTime is not a date", async () => {
            params.endTime = "a";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if endTime is not in the future", async () => {
            params.endTime = "09/13/2010";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if endTime is before startTime", async () => {
            params.endTime = moment("12/11/2031").add(-2, "minutes");
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if additional parameters are passed", async () => {
            params.other = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should store the appointments in the db if request is valid", async () => {
            await exec();
            const appointments = await Appointment.find({
                createdByAccountId: account._id,
            });

            expect(appointments).not.toBeNull();
            expect(appointments.length).toBe(2);
        });

        it("should return the appointment if request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(201);
            expect(res.body.length).toBe(2);

            expect(res.body[0]).toHaveProperty("_id");
            expect(res.body[0]).toHaveProperty(
                "createdByAccountId",
                account._id.toString()
            );
            expect(res.body[0]).toHaveProperty("timeSlot");
            expect(res.body[1]).toHaveProperty("_id");
            expect(res.body[1]).toHaveProperty(
                "createdByAccountId",
                account._id.toString()
            );
            expect(res.body[1]).toHaveProperty("timeSlot");
        });
    });

    describe("PATCH /book/:id", () => {
        let token,
            params,
            account,
            appointment,
            id,
            profile,
            hospital,
            doctorAccount;

        beforeEach(async () => {
            account = new Account({ email: "abc@abc.com", password: "123456" });
            doctorAccount = new Account({
                email: "abcde@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
                hospital: mongoose.Types.ObjectId(),
            });

            appointment = new Appointment({
                createdByAccountId: doctorAccount._id,
                timeSlot: moment().add(7, "days"),
            });

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                accountId: mongoose.Types.ObjectId(),
            });
            hospital = new Hospital({ name: "General Checkup" });

            await hospital.save();
            await profile.save();
            await account.save();
            await appointment.save();

            token = account.generateAuthToken();
            id = appointment._id;
            params = {
                profileId: profile._id.toString(),
                hospitalId: hospital._id.toString(),
            };
        });

        const exec = async function () {
            return await request(server)
                .patch("/api/appointments/book/" + id)
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

        it("should return 400 if profileId is invalid", async () => {
            params.profileId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if profileId is not found", async () => {
            params.profileId = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalId is not provided", async () => {
            delete params.hospitalId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalId is invalid", async () => {
            params.hospitalId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalId is not found", async () => {
            params.hospitalId = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(400);
        });

        // it("should return 403 if account is user and profileId does not belong to account", async () => {
        //     token = new Account({
        //         accessLevel: roles.user,
        //     }).generateAuthToken();
        //     const res = await exec();
        //     expect(res.status).toBe(403);
        // });

        it("should return 403 if account is hospital and appointment does not belong to account", async () => {
            token = new Account({
                accessLevel: roles.hospital,
                hospital: mongoose.Types.ObjectId(),
            }).generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should allow to book if account is hospital and appointment belongs to account", async () => {
            token = doctorAccount.generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(200);
        });

        it("should return 400 if unexpected parameter is passed", async () => {
            params.other = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no appointment with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 400 status if appointment slot is already booked", async () => {
            appointment.profile = mongoose.Types.ObjectId();
            appointment.hospital = {
                _id: mongoose.Types.ObjectId(),
                name: "hospital1",
            };
            await appointment.save();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should add the profile and hospital properties in the db if request is valid", async () => {
            await exec();
            const appointment = await Appointment.findById(id);

            expect(appointment.profile.toString()).toEqual(params.profileId);
            expect(appointment).toHaveProperty("hospital");
        });

        it("should add appointmentId to the profile's appointments if request is valid", async () => {
            await exec();
            const p = await Profile.findById(profile._id);

            expect(p.appointments[0]).toEqual(appointment._id);
        });

        it("should return the appointment if request is valid", async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id", appointment._id.toString());
            expect(res.body).toHaveProperty(
                "timeSlot",
                appointment.timeSlot.toISOString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                appointment.createdByAccountId.toString()
            );
            expect(res.body.profile.toString()).toBe(params.profileId);
            expect(res.body).toHaveProperty("hospital");
        });
    });

    describe("PATCH /reschedule/:id", () => {
        let token,
            params,
            account,
            appointment,
            newAppointment,
            id,
            profile,
            hospital,
            doctorAccount;

        beforeEach(async () => {
            doctorAccount = new Account({
                email: "abcde@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
                hospital: mongoose.Types.ObjectId(),
            });

            appointment = new Appointment({
                createdByAccountId: doctorAccount._id,
                timeSlot: moment().add(7, "days"),
                hospital: {
                    _id: mongoose.Types.ObjectId(),
                    name: "hospital1",
                },
            });
            newAppointment = new Appointment({
                createdByAccountId: doctorAccount._id,
                timeSlot: moment().add(8, "days"),
            });

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                accountId: mongoose.Types.ObjectId(),
                appointments: [appointment._id],
            });
            appointment.profile = profile._id;
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                profiles: [profile._id],
            });

            hospital = new Hospital({ name: "General Checkup" });

            await hospital.save();
            await profile.save();
            await account.save();
            await appointment.save();
            await newAppointment.save();

            token = account.generateAuthToken();
            id = appointment._id;
            params = {
                newAppointmentId: newAppointment._id.toString(),
                hospitalId: hospital._id.toString(),
            };
        });

        const exec = async function () {
            return await request(server)
                .patch("/api/appointments/reschedule/" + id)
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 400 if newAppointmentId is not provided", async () => {
            delete params.newAppointmentId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if newAppointmentId is invalid", async () => {
            params.newAppointmentId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if newAppointmentId is not found", async () => {
            params.newAppointmentId = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalId is not provided", async () => {
            delete params.hospitalId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalId is invalid", async () => {
            params.hospitalId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if hospitalId is not found", async () => {
            params.hospitalId = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 403 if account is user and profileId does not belong to account", async () => {
            token = new Account({
                accessLevel: roles.user,
            }).generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return 403 if account is hospital and appointment does not belong to account", async () => {
            token = doctorAccount.generateAuthToken();
            appointment.createdByAccountId = mongoose.Types.ObjectId();
            await appointment.save();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return 403 if appointment and newAppointment dont have the same createdByAccountId", async () => {
            token = doctorAccount.generateAuthToken();
            newAppointment.createdByAccountId = mongoose.Types.ObjectId();
            await newAppointment.save();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should allow to reschedule if account is hospital and both appointments belong to account", async () => {
            token = doctorAccount.generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(200);
        });

        it("should return 400 if unexpected parameter is passed", async () => {
            params.other = "abc";
            const response = await exec();

            expect(response.status).toBe(400);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no appointment with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 400 status if appointment slot is not booked", async () => {
            appointment.profile = undefined;
            appointment.hospital = undefined;
            await appointment.save();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 status if newAppointment slot is already booked", async () => {
            newAppointment.profile = mongoose.Types.ObjectId();
            newAppointment.hospital = {
                _id: mongoose.Types.ObjectId(),
                name: "hospital1",
            };
            await newAppointment.save();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should remove the profile and hospital properties in the db if request is valid", async () => {
            await exec();
            const appointment = await Appointment.findById(id);

            expect(appointment).toHaveProperty("profile", undefined);
            expect(appointment).toHaveProperty("hospital", undefined);
        });

        it("should add the profile and hospital properties in the db in the newAppointment if request is valid", async () => {
            await exec();
            const new_Appointment = await Appointment.findById(
                newAppointment._id
            );

            expect(new_Appointment.profile._id).toEqual(
                appointment.profile._id
            );
            expect(new_Appointment).toHaveProperty("hospital");
        });

        it("should add newAppointmentId and remove appointmentId in the appointments list of the profile if request is valid", async () => {
            await exec();
            const p = await Profile.findById(profile._id);

            expect(p.appointments.length).toBe(1);
            expect(p.appointments[0]).toEqual(newAppointment._id);
        });

        it("should return the new appointment if request is valid", async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty(
                "_id",
                newAppointment._id.toString()
            );
            expect(res.body).toHaveProperty(
                "timeSlot",
                newAppointment.timeSlot.toISOString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                newAppointment.createdByAccountId.toString()
            );
            expect(res.body.profile).toMatchObject(appointment.profile);
            expect(res.body).toHaveProperty("hospital");
        });
    });

    describe("PATCH /cancel/:id", () => {
        let token, account, appointment, id, profile, hospital, doctorAccount;

        beforeEach(async () => {
            doctorAccount = new Account({
                email: "abcde@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
                hospital: mongoose.Types.ObjectId(),
            });

            appointment = new Appointment({
                createdByAccountId: doctorAccount._id,
                timeSlot: moment().add(7, "days"),
                hospital: {
                    _id: mongoose.Types.ObjectId(),
                    name: "hospital1",
                },
            });
            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                accountId: mongoose.Types.ObjectId(),
                appointments: [appointment._id],
            });
            appointment.profile = profile._id;

            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                profiles: [profile._id],
            });

            hospital = new Hospital({ name: "General Checkup" });

            await hospital.save();
            await profile.save();
            await account.save();
            await appointment.save();

            token = account.generateAuthToken();
            id = appointment._id;
        });

        const exec = async function () {
            return await request(server)
                .patch("/api/appointments/cancel/" + id)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if account is user and profileId does not belong to account", async () => {
            token = new Account({
                accessLevel: roles.user,
            }).generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return 403 if account is hospital and appointment does not belong to account", async () => {
            token = doctorAccount.generateAuthToken();
            appointment.createdByAccountId = mongoose.Types.ObjectId();
            await appointment.save();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should allow to cancel if account is hospital and appointment belongs to account", async () => {
            token = doctorAccount.generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(200);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no appointment with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 400 status if appointment slot is not booked", async () => {
            appointment.profile = undefined;
            appointment.hospital = undefined;
            await appointment.save();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should set canceled to true in the db if request is valid", async () => {
            await exec();
            const appointment = await Appointment.findById(id);

            expect(appointment).toHaveProperty("cancelled", true);
        });

        it("should add another appointment with the same createdByAccountId and timeSlot in the db if request is valid", async () => {
            await exec();
            const appointments = await Appointment.find({
                createdByAccountId: appointment.createdByAccountId,
                timeSlot: appointment.timeSlot,
            });

            expect(appointments.length).toBe(2);
        });

        it("should return the cancelled appointment if request is valid", async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id", appointment._id.toString());
            expect(res.body).toHaveProperty(
                "timeSlot",
                appointment.timeSlot.toISOString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                appointment.createdByAccountId.toString()
            );
            expect(res.body.profile).toMatchObject(appointment.profile);
            expect(res.body).toHaveProperty("hospital");
            expect(res.body).toHaveProperty("cancelled", true);
        });
    });

    describe("DELETE /:id", () => {
        let token, account, appointment, id, profile;

        beforeEach(async () => {
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.admin,
            });

            appointment = new Appointment({
                createdByAccountId: mongoose.Types.ObjectId(),
                timeSlot: moment().add(7, "days"),
                hospital: {
                    _id: mongoose.Types.ObjectId(),
                    name: "hospital1",
                },
            });

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                accountId: mongoose.Types.ObjectId(),
                appointments: [appointment._id],
            });
            appointment.profile = profile._id;

            await account.save();
            await appointment.save();
            await profile.save();

            token = account.generateAuthToken();
            id = appointment._id;
        });

        const exec = async function () {
            return await request(server)
                .delete("/api/appointments/" + id)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 403 if account is not admin", async () => {
            token = new Account({
                accessLevel: roles.user,
            }).generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return 404 status if id is not valid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 status if no appointment with given id is found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should remove the appointment from the profile if request is valid", async () => {
            await exec();

            const p = await Profile.findById(appointment.profileId);
            expect(p.appointments).toEqual([]);
        });

        it("should remove the appointment from the db if request is valid", async () => {
            await exec();

            const a = await Appointment.findById(appointment._id);
            expect(a).toBeNull();
        });

        it("should return the cancelled appointment if request is valid", async () => {
            const res = await exec();

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("_id", appointment._id.toString());
            expect(res.body).toHaveProperty(
                "timeSlot",
                appointment.timeSlot.toISOString()
            );
            expect(res.body).toHaveProperty(
                "createdByAccountId",
                appointment.createdByAccountId.toString()
            );
            expect(res.body.profile).toMatchObject(appointment.profile);
            expect(res.body).toHaveProperty("hospital");
        });
    });
});
