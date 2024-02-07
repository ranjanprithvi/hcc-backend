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
            profile2,
            doctor,
            hospital,
            hospitalAccount,
            userAccount,
            doctorQuery,
            dateQuery,
            appointment4;

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

            profile2 = new Profile({
                name: "profile2",
                gender: "male",
                dob: "04/24/1993",
                account: mongoose.Types.ObjectId(),
            });

            userAccount = new Account({
                accessLevel: roles.user,
                profiles: [profile._id],
            });

            token = userAccount.generateAuthToken();

            await doctor.save();
            await hospital.save();
            await profile.save();
            await profile2.save();

            const appointment1 = new Appointment({
                timeSlot: moment().add(7, "days"),
                profile: profile._id,
                doctor: doctor._id,
                cancelled: true,
            });
            const appointment2 = new Appointment({
                timeSlot: moment().add(7, "days"),
                profile: profile._id,
                doctor: mongoose.Types.ObjectId(),
            });
            const appointment3 = new Appointment({
                timeSlot: moment().add(7, "days"),
                profile: profile2._id,
                doctor: doctor._id,
            });
            appointment4 = new Appointment({
                timeSlot: moment().add(7, "days"),
                doctor: doctor._id,
            });
            const appointment5 = new Appointment({
                timeSlot: moment().add(8, "days"),
                doctor: doctor._id,
            });

            await appointment1.save();
            await appointment2.save();
            await appointment3.save();
            await appointment4.save();
            await appointment5.save();

            doctor.appointments.push({
                date: moment().add(7, "days"),
                appointments: [
                    appointment1._id,
                    appointment3._id,
                    appointment4._id,
                ],
            });
            doctor.appointments.push({
                date: moment().add(8, "days"),
                appointments: [appointment5._id],
            });
            await doctor.save();

            doctorQuery = "doctorId=" + doctor._id;
            dateQuery = "date=" + moment().add(7, "days").format("YYYY-MM-DD");
            queryStr = "/?" + doctorQuery + "&" + dateQuery;
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

        it("should return 400 when doctorId is not provided in query", async () => {
            queryStr = "/?" + dateQuery;

            const res = await exec();
            expect(res.status).toBe(400);
        });

        it("should return 400 when date is not provided in query", async () => {
            queryStr = "/?" + doctorQuery;

            const res = await exec();
            expect(res.status).toBe(400);
        });

        it("should return only open appointment slots of that date when client is a user", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0]).toHaveProperty(
                "_id",
                appointment4._id.toString()
            );
        });

        it("should return 403 when doctor does not belong to the hospital", async () => {
            token = hospitalAccount.generateAuthToken();
            doctor.hospital = mongoose.Types.ObjectId();
            await doctor.save();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return only appointments of the doctorId and date when client is a hospital", async () => {
            token = hospitalAccount.generateAuthToken();

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(3);
        });

        it("should return all the appointments if client is an admin", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            queryStr = "";

            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(5);
        });
    });

    describe("GET /my", () => {
        let token,
            queryStr,
            profile,
            profile2,
            doctor,
            hospital,
            userAccount,
            profileQuery;

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

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                account: mongoose.Types.ObjectId(),
            });

            profile2 = new Profile({
                name: "profile2",
                gender: "male",
                dob: "04/24/1993",
                account: mongoose.Types.ObjectId(),
            });

            userAccount = new Account({
                accessLevel: roles.user,
                email: "asdf@akdjf.com",
                password: "123456",
                profiles: [profile._id],
            });
            await userAccount.save();

            token = userAccount.generateAuthToken();

            await doctor.save();
            await hospital.save();

            const appointment1 = new Appointment({
                timeSlot: moment().add(7, "days"),
                profile: profile._id,
                doctor: doctor._id,
                cancelled: true,
            });
            const appointment2 = new Appointment({
                timeSlot: moment().add(7, "days"),
                profile: profile._id,
                doctor: mongoose.Types.ObjectId(),
            });
            const appointment3 = new Appointment({
                timeSlot: moment().add(7, "days"),
                profile: profile2._id,
                doctor: doctor._id,
            });
            const appointment4 = new Appointment({
                timeSlot: moment().add(7, "days"),
                doctor: doctor._id,
            });
            const appointment5 = new Appointment({
                timeSlot: moment().add(8, "days"),
                doctor: doctor._id,
            });

            profile.appointments.push(appointment1._id);
            profile.appointments.push(appointment2._id);
            profile2.appointments.push(appointment3._id);
            await profile.save();
            await profile2.save();

            await appointment1.save();
            await appointment2.save();
            await appointment3.save();
            await appointment4.save();
            await appointment5.save();

            doctor.appointments.push({
                date: moment().add(7, "days"),
                appointments: [
                    appointment1._id,
                    appointment3._id,
                    appointment4._id,
                ],
            });
            doctor.appointments.push({
                date: moment().add(8, "days"),
                appointments: [appointment5._id],
            });
            await doctor.save();

            profileQuery = "profileId=" + profile._id;
            queryStr = "/?" + profileQuery;
        });

        const exec = async function () {
            return await request(server)
                .get("/api/appointments/my" + queryStr)
                .set("x-auth-token", token);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 400 when profileId is not provided in query", async () => {
            queryStr = "";

            const res = await exec();
            expect(res.status).toBe(400);
        });

        it("should return 400 when profileId is invalid", async () => {
            queryStr = "/?profileId=" + mongoose.Types.ObjectId();

            const res = await exec();
            expect(res.status).toBe(400);
        });

        it("should return 403 when profileId does not belong to the account", async () => {
            queryStr = "/?profileId=" + profile2._id;

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should return only appointments belonging to that profileId", async () => {
            const res = await exec();
            expect(res.status).toBe(200);
            expect(res.body.length).toBe(2);
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
        let token, params, account, doctor, hospital;

        beforeEach(async () => {
            doctor = new Doctor({
                name: "doctor1",
                specialization: mongoose.Types.ObjectId(),
                qualifications: "MBBS",
                practicingSince: "1995",
                appointments: [
                    {
                        date: "2031-11-11",
                        appointments: [mongoose.Types.ObjectId()],
                    },
                ],
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

            // const startTime = moment("2031-11-12T13:00:00").format();
            // const endTime = moment("2031-11-12T13:00:00").add(40, "minutes");
            params = {
                doctorId: doctor._id,
                date: "2031-11-12",
                startTime: "17:00",
                endTime: "18:00",
                durationInMinutes: "20",
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

        it("should allow for appointment slots creation if client is admin and doctorId is valid", async () => {
            token = new Account({
                accessLevel: roles.admin,
            }).generateAuthToken();
            params.doctorId = doctor._id;

            const response = await exec();
            expect(response.status).toBe(201);
        });

        it("should return 400 if date is not provided", async () => {
            delete params.date;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if date is in the past", async () => {
            params.date = "2010-04-10";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if date is invalid", async () => {
            params.date = "2010-99-10";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if startTime is not provided", async () => {
            delete params.startTime;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if startTime is not a valid time", async () => {
            params.startTime = "a";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if endTime is not provided", async () => {
            delete params.endTime;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if endTime is not a valid time", async () => {
            params.endTime = "a";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if endTime is before startTime", async () => {
            params.endTime = "16:00";
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if durationInMinutes is not provided", async () => {
            delete params.durationInMinutes;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if durationInMinutes is not a number", async () => {
            params.durationInMinutes = "a";
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
            const appointments = await Appointment.find();

            expect(appointments).not.toBeNull();
            expect(appointments.length).toBe(3);
        });

        it("should add the appointments to the doctor's list if request is valid", async () => {
            params.date = "2031-11-11";
            await exec();
            const doc = await Doctor.findById(doctor._id);
            const group = doc.appointments.find((g) =>
                moment(g.date).isSame(moment(params.date), "day")
            );

            expect(doc.appointments.length).toBe(1);
            expect(group).not.toBeNull();
            expect(group.appointments.length).toBe(4);
        });

        it("should create a new group and add the appointments to the doctor's list if day group doesnt exist", async () => {
            await exec();
            const doc = await Doctor.findById(doctor._id);
            const group = doc.appointments.find((g) =>
                moment(g.date).isSame(moment(params.date), "day")
            );

            expect(doc.appointments.length).toBe(2);
            expect(group).not.toBeNull();
            expect(group.appointments.length).toBe(3);
        });

        it("should return the appointments if request is valid", async () => {
            const res = await exec();
            expect(res.status).toBe(201);
            expect(res.body.length).toBe(3);

            expect(res.body[0]).toHaveProperty("_id");
            expect(res.body[0]).toHaveProperty("doctor", doctor._id.toString());
            expect(res.body[0]).toHaveProperty("timeSlot");
            expect(res.body[1]).toHaveProperty("_id");
            expect(res.body[1]).toHaveProperty("doctor", doctor._id.toString());
            expect(res.body[1]).toHaveProperty("timeSlot");
        });
    });

    describe("PATCH /appointments/book/:id", () => {
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

            account = new Account({
                email: "abc@abc.com",
                password: "123456",
            });

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                account: account._id,
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
            doctor.appointments.push(
                {
                    date: moment().add(7, "days"),
                    appointments: [appointment._id],
                },
                {
                    date: moment().add(8, "days"),
                    appointments: [newAppointment._id],
                }
            );

            await doctor.save();
            await hospital.save();
            await profile.save();
            await account.save();
            await appointment.save();
            await newAppointment.save();

            token = account.generateAuthToken();
            id = appointment._id;
            params = {
                rescheduledAppointmentId: newAppointment._id.toString(),
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

        it("should return 404 if appointment id is invalid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 if appointment id is not found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 400 if rescheduledAppointmentId is not provided", async () => {
            delete params.rescheduledAppointmentId;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if rescheduledAppointmentId is invalid", async () => {
            params.rescheduledAppointmentId = 1;
            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should return 400 if rescheduledAppointmentId is not found", async () => {
            params.rescheduledAppointmentId = mongoose.Types.ObjectId();
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

        it("should return 403 status if appointment slot is not booked", async () => {
            appointment.profile = undefined;
            await appointment.save();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 400 status if newAppointment slot is already booked", async () => {
            newAppointment.profile = mongoose.Types.ObjectId();
            await newAppointment.save();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should set appointment cancelled to true if request is valid", async () => {
            await exec();
            const appointment = await Appointment.findById(id);

            expect(appointment).toHaveProperty("cancelled", true);
        });

        it("should add the profile property in the db in the newAppointment if request is valid", async () => {
            await exec();
            const new_Appointment = await Appointment.findById(
                newAppointment._id
            );

            expect(new_Appointment.profile).toEqual(appointment.profile);
        });

        it("should add rescheduledAppointmentId in the appointments list of the profile if request is valid", async () => {
            await exec();
            const p = await Profile.findById(profile._id);

            expect(p.appointments.length).toBe(2);
            expect(p.appointments[1]).toEqual(newAppointment._id);
        });

        it("should add replacement appointment in the appointments list of the doctor if request is valid", async () => {
            await exec();
            const d = await Doctor.findById(doctor._id).populate(
                "appointments.appointments"
            );

            expect(d.appointments[0].appointments.length).toEqual(2);
            expect(d.appointments[0].appointments[1]).toHaveProperty(
                "doctor",
                doctor._id
            );
            expect(d.appointments[0].appointments[1]).toHaveProperty(
                "timeSlot",
                appointment.timeSlot
            );
            expect(d.appointments[0].appointments[1]).toHaveProperty(
                "profile",
                undefined
            );
            expect(d.appointments[0].appointments[1]).toHaveProperty(
                "cancelled",
                undefined
            );
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
            params,
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

            account = new Account({
                email: "abc@abc.com",
                password: "123456",
            });

            profile = new Profile({
                name: "profile1",
                gender: "male",
                dob: "04/24/1995",
                account: account._id,
                appointments: [],
            });

            appointment = new Appointment({
                timeSlot: moment().add(7, "days"),
                doctor: doctor._id,
                profile: profile._id,
            });

            profile.appointments.push(appointment._id);
            doctor.appointments.push({
                date: moment().add(7, "days"),
                appointments: [appointment._id],
            });

            await doctor.save();
            await hospital.save();
            await profile.save();
            await account.save();
            await appointment.save();

            token = account.generateAuthToken();
            id = appointment._id;
            params = {};
        });

        const exec = async function () {
            return await request(server)
                .patch("/api/appointments/cancel/" + id)
                .set("x-auth-token", token)
                .send(params);
        };

        it("should return 401 if client is not logged in", async () => {
            token = "";
            const res = await exec();
            expect(res.status).toBe(401);
        });

        it("should return 404 if appointment id is invalid", async () => {
            id = 1;
            const response = await exec();
            expect(response.status).toBe(404);
        });

        it("should return 404 if appointment id is not found", async () => {
            id = mongoose.Types.ObjectId();
            const response = await exec();
            expect(response.status).toBe(404);
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
            appointment.doctor = mongoose.Types.ObjectId();
            await appointment.save();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should allow to cancel if account is hospital and doctor belongs to account", async () => {
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

        it("should return 403 status if appointment slot is not booked", async () => {
            appointment.profile = undefined;
            await appointment.save();

            const response = await exec();
            expect(response.status).toBe(403);
        });

        it("should return 400 status if appointment has already been cancelled", async () => {
            appointment.cancelled = true;
            await appointment.save();

            const response = await exec();
            expect(response.status).toBe(400);
        });

        it("should set appointment cancelled to true if request is valid", async () => {
            await exec();
            const appointment = await Appointment.findById(id);

            expect(appointment).toHaveProperty("cancelled", true);
        });

        it("should add replacement appointment in the appointments list of the doctor if request is valid", async () => {
            await exec();
            const d = await Doctor.findById(doctor._id).populate(
                "appointments.appointments"
            );

            expect(d.appointments[0].appointments.length).toEqual(2);
            expect(d.appointments[0].appointments[1]).toHaveProperty(
                "doctor",
                doctor._id
            );
            expect(d.appointments[0].appointments[1]).toHaveProperty(
                "timeSlot",
                appointment.timeSlot
            );
            expect(d.appointments[0].appointments[1]).toHaveProperty(
                "profile",
                undefined
            );
            expect(d.appointments[0].appointments[1]).toHaveProperty(
                "cancelled",
                undefined
            );
        });

        it("should return the new appointment if request is valid", async () => {
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
            expect(res.body).toHaveProperty("cancelled", true);
        });
    });

    describe("DELETE /:id", () => {
        let token,
            adminAccount,
            doctor,
            hospital,
            hospitalAccount,
            appointment,
            id,
            profile;

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

            adminAccount = new Account({
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
                doctor: doctor._id,
                profile: profile._id,
            });

            profile.appointments.push(appointment._id);
            doctor.appointments.push({
                date: moment().add(7, "days"),
                appointments: [appointment._id],
            });

            await adminAccount.save();
            await appointment.save();
            await profile.save();
            await doctor.save();

            token = hospitalAccount.generateAuthToken();
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

        it("should return 403 if account is not hospital or admin", async () => {
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

        it("should return 403 if account is hospital and doctor does not belong to hospital", async () => {
            appointment.doctor = mongoose.Types.ObjectId();
            await appointment.save();

            const res = await exec();
            expect(res.status).toBe(403);
        });

        it("should remove the appointment from the profile if request is valid", async () => {
            await exec();

            const p = await Profile.findById(profile._id);
            expect(p.appointments).toEqual([]);
        });

        it("should remove the appointment from the doctor if request is valid", async () => {
            await exec();

            const d = await Doctor.findById(doctor._id);
            expect(d.appointments[0].appointments).toEqual([]);
        });

        it("should remove the appointment from the db if request is valid", async () => {
            await exec();

            const a = await Appointment.findById(appointment._id);
            expect(a).toBeNull();
        });

        it("should remove the appointment from the db if account is admin and request is valid", async () => {
            token = adminAccount.generateAuthToken();
            await exec();

            const a = await Appointment.findById(appointment._id);
            expect(a).toBeNull();
        });

        it("should return the deleted appointment if request is valid", async () => {
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
