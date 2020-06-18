module.exports = {
  registrationOtpBody:
    "Dear User, <br><br> One Time Password (OTP) to complete the registration process is <b> " +
    "#OTPValue" +
    " </b>. <br><br> Sincerely, <br> <b>planEd Team</b>",
  registrationOtpSub: "OTP confirmation alert for your planEd account creation",
  forgetPasswordOtpSub:
    "OTP confirmation alert to reset your planEd account password",
  forgetPasswordOtpBody:
    "Dear User, <br><br> One Time Password (OTP) to reset your password is <b> " +
    "#OTPValue" +
    " </b>. <br><br> Sincerely, <br> <b>planEd Team</b>",
  accountCreatedSub: "planEd account created",
  accountCreatedBody:
    "Dear Student, <br><br> Your planEd account has been created. " +
    "Request you to login with the below credentials: <br><br> " +
    "User Id: <b>" +
    "#UserId" +
    "</b> <br> " +
    "Password: <b>" +
    "#UserPassword" +
    "</b>" +
    " <br><br> Sincerely, <br> <b>planEd Team</b>",
  teacherAddedSub: "Added to #Insti",
  teacherAddedBody:
    "Dear Teacher, <br><br> You have been added to <b>#Insti</b> by <b>#Admin</b>. " +
    "Request you to login and verify the same." +
    " <br><br> Sincerely, <br> <b>planEd Team</b>",
  teacherAddedToBatchSub: "Added to #Batch in #Insti",
  teacherAddedToBatchBody:
    "Dear Teacher, <br><br> You have been added to batch, <b>#Batch</b> in institute, <b>#Insti</b> by <b>#Admin</b>. " +
    "Request you to login and verify the same." +
    " <br><br> Sincerely, <br> <b>planEd Team</b>",
  studentAddedToBatchSub: "Added to #Batch in #Insti",
  studentAddedToBatchBody:
    "Dear Student, <br><br> You have been added to batch, <b>#Batch</b> in institute, <b>#Insti</b/>. " +
    "Request you to login with the below mentioned user id and verify the same. <br><br>" +
    "User Id: <b>" +
    "#UserId </b>" +
    "<br><br><b>Note:</b> In case you are login for the first time, use forget password link to create your password." +
    " <br><br> Sincerely, <br> <b>planEd Team</b>",
  studentRejectedByTeacherSub: "#Insti || #Batch || Student has been rejected",
  studentRejectedByTeacherBody:
    "Dear Parent, <br><br> Request to add <b>#Student</b> in batch, <b>#Batch</b> in institute, <b>#Insti</b/> has been rejected. " +
    "Request you to verify the student details and add/update the same again." +
    " <br><br> Sincerely, <br> <b>planEd Team</b>"
};
