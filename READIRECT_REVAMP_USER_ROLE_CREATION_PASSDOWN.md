# ReaDirect-V2 User Role Creation Passdown

Purpose: define only how ReaDirect-V2 user roles are created and how account
setup requirements work.

## Creation Chain

```text
Developers
-> System Administrator
-> School Administrator
-> Teacher
-> Learner
```

This passdown defines creation for System Administrator, School Administrator,
Teacher, Learner, and Guest accounts only.

Guest accounts are the lowest account type in the hierarchy. They are created
from the learner entry flow instead of by staff.

## System Administrator Creation

System Administrator credentials are provided by the developers.

The developer-provided System Administrator account is the starting account for
school and staff setup.

## School Administrator Creation

The System Administrator creates School Administrator accounts.

Initial School Administrator credentials use:

- Username.
- Temporary password.

The System Administrator does not need to provide the School Administrator email
address during initial account creation.

## School Administrator School Requirement

The School Administrator must enter their school before accessing the School
Admin Dashboard.

This is a mandatory account-completion requirement. It is not cleared by logging
out or starting a new session.

Until the school requirement is completed:

- The School Administrator must be redirected back to the school-entry screen
  after login.
- The School Administrator must not be able to access the School Admin
  Dashboard.
- The School Administrator must not be able to create Teacher accounts.

After logging in, the School Administrator can link an email address and change
their password.

Credential conversion rule:

1. School Administrator logs in with username and temporary password.
2. School Administrator enters their school if the school requirement is still
   incomplete.
3. School Administrator links an email address.
4. School Administrator creates a new password.
5. System sends email verification.
6. After successful email verification, the username is deleted.
7. The School Administrator login credentials become email address and new
   password.

## Teacher Creation

The School Administrator creates Teacher accounts.

Initial Teacher credentials use:

- Username.
- Temporary password.

When creating a Teacher, the School Administrator must assign:

- Grade level.
- Section.

Grade level is selected from a dropdown.

Allowed grade levels:

- Grade 1.
- Grade 2.
- Grade 3.
- Grade 4.
- Grade 5.
- Grade 6.

Section is entered through a text input.

The Teacher must be assigned to one specific grade level and one specific
section before the Teacher account can be created.

## Teacher First Login

On first login, the Teacher sees a large notification:

```text
You are part of Grade ____ Section ____
```

The grade and section values must come from the School Administrator assignment.

After logging in, the Teacher can link an email address and change their
password.

Credential conversion rule:

1. Teacher logs in with username and temporary password.
2. Teacher sees the assigned grade and section notification.
3. Teacher links an email address.
4. Teacher creates a new password.
5. System sends email verification.
6. After successful email verification, the username is deleted.
7. The Teacher login credentials become email address and new password.

## Learner Creation

The Teacher creates Learner accounts.

Learner creation must be rejected when any mandatory field is empty.

Mandatory Learner fields:

- First Name.
- Middle Name.
- Last Name.

Optional Learner fields:

- LRN.
- Suffix.

System-assigned Learner fields:

- Learner Code.
- Password.
- School.
- Grade level.
- Section.

The Learner Code is the credential needed for Learner login.

Learner Code input is case-insensitive. The frontend must automatically convert
typed Learner Codes to uppercase before submission, and the backend must treat
uppercase and lowercase input as the same Learner Code.

Learner Code rules:

- The Learner Code is generated automatically by the system.
- The Learner Code must be unique across the whole Learner database.
- Learner Code uniqueness is global, not school-scoped.
- Two Learners must never receive the same Learner Code, even if they belong to
  different schools.
- Learner Codes must be assigned in ascending sequence after each Learner
  creation.
- Learner Codes use this format:

```text
AA000
```

Learner Code sequence rules:

- The first code is `AA000`.
- The numeric portion increments first from `000` to `999`.
- After `AA999`, the next code is `BA000`.
- The first letter continues from `A` to `Z` while the second letter stays the
  same.
- After `ZA999`, the next code is `AB000`.
- The same pattern continues through the second letter.
- `KW000` is permanently reserved for the System Administrator Page Portals
  learner and must never be generated for a standard Learner.
- The standard sequence skips the reserved value. Therefore `JW999` is followed
  by `KW001`.

Sequence examples:

```text
AA000
AA001
...
AA999
BA000
...
ZA999
AB000
AB001
...
ZB999
AC000
```

### Portal-system Learner exception

The development portal account is fixed and is not created by a Teacher:

- Name: Kristen Rhine Wright.
- Learner Code: `KW000`.
- Account purpose: `portal_system`.
- School, Teacher, grade level, and section: none.
- Visibility: System Administrator Page Portals only.
- Analytics: always excluded.

Seeding or updating this account must not advance the global Learner Code
counter. It is a retained system fixture; reset operations clear its progress
and sessions, not the account itself.

Learner password rules:

- Learner passwords are generated automatically by the system.
- Learner passwords are always lowercase.
- The password format is one random fruit plus one random three-number sequence.
- The fruit must be randomly selected from `apple`, `orange`, or `lemon`.
- The number sequence must contain exactly 3 digits.

Password examples:

```text
apple123
orange123
lemon123
```

Learner school assignment rules:

- School is automatically assigned from the Teacher's school.
- Grade level is automatically assigned from the Teacher's grade level.
- Section is automatically assigned from the Teacher's section.
- The Teacher must not manually override school, grade level, or section during
  Learner creation.

## Guest Creation

Guest accounts are created from the `Let's Read` button.

After the `Let's Read` button is selected, the main screen must prioritize
Learner login fields for actual Learner accounts created in the system.

Primary Learner login fields:

- Learner Code.
- Password.

Guest creation must use very little registration. It must remain a lightweight
secondary path for public trial or guest reading access.

Guest creation must not require school, grade level, section, LRN, or full
Learner profile details.

Guest accounts do not receive Learner Codes.

## Username Deletion Rule

For School Administrator and Teacher accounts, the initial username is only a
temporary login identifier.

After successful email verification:

- The username must no longer be usable for login.
- The username must be removed from the account's active login credentials.
- The account must use email address and password for future login.

## Required Creation Fields

### School Administrator

Required at creation:

- Username.
- Temporary password.

Required before dashboard access:

- School.

Optional after login until credential conversion:

- Email address.
- New password.

Required for credential conversion:

- Verified email address.
- New password.

### Teacher

Required at creation:

- Username.
- Temporary password.
- Grade level.
- Section.

Required on first login:

- Display assigned grade and section notification.

Optional after login until credential conversion:

- Email address.
- New password.

Required for credential conversion:

- Verified email address.
- New password.

### Learner

Required at creation:

- First Name.
- Middle Name.
- Last Name.

Optional at creation:

- LRN.
- Suffix.

Generated at creation:

- Learner Code.
- Password.

Automatically assigned at creation:

- School from Teacher.
- Grade level from Teacher.
- Section from Teacher.

### Guest

Created from:

- `Let's Read` button.

Registration requirement:

- Minimal public guest registration only.

Must not require:

- School.
- Grade level.
- Section.
- LRN.
- Full Learner profile fields.
