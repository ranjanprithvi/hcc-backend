import mongoose from "mongoose";
import request from "supertest";
import server from "../../index";
import { logger } from "../../startup/logger";
import { conn } from "../../startup/mongo";
import { Appointment } from "../../models/appointmentModel.js";
import { Profile } from "../../models/profileModel.js";
import { Account, roles } from "../../models/accountModel.js";
import moment from "moment";
import { Doctor } from "../../models/doctorModel";
import { Hospital } from "../../models/hospitalModel";

describe("/api/appointments", () => {
    afterEach(async () => {
        await Appointment.collection.deleteMany({});
        await Account.collection.deleteMany({});
        await Profile.collection.deleteMany({});
        await Doctor.collection.deleteMany({});
        await Hospital.collection.deleteMany({});
        // server.close();
    });

    afterAll(async () => {
        conn.close();
        logger.close();
        server.close();
    });

    describe("GET /", () => {
        let token,
            queryStr,
            profile,
            doctor,
            hospital,
            userAccount,
            hospitalAccount;

        beforeEach(async () => {
            doctor = new Doctor({
                name: "doctor1",
                specialization: mongoose.Types.ObjectId(),
                qualifications: "MBBS",
                practicingSince: "1995",
            });
            hospital = new Hospital({
                name: "Hospital 1",
                doctors: [doctor._id],
            });
            doctor.hospital = hospital._id;
            hospitalAccount = new Account({
                email: "abcde@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
                hospital: hospital._id,
            });

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                account: mongoose.Types.ObjectId(),
            });

            userAccount = new Account({
                accessLevel: roles.user,
                profiles: [profile._id],
            });

            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();

            // await userAccount.save();
            await doctor.save();
            await hospital.save();
            await profile.save();
            // await hospitalAccount.save();

            await Appointment.collection.insertMany([
                {
                    timeSlot: moment().add(7, "days"),
                    profile: mongoose.Types.ObjectId(),
                    doctor: doctor._id,
                },
                {
                    timeSlot: moment().add(7, "days"),
                    doctor: doctor._id,
                },
                {
                    timeSlot: moment().add(7, "days"),
                    profile: profile._id,
                    doctor: doctor._id,
                    cancelled: true,
                },
                {
                    timeSlot: moment().add(7, "days"),
                    profile: profile._id,
                    doctor: mongoose.Types.ObjectId(),
                },
            ]);
            queryStr = "/?doctorId=" + doctor._id;
        });
        const exec = async function () {
            return await request(server)
                .get("/api/appointments" + queryStr)
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

        it("should return 400 when doctorId is not provided in query", async () => {
            token = userAccount.generateAuthToken();
            queryStr = "";

            const res = await exec();
            expect(res.status).toBe(400);
        });

        it("should return only open appointment slots when client is a user", async () => {
            token = userAccount.generateAuthToken();

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(1);
        });

        it("should return only appointments of the doctorId when client is a hospital", async () => {
            token = hospitalAccount.generateAuthToken();

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

    // describe("GET /openslots", () => {
    //     let token, query, profileId, doctorAccount;

    //     beforeEach(async () => {
    //         profileId = mongoose.Types.ObjectId();
    //         doctorAccount = new Account({
    //             accessLevel: roles.hospital,
    //             hospital: mongoose.Types.ObjectId(),
    //         });
    //         token = new Account({
    //             accessLevel: roles.admin,
    //         }).generateAuthToken();
    //         await Appointment.collection.insertMany([
    //             {
    //                 createdByAccountId: doctorAccount._id,
    //                 timeSlot: moment("2023-03-16T19:42:00+05:30").add(1, "day"),
    //                 profile: mongoose.Types.ObjectId(),
    //                 hospital: {
    //                     _id: mongoose.Types.ObjectId(),
    //                     name: "General Checkup",
    //                 },
    //             },
    //             {
    //                 createdByAccountId: doctorAccount._id,
    //                 timeSlot: moment("2023-03-16T19:42:00+05:30").add(1, "day"),
    //             },
    //             {
    //                 createdByAccountId: doctorAccount._id,
    //                 timeSlot: moment("2023-03-16T22:42:00+05:30"),
    //             },
    //             {
    //                 createdByAccountId: doctorAccount._id,
    //                 timeSlot: moment("2023-03-17T22:42:00+05:30"),
    //             },
    //             {
    //                 createdByAccountId: mongoose.Types.ObjectId(),
    //                 timeSlot: moment("2023-03-17T21:42:00+05:30"),
    //             },

    //             {
    //                 createdByAccountId: doctorAccount._id,
    //                 timeSlot: moment("2023-03-17T22:42:00+05:30"),
    //                 profile: profileId,
    //                 hospital: {
    //                     _id: mongoose.Types.ObjectId(),
    //                     name: "General Checkup",
    //                 },
    //                 cancelled: true,
    //             },
    //             {
    //                 createdByAccountId: mongoose.Types.ObjectId(),
    //                 timeSlot: moment().add(7, "days"),
    //                 profile: profileId,
    //                 hospital: {
    //                     _id: mongoose.Types.ObjectId(),
    //                     name: "Follow-Up",
    //                 },
    //             },
    //         ]);
    //     });
    //     const exec = async function () {
    //         return await request(server)
    //             .get("/api/appointments/openslots")
    //             .set("x-auth-token", token);
    //     };

    //     it("should return 401 if client is not logged in", async () => {
    //         token = "";
    //         const res = await exec();
    //         expect(res.status).toBe(401);
    //     });

    //     it("should return only appointments belonging to the account when client is a doctor", async () => {
    //         token = doctorAccount.generateAuthToken();

    //         const res = await exec();
    //         expect(res.status).toBe(200);
    //         expect(res.body.length).toBe(3);
    //     });

    //     it("should return all the appointments if client is not a doctor", async () => {
    //         const res = await exec();
    //         expect(res.status).toBe(200);
    //         expect(res.body.length).toBe(4);
    //     });
    // });

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
        let token, params, account, doctor, hospital;

        beforeEach(async () => {
            doctor = new Doctor({
                name: "doctor1",
                specialization: mongoose.Types.ObjectId(),
                qualifications: "MBBS",
                practicingSince: "1995",
            });
            hospital = new Hospital({
                name: "Hospital 1",
                doctors: [doctor._id],
            });
            doctor.hospital = hospital._id;
            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
                hospital: hospital._id,
            });
            await doctor.save();
            await hospital.save();
            await account.save();

            token = account.generateAuthToken();

            const startTime = moment("12-11-2031").format();
            const endTime = moment("12-11-2031").add(40, "minutes");
            params = {
                doctorId: doctor._id,
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

        it("should return 403 if account is not at least a hospital", async () => {
            token = new Account({
                accessLevel: roles.user,
            }).generateAuthToken();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        // it("should return 400 if client is admin and doctorId is not provided", async () => {
        //     token = new Account({
        //         accessLevel: roles.admin,
        //     }).generateAuthToken();

        //     const response = await exec();
        //     expect(response.status).toBe(400);
        // });

        it("should return 400 if doctorId is invalid", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            params.doctorId = 1;

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if client is admin and no doctor with the given doctorId exists", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            params.doctorId = mongoose.Types.ObjectId();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 403 when doctor does not belong to the hospital", async () => {
            doctor.hospital = mongoose.Types.ObjectId();
            await doctor.save();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        // it("should return 400 if client is admin and the account with the given createdByAccountId is not a doctor", async () => {
        //     token = new Account({
        //         accessLevel: roles.admin,
        //     }).generateAuthToken();
        //     account = new Account({
        //         email: "abcd@abc.com",
        //         password: "123456",
        //         accessLevel: roles.admin,
        //     });
        //     await account.save();
        //     params.createdByAccountId = account._id;

        //     const response = await exec();
        //     expect(response.status).toBe(400);
        // });

        it("should allow for appointment slots creation if client is admin and doctorId is valid", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            params.doctorId = doctor._id;

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
            expect(res.body[0]).toHaveProperty("doctor", doctor._id.toString());
            expect(res.body[0]).toHaveProperty("timeSlot");
            expect(res.body[1]).toHaveProperty("_id");
            expect(res.body[1]).toHaveProperty("doctor", doctor._id.toString());
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
            doctor,
            hospitalAccount;

        beforeEach(async () => {
            account = new Account({ email: "abc@abc.com", password: "123456" });
            doctor = new Doctor({
                name: "doctor1",
                specialization: mongoose.Types.ObjectId(),
                qualifications: "MBBS",
                practicingSince: "1995",
            });
            hospital = new Hospital({
                name: "Hospital 1",
                doctors: [doctor._id],
            });
            doctor.hospital = hospital._id;
            hospitalAccount = new Account({
                email: "abcde@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
                hospital: hospital._id,
            });

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                account: mongoose.Types.ObjectId(),
            });

            appointment = new Appointment({
                timeSlot: moment().add(7, "days"),
                doctor: doctor._id,
            });

            account.profiles.push(profile._id);

            await account.save();
            await doctor.save();
            await hospital.save();
            await profile.save();
            await hospitalAccount.save();
            await appointment.save();

            token = account.generateAuthToken();
            id = appointment._id;
            params = {
                profileId: profile._id.toString(),
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

        // it("should return 400 if hospitalId is not provided", async () => {
        //     delete params.hospitalId;
        //     const response = await exec();
        //     expect(response.status).toBe(400);
        // });

        // it("should return 400 if hospitalId is invalid", async () => {
        //     params.hospitalId = 1;
        //     const response = await exec();
        //     expect(response.status).toBe(400);
        // });

        // it("should return 400 if hospitalId is not found", async () => {
        //     params.hospitalId = mongoose.Types.ObjectId();
        //     const response = await exec();
        //     expect(response.status).toBe(400);
        // });

        // it("should return 403 if account is user and profileId does not belong to account", async () => {
        //     token = new Account({
        //         accessLevel: roles.user,
        //     }).generateAuthToken();
        //     const res = await exec();
        //     expect(res.status).toBe(403);
        // });

        it("should return 403 if account is hospital and doctor does not belong to hospital", async () => {
            token = hospitalAccount.generateAuthToken();
            appointment.doctor = mongoose.Types.ObjectId();
            await appointment.save();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should allow to book if account is hospital and doctor belongs to hospital", async () => {
            token = hospitalAccount.generateAuthToken();

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
            await appointment.save();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should add the profile property in the db if request is valid", async () => {
            await exec();
            const appointment = await Appointment.findById(id);

            expect(appointment.profile.toString()).toEqual(params.profileId);
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
                "doctor",
                appointment.doctor.toString()
            );
            expect(res.body).toHaveProperty("profile", params.profileId);
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
            doctor,
            hospital,
            hospitalAccount;

        beforeEach(async () => {
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
            doctor.hospital = hospital._id;
            hospitalAccount = new Account({
                email: "abcde@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
                hospital: hospital._id,
            });

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                account: mongoose.Types.ObjectId(),
                appointments: [],
            });

            appointment = new Appointment({
                timeSlot: moment().add(7, "days"),
                doctor: doctor._id,
                profile: profile._id,
            });

            newAppointment = new Appointment({
                timeSlot: moment().add(8, "days"),
                doctor: doctor._id,
            });

            profile.appointments.push(appointment._id);

            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                profiles: [profile._id],
            });

            await doctor.save();
            await hospital.save();
            await profile.save();
            await account.save();
            await appointment.save();
            await newAppointment.save();

            token = account.generateAuthToken();
            id = appointment._id;
            params = {
                newAppointmentId: newAppointment._id.toString(),
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

        // it("should return 400 if hospitalId is not provided", async () => {
        //     delete params.hospitalId;
        //     const response = await exec();
        //     expect(response.status).toBe(400);
        // });

        // it("should return 400 if hospitalId is invalid", async () => {
        //     params.hospitalId = 1;
        //     const response = await exec();
        //     expect(response.status).toBe(400);
        // });

        // it("should return 400 if hospitalId is not found", async () => {
        //     params.hospitalId = mongoose.Types.ObjectId();
        //     const response = await exec();
        //     expect(response.status).toBe(400);
        // });

        it("should return 403 if account is user and profileId does not belong to account", async () => {
            token = new Account({
                accessLevel: roles.user,
            }).generateAuthToken();
            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return 403 if account is hospital and doctor does not belong to hospital", async () => {
            token = hospitalAccount.generateAuthToken();
            appointment.doctor = mongoose.Types.ObjectId();
            await appointment.save();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return 403 if appointment and newAppointment dont have the same doctor", async () => {
            token = hospitalAccount.generateAuthToken();
            newAppointment.doctor = mongoose.Types.ObjectId();
            await newAppointment.save();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should allow to reschedule if account is hospital and both appointments belong to account", async () => {
            token = hospitalAccount.generateAuthToken();
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
            await appointment.save();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 status if newAppointment slot is already booked", async () => {
            newAppointment.profile = mongoose.Types.ObjectId();
            await newAppointment.save();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should remove the profile  properties in the db if request is valid", async () => {
            await exec();
            const appointment = await Appointment.findById(id);

            expect(appointment).toHaveProperty("profile", undefined);
        });

        it("should add the profile property in the db in the newAppointment if request is valid", async () => {
            await exec();
            const new_Appointment = await Appointment.findById(
                newAppointment._id
            );

            expect(new_Appointment.profile).toEqual(appointment.profile);
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
                "doctor",
                newAppointment.doctor.toString()
            );
            expect(res.body).toHaveProperty(
                "profile",
                appointment.profile.toString()
            );
        });
    });

    describe("PATCH /cancel/:id", () => {
        let token,
            account,
            appointment,
            id,
            profile,
            doctor,
            hospital,
            hospitalAccount;

        beforeEach(async () => {
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
            doctor.hospital = hospital._id;
            hospitalAccount = new Account({
                email: "abcde@abc.com",
                password: "123456",
                accessLevel: roles.hospital,
                hospital: hospital._id,
            });

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                account: mongoose.Types.ObjectId(),
                appointments: [],
            });

            appointment = new Appointment({
                timeSlot: moment().add(7, "days"),
                doctor: doctor._id,
                profile: profile._id,
            });

            profile.appointments.push(appointment._id);

            account = new Account({
                email: "abc@abc.com",
                password: "123456",
                profiles: [profile._id],
            });

            await hospital.save();
            await doctor.save();
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

        it("should return 403 if account is hospital and doctor does not belong to hospital", async () => {
            token = hospitalAccount.generateAuthToken();
            doctor.hospital = mongoose.Types.ObjectId();
            await doctor.save();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should allow to cancel if account is hospital and doctor belongs to hospital", async () => {
            token = hospitalAccount.generateAuthToken();
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
                doctor: appointment.doctor,
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
                "profile",
                appointment.profile.toString()
            );
            expect(res.body).toHaveProperty(
                "doctor",
                appointment.doctor.toString()
            );
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

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                account: mongoose.Types.ObjectId(),
                appointments: [],
            });

            appointment = new Appointment({
                timeSlot: moment().add(7, "days"),
                doctor: mongoose.Types.ObjectId(),
                profile: profile._id,
            });

            profile.appointments.push(appointment._id);

            // profile = new Profile({
            //     name: "profile1",
            //     gender: "male",
            //     dob: "04/24/1995",
            //     account: mongoose.Types.ObjectId(),
            //     appointments: [appointment._id],
            // });
            // appointment.profile = profile._id;

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

            const p = await Profile.findById(appointment.profile);
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
                "doctor",
                appointment.doctor.toString()
            );
            expect(res.body).toHaveProperty(
                "profile",
                appointment.profile.toString()
            );
        });
    });
});
