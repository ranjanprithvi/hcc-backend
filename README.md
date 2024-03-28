**Accounts**

# User Accounts:

-   When a user account is created, it has no profiles

# Admin Accounts:

-   Can create and edit/delete all hospitals
    Doctors
-   Can create and edit/delete all doctors

**Profiles**

-   When a Profile is created under a user, it is added to the profiles list of the user account
-   When a profile is deleted, it is removed from the user account's profiles list

**Appointments**

-   When an appointment is created, there is no profileId and the cancelled flag is set to false.
-   When the appointment is booked, the profileId is added to the appointment and the appointmentId is added to the profile's list of appointments
-   When an appointment is canceled, the cancelled flag is made true and a new appointment with the same time slot and doctorId is created. The appointment is also removed from the profile's list of appointments

---- User Accounts ----

-   Can access all doctors appointments, but must provide doctorId, patientId
-   Can book appointment of any doctor

---- Doctor Accounts ----

-   Can access all appointments of the same hospital
-   Can only edit/delete those with same doctorId

---- Admin Accounts ----

-   Can access and edit/delete all appointments.

**Medical Records**

-   When a record is created, it is added to the profile's list of medical records
-   When deleted, it is removed from the profile's list of medical records

---- User Accounts ----

-   Can access and edit/delete only records with same profileId

---- Doctor Accounts ----

-   Can access all medical records of the patient, but must provide patient Id
-   Can only edit/delete those with same doctorId
    Prescriptions
-   Can access all prescriptions, but must provide patientId
-   Can only edit/delete those with the same doctorId

---- Admin Accounts ----

-   Can access and edit/delete all medical records.

**Prescriptions**

-   When a prescription is created, it is added to the profile's list of prescriptions
-   When deleted, it is removed from the profile's list of prescriptions

---- User Accounts ----

-   Can access and edit/delete only records with same profileId

---- Doctor Accounts ----

-   Can access all prescriptions of the same hospital
-   Can only edit/delete those with same doctorId

---- Admin Accounts ----

-   Can access and edit/delete all prescriptions.

**Doctors**

-   When a doctor is created, it is added to the hospital's list of doctors
-   When deleted, it is removed from the hospital's list
-   When hospital is changed, it is removed from former hospital's list and added to the new hospital's list
