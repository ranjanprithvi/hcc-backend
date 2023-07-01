import express from "express";
import _ from "lodash";
import mongoose from "mongoose";
import { admin } from "../middleware/admin.js";
import { auth } from "../middleware/auth.js";
import { checkAccess } from "../middleware/checkAccess.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { Profile } from "../models/profileModel.js";
import { Account, roles } from "../models/accountModel.js";
import { Appointment, appointmentSchema } from "../models/appointmentModel.js";
import moment from "moment";
import { hospital } from "../middleware/hospital.js";
import { Doctor } from "../models/doctorModel.js";
import Joi from "joi";
const router = express.Router();

router.get("/", [auth], async (req, res) => {
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|eq|ne)\b/g,
        (match) => `$${match}`
    );
    const query = JSON.parse(queryStr);

    let doctor = await Doctor.findById(query.doctorId);

    switch (req.account.accessLevel) {
        case roles.user:
            // User can get only open appointment slots
            query.profile = undefined;

            // User must provide a doctorId
            if (!Object.keys(query).includes("doctorId"))
                return res.status(400).send("Please provide doctorId");
            query.doctor = query.doctorId;
            delete query.doctorId;
            break;
        case roles.hospital:
            if (!Object.keys(query).includes("doctorId"))
                return res.status(400).send("Please provide doctorId");
            if (req.account.hospital != doctor.hospital)
                return res.status(403).send("Access Denied");
            query.doctor = query.doctorId;
            delete query.doctorId;
            break;
        case roles.admin:
            break;
        default:
            return res.status(403).send("Invalid User Type");
    }

    let date = query.date ? date : undefined;
    delete query.date;

    const appointments = await Appointment.find(query);
    res.send(
        date
            ? appointments.filter((a) => moment(a.timeSlot).isSame(date, "day"))
            : appointments
    );
});

// router.get("/openslots", auth, async (req, res) => {
//     let queryStr = JSON.stringify({ ...req.query });
//     queryStr = queryStr.replace(
//         /\b(gt|gte|lt|lte|eq|ne)\b/g,
//         (match) => `$${match}`
//     );
//     const query = JSON.parse(queryStr);
//     query.profile = undefined;

//     if (req.account.accessLevel == roles.hospital)
//         query.createdByAccountId = req.account._id;

//     let date = query.date ? date : undefined;
//     delete query.date;

//     const appointments = await Appointment.find(query);
//     res.send(
//         date
//             ? appointments.filter((a) => moment(a.timeSlot).isSame(date, "day"))
//             : appointments
//     );
// });

// router.get(
//     "/:id",
//     [
//         validateObjectId,
//         auth,
//         checkOwner(
//             [roles.admin, roles.user],
//             "hospital",
//             Appointment,
//             "doctor.hospital",
//             "doctor"
//         ),
//     ],
//     async (req, res) => {
//         const appointment = await Appointment.findById(req.params.id);
//         if (!appointment) {
//             return res.status(400).send("Appointment not found");
//         }
//         res.send(appointment);
//     }
// );

router.post(
    "/createSlots",
    [
        auth,
        hospital,
        validateBody(
            Joi.object(
                _.pick(appointmentSchema, ["startTime", "endTime", "doctorId"])
            )
        ),
    ],
    async (req, res) => {
        let doctor = await Doctor.findById(req.body.doctorId);

        if (req.account.accessLevel == roles.hospital) {
            if (req.account.hospital != doctor.hospital)
                return res.status(403).send("Access Denied");
        } else if (req.account.accessLevel == roles.admin) {
            if (!doctor) return res.status(400).send("Invalid DoctorId");
        }

        const start = moment(req.body.startTime);
        const end = moment(req.body.endTime);
        const appointments = [];

        for (
            let time = start;
            time < end;
            time = moment(time).add(20, "minutes")
        ) {
            appointments.push(
                await new Appointment({
                    doctor: req.body.doctorId,
                    timeSlot: time,
                }).save()
            );
        }

        res.status(201).send(appointments);
    }
);

