import express, { Request, Response } from "express";
import _ from "lodash";
import mongoose from "mongoose";
import { admin } from "../middleware/admin.js";
import { auth } from "../middleware/auth.js";
import { checkAccess } from "../middleware/check-access.js";
import { validateBody, validateEachParameter } from "../middleware/validate.js";
import validateObjectId from "../middleware/validate-object-id.js";
import { Profile } from "../models/profile-model.js";
import { Account, Roles } from "../models/account-model.js";
import {
    Appointment,
    appointmentSchema,
    createSlotsSchemaObject,
} from "../models/appointment-model.js";
import moment from "moment";
import { hospital } from "../middleware/hospital.js";
import { Doctor } from "../models/doctor-model.js";
import Joi from "joi";
const router = express.Router();

router.get("/", [auth], async (req: Request, res: Response) => {
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|eq|ne)\b/g,
        (match) => `$${match}`
    );
    const query = JSON.parse(queryStr);

    if (Roles.Admin == req.account.accessLevel) {
        const allAppointments = await Appointment.find();
        return res.send(allAppointments);
    }

    if (!Object.keys(query).includes("doctorId"))
        return res.status(400).send("Please provide doctorId");

    if (!Object.keys(query).includes("date"))
        return res.status(400).send("Please provide date");

    // Get appointments for a specific doctor
    let doctor = await Doctor.findById(query.doctorId);

    if (!doctor) return res.status(400).send("Invalid DoctorId");

    if (req.account.accessLevel == Roles.Hospital) {
        if (req.account.hospital != doctor.hospital)
            return res.status(403).send("Access Denied");
    }

    const dayGroup = doctor.appointments.find((group) =>
        moment(group.date).isSame(query.date, "day")
    );
    if (!dayGroup) return res.send([]);
    const appointmentPromises = dayGroup.appointments.map((id) => {
        const a = Appointment.findById(id).populate("profile");
        return a;
    });
    let appointments = await Promise.all(appointmentPromises);

    if (req.account.accessLevel == Roles.User) {
        appointments = appointments.filter((a) => a && !a.profile);
    }

    res.send(appointments);
});

router.get("/my", auth, async (req: Request, res: Response) => {
    let queryStr = JSON.stringify({ ...req.query });
    queryStr = queryStr.replace(
        /\b(gt|gte|lt|lte|eq|ne)\b/g,
        (match) => `$${match}`
    );
    const query = JSON.parse(queryStr);

    if (!Object.keys(query).includes("profileId"))
        return res.status(400).send("Please provide profileId");

    const profile = await Profile.findById(query.profileId).populate(
        "appointments"
    );
    if (!profile) return res.status(400).send("Invalid profileId");

    const user = await Account.findById(req.account._id);
    if (!user) return res.status(400).send("Invalid user");

    if (!user.profiles.includes(profile._id))
        return res.status(403).send("Access Denied");

    res.send(profile.appointments);
});

// router.get(
//     "/:id",
//     [
//         validateObjectId,
//         auth,
//         checkOwner(
//             [Roles.Admin, Roles.User],
//             "hospital",
//             Appointment,
//             "doctor.hospital",
//             "doctor"
//         ),
//     ],
//     async (req: Request, res:Response) => {
//         const appointment = await Appointment.findById(req.params.id);
//         if (!appointment) {
//             return res.status(400).send("Appointment not found");
//         }
//         res.send(appointment);
//     }
// );