router.patch(
    "/book/:id",
    [
        validateObjectId,
        auth,
        validateBody(Joi.object(_.pick(appointmentSchema, ["profileId"]))),
        checkAccess(
            [roles.admin, roles.user],
            "hospital",
            Appointment,
            "doctor.hospital",
            "doctor"
        ),
    ],
    async (req, res) => {
        let appointment = await Appointment.findById(req.params.id);
        if (!appointment) res.status(404).send("Resource not found");

        if (appointment.profile)
            return res
                .status(400)
                .send("Appointment slot has already been booked");

        if (!req.body.profileId)
            return res.status(400).send("Please provide profileId");

        let profile = await Profile.findById(req.body.profileId);
        if (!profile) return res.status(400).send("Invalid profileId");

        if (req.account.accessLevel == roles.user) {
            if (!req.account.profiles.includes(req.body.profileId))
                return res.status(403).send("Access Denied");
        }

        appointment.profile = profile._id;
        await appointment.save();

        profile.appointments.push(appointment._id);
        await profile.save();

        res.send(appointment);
    }
);

router.patch(
    "/reschedule/:id",
    [
        validateObjectId,
        auth,
        validateBody(
            Joi.object(_.pick(appointmentSchema, ["newAppointmentId"]))
        ),
        checkAccess(
            [roles.admin, roles.user],
            "hospital",
            Appointment,
            "doctor.hospital",
            "doctor"
        ),
        checkAccess(
            [roles.admin, roles.hospital],
            "_id",
            Appointment,
            "profile.account",
            "profile"
        ),
    ],
    async (req, res) => {
        //Check previous appointment
        let appointment = await Appointment.findById(req.params.id);
        if (!appointment) res.status(404).send("Resource not found");

        if (!appointment.profile)
            return res.status(400).send("Appointment has not been booked yet");

        let newAppointment = await Appointment.findById(
            req.body.newAppointmentId
        );

        // Check new appointment
        if (!newAppointment) res.status(400).send("Invalid New Appointment Id");

        if (newAppointment.profile)
            return res
                .status(400)
                .send("New appointment slot has already been booked");

        if (appointment.doctor.toString() != newAppointment.doctor.toString()) {
            return res
                .status(403)
                .send("Cannot reschedule appointment to a different doctor");
        }

        const profile = await Profile.findById(appointment.profile);
        // Remove old appointment from profile
        profile.appointments.splice(
            profile.appointments.indexOf(appointment._id),
            1
        );
        // Add new appointment to profile
        profile.appointments.push(newAppointment._id);
        await profile.save();

        // Add profile to new appointment
        newAppointment.profile = appointment.profile;
        await newAppointment.save();

        // Remove profile from old appointment
        appointment.profile = undefined;
        await appointment.save();

        res.send(newAppointment);
    }
);

router.patch(
    "/cancel/:id",
    [
        validateObjectId,
        auth,
        checkAccess(
            [roles.admin, roles.user],
            "hospital",
            Appointment,
            "doctor.hospital",
            "doctor"
        ),
        checkAccess(
            [roles.admin, roles.hospital],
            "_id",
            Appointment,
            "profile.account",
            "profile"
        ),
    ],
    async (req, res) => {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) res.status(404).send("Resource not found");

        if (!appointment.profile)
            return res
                .status(400)
                .send("Appointment slot has not yet been booked");

        if (appointment.cancelled == true)
            return res
                .status(400)
                .send("Appointment has already been cancelled");

        // Mark appointment as cancelled
        appointment.cancelled = true;
        await appointment.save();

        // Create new appointment for the same time slot and same doctor
        await new Appointment({
            timeSlot: appointment.timeSlot,
            doctor: appointment.doctor,
        }).save();

        // Remove appointment from profile
        const profile = await Profile.findById(appointment.profile._id);
        profile.appointments.splice(
            profile.appointments.indexOf(appointment._id),
            1
        );
        await profile.save();

        res.send(appointment);
    }
);

router.delete("/:id", [validateObjectId, auth, admin], async (req, res) => {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).send("Resource not found");

    // Remove appointment from profile
    const profile = await Profile.findById(appointment.profile);
    profile.appointments.splice(
        profile.appointments.indexOf(appointment._id),
        1
    );
    await profile.save();

    res.send(appointment);
});

export default router;