router.post(
    "/createSlots",
    [auth, hospital, validateBody(createSlotsSchemaObject)],
    async (req: Request, res: Response) => {
        let doctor = await Doctor.findById(req.body.doctorId);

        if (!doctor) return res.status(400).send("Invalid DoctorId");

        if (req.account.accessLevel == Roles.Hospital) {
            if (req.account.hospital != doctor.hospital)
                return res.status(403).send("Access Denied");
        } else if (req.account.accessLevel == Roles.Admin) {
            if (!doctor) return res.status(400).send("Invalid DoctorId");
        }

        const start = moment(req.body.date + "T" + req.body.startTime);
        const end = moment(req.body.date + "T" + req.body.endTime);
        const appointments = [];

        for (
            let time = start;
            time < end;
            time = moment(time).add(req.body.durationInMinutes, "minutes")
        ) {
            appointments.push(
                await new Appointment({
                    doctor: req.body.doctorId,
                    timeSlot: time,
                }).save()
            );
        }

        const dayGroup = doctor.appointments.find((a) =>
            moment(a.date).isSame(req.body.date, "day")
        );

        if (!dayGroup) {
            doctor.appointments.push({
                date: req.body.date,
                appointments: appointments.map((a) => a._id),
            });
        } else {
            // console.log(dayGroup);
            dayGroup.appointments.push(...appointments.map((a) => a._id));
        }

        // console.log(doctor);
        await doctor.save();

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
            [Roles.Admin, Roles.User],
            "hospital",
            Appointment,
            "doctor.hospital",
            "doctor"
        ),
    ],
    async (req: Request, res: Response) => {
        let appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).send("Resource not found");

        if (appointment.profile)
            return res
                .status(400)
                .send("Appointment slot has already been booked");

        if (!req.body.profileId)
            return res.status(400).send("Please provide profileId");

        const profile = await Profile.findById(req.body.profileId);
        if (!profile) return res.status(400).send("Invalid profileId");

        if (req.account.accessLevel == Roles.User)
            if (profile.account != req.account._id) {
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
            [Roles.Admin, Roles.User],
            "hospital",
            Appointment,
            "doctor.hospital",
            "doctor"
        ),
        checkAccess(
            [Roles.Admin, Roles.Hospital],
            "_id",
            Appointment,
            "profile.account",
            "profile"
        ),
    ],
    async (req: Request, res: Response) => {
        // Mark old appointment as cancelled
        let appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).send("Resource not found");

        // Check rescheduled appointment
        let newAppointment = await Appointment.findById(
            req.body.newAppointmentId
        );
        if (!newAppointment)
            return res.status(400).send("Invalid New Appointment Id");

        if (newAppointment.profile)
            return res
                .status(400)
                .send("New appointment slot has already been booked");
        if (appointment.doctor.toString() != newAppointment.doctor.toString()) {
            return res
                .status(403)
                .send("Cannot reschedule appointment to a different doctor");
        }

        appointment.cancelled = true;
        await appointment.save();

        // Add profile to rescheduled appointment
        newAppointment.profile = appointment.profile;
        await newAppointment.save();

        const profile = await Profile.findById(appointment.profile);
        if (!profile)
            return res.status(400).send("Invalid profile in appointment");

        // Add rescheduled appointment to profile
        profile.appointments.push(newAppointment._id);
        await profile.save();

        const doctor = await Doctor.findById(appointment.doctor);
        if (!doctor)
            return res.status(400).send("Invalid doctor in appointment");

        // Create replacement appointment for the same time slot and same doctor
        const replacementAppointment = new Appointment({
            doctor: appointment.doctor,
            timeSlot: appointment.timeSlot,
        });
        await replacementAppointment.save();

        // Add replacement appointment to doctor's appointments
        const dayGroup = doctor.appointments.find((a) =>
            moment(a.date).isSame(appointment.timeSlot, "day")
        );
        if (!dayGroup)
            return res.status(400).send("Day group not found for appointment");

        dayGroup.appointments.push(replacementAppointment._id);
        await doctor.save();

        res.send(newAppointment);
    }
);

router.patch(
    "/cancel/:id",
    [
        validateObjectId,
        auth,
        checkAccess(
            [Roles.Admin, Roles.User],
            "hospital",
            Appointment,
            "doctor.hospital",
            "doctor"
        ),
        checkAccess(
            [Roles.Admin, Roles.Hospital],
            "_id",
            Appointment,
            "profile.account",
            "profile"
        ),
    ],
    async (req: Request, res: Response) => {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).send("Resource not found");

        if (appointment.cancelled == true)
            return res
                .status(400)
                .send("Appointment has already been cancelled");

        // Mark appointment as cancelled
        appointment.cancelled = true;
        await appointment.save();

        // Create rescheduled appointment for the same time slot and same doctor
        const newAppointment = new Appointment({
            timeSlot: appointment.timeSlot,
            doctor: appointment.doctor,
        });
        await newAppointment.save();

        const doctor = await Doctor.findById(appointment.doctor);
        if (!doctor)
            return res.status(400).send("Invalid doctor in appointment");

        // Add rescheduled appointment to doctor
        const dayGroup = doctor.appointments.find((a) =>
            moment(a.date).isSame(appointment.timeSlot, "day")
        );
        if (!dayGroup)
            return res.status(400).send("Day group not found for appointment");
        dayGroup.appointments.push(newAppointment._id);
        await doctor.save();

        // Remove appointment from profile
        // const profile = await Profile.findById(appointment.profile._id);
        // profile.appointments.splice(
        //     profile.appointments.indexOf(appointment._id),
        //     1
        // );
        // await profile.save();

        res.send(appointment);
    }
);

router.delete(
    "/:id",
    [
        validateObjectId,
        auth,
        hospital,
        checkAccess(
            [Roles.Admin, Roles.User],
            "hospital",
            Appointment,
            "doctor.hospital",
            "doctor"
        ),
    ],
    async (req: Request, res: Response) => {
        const appointment = await Appointment.findByIdAndDelete(req.params.id);
        if (!appointment) return res.status(404).send("Resource not found");

        // Remove appointment from profile
        if (appointment.profile) {
            const profile = await Profile.findById(appointment.profile);
            if (!profile)
                return res.status(400).send("Invalid profile in appointment");
            profile.appointments.splice(
                profile.appointments.indexOf(appointment._id),
                1
            );
            await profile.save();
        }

        // Remove appointment from doctor
        const doctor = await Doctor.findById(appointment.doctor);
        if (!doctor)
            return res.status(400).send("Invalid doctor in appointment");
        const dayGroup = doctor.appointments.find((a) =>
            moment(a.date).isSame(appointment.timeSlot, "day")
        );
        if (!dayGroup)
            return res.status(400).send("Day group not found for appointment");
        dayGroup.appointments.splice(
            dayGroup.appointments.indexOf(appointment._id),
            1
        );
        await doctor.save();

        res.send(appointment);
    }
);

export default router;
