const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const { errorMsg } = require("../../config/keys");
const UserOTPSchema = require("../../models/UserOTP");
//const { validateRegisterInput } = require("../../validations/User");
const {
  GenerateOTP,
  SendMail,
  GetCurrentDate,
} = require("../../common/Common");
const Student = require("../../models/Student");
const User = require("../../models/User");
const ForgetPassword = require("../../models/ForgetPassword");
const Teacher = require("../../models/Teacher");
const Institute = require("../../models/Institute");
const Batch = require("../../models/Batch");
const Admin = require("../../models/Admin");
const LiveSession = require("../../models/LiveSession");
const {
  registrationOtpBody,
  registrationOtpSub,
  forgetPasswordOtpBody,
  forgetPasswordOtpSub,
} = require("../../common/EmailTemplate");

//API will be hit for the first time while registering user in the system.
//Will receive email, mobile, password, confirm password.
//On success, will mail otp to user email and send id to mobile device
router.post("/otp", (req, res) => {
  //validateRegisterInput(req.body, function(obj) {
  //let { errors, isValid } = obj;
  //if (!isValid) {
  //res.status(200).send(errors);
  //} else {
  //Check whether the user is already registered with us or not.
  //If not, allow him to register.
  //Else inform him you are already registered.
  User.findOne({ cNo: req.body.cNo }).then((user) => {
    if (user) {
      res.status(200).json({
        flag: 0,
        msg: "Details are already registered. Request you to login.",
      });
    } else {
      //Check we have generated OTP for this user or not.
      //If yes, send the error to the user, stating registration in process.
      UserOTPSchema.findOne({ cNo: { $eq: req.body.cNo } })
        .then((userDetails) => {
          if (userDetails) {
            //Send the response stating that registration in process
            if (Math.trunc(Date.now() / 1000) - userDetails.dt <= 180) {
              //Compare with user details. In case of any change in the details
              //allow him
              res.status(200).json({
                flag: 0,
                msg:
                  "Registration is in process. Check your mail box and enter the OTP received.",
              });
            } else {
              //Delete the previous user otp entry and generate the new one
              UserOTPSchema.findOneAndDelete({
                cNo: { $eq: req.body.cNo },
              })
                .then((details) => {
                  GenerateRegistrationOTP(req.body)
                    .then((data) => {
                      res.status(200).json(data);
                    })
                    .catch((err) => {
                      res.status(200).json(errorMsg);
                    });
                })
                .catch((err) => {
                  console.log(err);
                  res.status(200).json(errorMsg);
                });
            }
          } else {
            GenerateRegistrationOTP(req.body)
              .then((data) => {
                res.status(200).json(data);
              })
              .catch((err) => {
                res.status(200).json(errorMsg);
              });
          }
        })
        .catch((err) => {
          console.log(err);
          res.status(200).json(errorMsg);
        });
    }
  });
  //}
  //});
});

//The API will be used to resend the OTP on the basis os user request.
router.post("/resendotp", (req, res) => {
  UserOTPSchema.findOne({ _id: req.body.id })
    .then((userotp) => {
      //If the previous OTP is not older tan 180 sec, send the same.
      //Else generate the new OTP, and send the same to user.
      if (Math.trunc(Date.now() / 1000) - userotp.dt <= 180) {
        SendMail(
          userotp.email,
          registrationOtpSub,
          registrationOtpBody.replace("#OTPValue", userotp.otp)
        )
          .then((response) => {
            res.status(200).json({
              flag: 1,
              id: userotp._id,
              msg: "OTP send successfully",
            });
          })
          .catch((err) => {
            console.log(err);
            return reject(errorMsg);
          });
      } else {
        GenerateOTP().then((otp) => {
          UserOTPSchema.findOneAndUpdate(
            { _id: userotp._id },
            { $set: { dt: Math.trunc(Date.now() / 1000), otp: otp } },
            { new: true }
          ).then((userOTP) => {
            SendMail(
              userOTP.email,
              registrationOtpSub,
              registrationOtpBody.replace("#OTPValue", userOTP.otp)
            )
              .then((response) => {
                res.status(200).json({
                  flag: 1,
                  id: userOTP._id,
                  msg: "OTP send successfully",
                });
              })
              .catch((err) => {
                console.log(err);
                return reject(errorMsg);
              });
          });
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will receive the user OTP Id and OTP.
//Perform checks on OTP like OTP hasn't expired.
//If not, register the user
//Send user ID and msg to user.
router.post("/register", (req, res) => {
  UserOTPSchema.findOne({ _id: req.body.id }).then((userDetails) => {
    if (userDetails) {
      if (Math.trunc(Date.now() / 1000) - Number(userDetails.dt) <= 180) {
        if (userDetails.otp == req.body.otp) {
          const user = new User({
            email: userDetails.email,
            cNo: userDetails.cNo,
            pwd: userDetails.pwd,
            nm: userDetails.nm,
            addrs: userDetails.addrs,
            role: userDetails.role,
          });

          user.save().then((user) => {
            setTimeout(() => {
              UserOTPSchema.findOneAndDelete({ cNo: userDetails.cNo })
                .then((res) => {})
                .catch((err) => {
                  console.log(err);
                });
            }, 2000);
            res.status(200).json({
              flag: 1,
              msg: "Registration completed successfully. Request you to login.",
            });
            //Delete from user OTP details collection
          });
        } else {
          res.status(200).json({
            flag: 0,
            msg: "OTP mismatch. Request you to enter correct OTP.",
          });
        }
      } else {
        res.status(200).json({
          flag: 0,
          msg: "OTP has expired. Request you to generate it again.",
        });
      }
    } else {
      res.status(200).json(errorMsg);
    }
  });
});

//The API will be used for login in the system.
//Will send the entire dashboard data and if not present
//will send the empty json data.
router.post("/login", (req, res) => {
  User.findOne({ cNo: String(req.body.uid) }).then((user) => {
    if (user) {
      bcrypt.compare(req.body.pwd, user.pwd).then((isMatch) => {
        if (isMatch) {
          //Check the role of the user and based on that we will send the dashboard
          //data to the user. User can have multiple roles, in that case revert user to
          //choose from which role he wants to choose.
          if (user.role.length == 1) {
            //If we have one role, send the relevant dashboard data to user.
            switch (user.role[0]) {
              case "P":
                //Fetch the parent dashboard data
                SendParentLoginResponse(user)
                  .then((response) => {
                    res.status(200).json(response);
                  })
                  .catch((err) => {
                    res.status(200).json(err);
                  });
                break;
              case "A": //Fetch the admin dashboard data
                SendAdminLoginResponse(user)
                  .then((response) => {
                    res.status(200).json(response);
                  })
                  .catch((err) => {
                    res.status(200).json(err);
                  });
                break;
              case "T": //Fetch the Teacher Dashoeard data
                SendTeacherLoginResponse(user)
                  .then((response) => {
                    res.status(200).json(response);
                  })
                  .catch((err) => {
                    res.status(200).json(err);
                  });
                break;
              case "S": //Fetch the Student Dashoeard data
                SendStudentLoginResponse(user)
                  .then((response) => {
                    res.status(200).json(response);
                  })
                  .catch((err) => {
                    res.status(200).json(err);
                  });
                break;
            }
          } else {
            //In case of multiple roles, revert him to choose a single role
            res.status(200).json({
              flag: 1,
              uId: user._id,
              data: user.role,
            });
          }
        } else {
          res.status(200).json({
            flag: 0,
            msg: "Request you to enter correct credentials.",
          });
        }
      });
    } else {
      res.status(200).json({
        flag: 0,
        msg: "Request you to signup.",
      });
    }
  });
});

//The API will receive the userId, role from the app.
//Send the dashboard data to required client.
router.post("/rolelogin", (req, res) => {
  switch (req.body.role) {
    case "P": //Fetch the parent dashboard data
      User.findOne({ _id: req.body.id })
        .then((user) => {
          SendParentLoginResponse(user)
            .then((response) => {
              res.status(200).json(response);
            })
            .catch((err) => {
              res.status(200).json(err);
            });
        })
        .catch((err) => {
          console.log(err);
          res.status(200).json(errorMsg);
        });
      break;
    case "A": //Fetch the admin dashboard data
      User.findOne({ _id: req.body.id })
        .then((user) => {
          SendAdminLoginResponse(user)
            .then((response) => {
              res.status(200).json(response);
            })
            .catch((err) => {
              res.status(200).json(err);
            });
        })
        .catch((err) => {
          console.log(err);
          res.status(200).json(errorMsg);
        });
      break;
    case "T": //Fetch the teacher dashboard data
      User.findOne({ _id: req.body.id })
        .then((user) => {
          SendTeacherLoginResponse(user)
            .then((response) => {
              res.status(200).json(response);
            })
            .catch((err) => {
              res.status(200).json(err);
            });
        })
        .catch((err) => {
          console.log(err);
          res.status(200).json(errorMsg);
        });
      break;
  }
});

//The API will be hit by parent in case of multiple institutes
//He will send institute Id and  parent Id and we will fetch
//the dashboard data.
router.post("/parents/ins", (req, res) => {
  User.findOne({ _id: req.body.pId })
    .then((parent) => {
      GetParentDashboardData(parent, req.body.insId).then((response) => {
        res.status(200).json(response);
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be hit by teacher in case of multiple institutes
//He will send institute Id and  teacher Id and we will fetch
//the dashboard data.
router.post("/teachers/ins", (req, res) => {
  User.findOne({ _id: req.body.tId })
    .then((teacher) => {
      GetTeacherDashboardData(teacher, req.body.insId).then((response) => {
        res.status(200).json(response);
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be hit by teacher when he/she will login from web.
router.post("/web/teachers/ins", (req, res) => {
  let resObj = {};
  let arrTeacherBatches = [];
  let arrTeacherTodayClasses = [];
  let arrBatch = [];
  User.findOne({ _id: req.body.tId })
    .then((teacherBasicDetails) => {
      resObj["tId"] = req.body.tId;
      resObj["tNm"] = teacherBasicDetails.nm;
      resObj["role"] = teacherBasicDetails.role.join(",");
      //Get the teacher batches in the institute
      Teacher.findOne({ tId: req.body.tId }).then((teacherInsDetails) => {
        for (let i = 0; i < teacherInsDetails.insti.length; i++) {
          if (teacherInsDetails.insti[i].insId == req.body.insId) {
            //You have the batches of the institutes... get the batch details
            resObj["batchCount"] = teacherInsDetails.insti[i].bIds.length; //batches teacher teaches in an insti
            let arrBatchIds = [];
            for (let b = 0; b < teacherInsDetails.insti[i].bIds.length; b++) {
              let bId = teacherInsDetails.insti[i].bIds[b].bId;
              arrBatchIds.push(bId);
            }

            resObj["studentCount"] = 0;
            Batch.find({ _id: { $in: arrBatchIds } }).then(
              (teacherBatchDetails) => {
                //Upcoming class logic -- start
                GetCurrentDate().then((dt) => {
                  let currentEpochTime = Math.trunc(
                    new Date(dt).getTime() / 1000
                  );
                  let weekDay = new Date(dt).getDay();
                  for (let b = 0; b < teacherBatchDetails.length; b++) {
                    let teacherBatchObj = {};
                    let batchObj = {};
                    let teacherTodayClassesObj = {};

                    batchObj["id"] = teacherBatchDetails[b]._id;
                    batchObj["nm"] = teacherBatchDetails[b].nm;

                    // teacherBatchObj["id"] = teacherBatchDetails[b]._id;
                    teacherBatchObj["Batch Name"] = teacherBatchDetails[b].nm;
                    teacherBatchObj["Subject"] = teacherBatchDetails[
                      b
                    ].sub.join(",");
                    //teacherBatchObj["timings"] = teacherBatchDetails[b].timings;
                    teacherBatchObj["Students"] =
                      teacherBatchDetails[b].student.length;
                    teacherBatchObj["Days"] = "";
                    for (
                      let t = 0;
                      t < teacherBatchDetails[b].timings.length;
                      t++
                    ) {
                      if (teacherBatchDetails[b].timings[t] != "-1") {
                        switch (t) {
                          case 0:
                            teacherBatchObj["Days"] += " S";
                            break;
                          case 1:
                            teacherBatchObj["Days"] += " M";
                            break;
                          case 2:
                            teacherBatchObj["Days"] += " T";
                            break;
                          case 3:
                            teacherBatchObj["Days"] += " W";
                            break;
                          case 4:
                            teacherBatchObj["Days"] += " T";
                            break;
                          case 5:
                            teacherBatchObj["Days"] += " F";
                            break;
                          case 6:
                            teacherBatchObj["Days"] += " S";
                            break;
                        }
                      }
                    }
                    teacherBatchObj["Days"] = String(
                      teacherBatchObj["Days"]
                    ).trim();
                    arrTeacherBatches.push(teacherBatchObj);
                    arrBatch.push(batchObj);
                    resObj["studentCount"] +=
                      teacherBatchDetails[b].student.length;

                    //Today Classes Logic
                    if (teacherBatchDetails[b].timings[weekDay] != "-1") {
                      teacherTodayClassesObj["Hours"] =
                        teacherBatchDetails[b].timings[weekDay];
                      teacherTodayClassesObj["Name"] =
                        teacherBatchDetails[b].nm +
                        " - " +
                        teacherBatchDetails[b].sub.join(",");
                      arrTeacherTodayClasses.push(teacherTodayClassesObj);
                    }
                  }

                  resObj["teacherBatches"] = arrTeacherBatches;
                  resObj["teacherTodayClasses"] = arrTeacherTodayClasses;
                  resObj["batches"] = arrBatch;

                  //Get Insti Name
                  Institute.findOne({ _id: req.body.insId }, "nm -_id").then(
                    (ins) => {
                      resObj["insNm"] = ins.nm;
                      resObj["insId"] = ins._id;
                      res.status(200).json({
                        flag: 1,
                        data: resObj,
                      });
                    }
                  );
                });
              }
            );
            break;
          }
        }
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be hit by student when he/she will login from web.
router.post("/web/students/ins", (req, res) => {
  let resObj = {};
  let arrStudentBatches = [];
  let arrStudentTodayClasses = [];
  let arrBatch = [];
  User.findOne({ _id: req.body.sId })
    .then((studentBasicDetails) => {
      resObj["sId"] = req.body.sId;
      resObj["sNm"] = studentBasicDetails.nm;
      resObj["role"] = studentBasicDetails.role.join(",");
      //Get the teacher batches in the institute
      Student.findOne({ sId: req.body.sId }).then((studentInsDetails) => {
        for (let i = 0; i < studentInsDetails.insti.length; i++) {
          if (studentInsDetails.insti[i].insId == req.body.insId) {
            //You have the batches of the institutes... get the batch details
            resObj["batchCount"] = studentInsDetails.insti[i].bIds.length; //batches student attend in an insti
            let arrBatchIds = [];
            for (let b = 0; b < studentInsDetails.insti[i].bIds.length; b++) {
              let bId = studentInsDetails.insti[i].bIds[b].bId;
              arrBatchIds.push(bId);
            }

            resObj["studentCount"] = 0;
            Batch.find({ _id: { $in: arrBatchIds } })
              .populate("teacher", "nm cNo -_id")
              .then((studentBatchDetails) => {
                //Upcoming class logic -- start
                GetCurrentDate().then((dt) => {
                  let currentEpochTime = Math.trunc(
                    new Date(dt).getTime() / 1000
                  );
                  let weekDay = new Date(dt).getDay();
                  for (let b = 0; b < studentBatchDetails.length; b++) {
                    let studentBatchObj = {};
                    let batchObj = {};
                    let studentTodayClassesObj = {};

                    batchObj["id"] = studentBatchDetails[b]._id;
                    batchObj["nm"] = studentBatchDetails[b].nm;

                    // studentBatchObj["id"] = studentBatchDetails[b]._id;
                    studentBatchObj["Batch Name"] = studentBatchDetails[b].nm;
                    studentBatchObj["Subject"] = studentBatchDetails[
                      b
                    ].sub.join(",");
                    //studentBatchObj["timings"] = studentBatchDetails[b].timings;
                    studentBatchObj["Students"] =
                      studentBatchDetails[b].student.length;
                    studentBatchObj["Days"] = "";
                    for (
                      let t = 0;
                      t < studentBatchDetails[b].timings.length;
                      t++
                    ) {
                      if (studentBatchDetails[b].timings[t] != "-1") {
                        switch (t) {
                          case 0:
                            studentBatchObj["Days"] += " S";
                            break;
                          case 1:
                            studentBatchObj["Days"] += " M";
                            break;
                          case 2:
                            studentBatchObj["Days"] += " T";
                            break;
                          case 3:
                            studentBatchObj["Days"] += " W";
                            break;
                          case 4:
                            studentBatchObj["Days"] += " T";
                            break;
                          case 5:
                            studentBatchObj["Days"] += " F";
                            break;
                          case 6:
                            studentBatchObj["Days"] += " S";
                            break;
                        }
                      }
                    }
                    studentBatchObj["Days"] = String(
                      studentBatchObj["Days"]
                    ).trim();
                    studentBatchObj["Teacher Name"] =
                      studentBatchDetails[b].teacher.nm;
                    arrStudentBatches.push(studentBatchObj);
                    arrBatch.push(batchObj);
                    resObj["studentCount"] +=
                      studentBatchDetails[b].student.length;

                    //Today Classes Logic
                    if (studentBatchDetails[b].timings[weekDay] != "-1") {
                      studentTodayClassesObj["Hours"] =
                        studentBatchDetails[b].timings[weekDay];
                      studentTodayClassesObj["Name"] =
                        studentBatchDetails[b].nm +
                        " - " +
                        studentBatchDetails[b].sub.join(",");
                      arrStudentTodayClasses.push(studentTodayClassesObj);
                    }
                  }

                  resObj["studentBatches"] = arrStudentBatches;
                  resObj["studentTodayClasses"] = arrStudentTodayClasses;
                  resObj["batches"] = arrBatch;

                  //Get live session of student today
                  let dt12Am = new Date(
                    dt.getFullYear(),
                    dt.getMonth(),
                    dt.getDate(),
                    0,
                    0,
                    0
                  );
                  LiveSession.find(
                    {
                      bId: { $in: arrBatchIds },
                      dt: { $gt: Math.trunc(dt12Am / 1000) },
                    },
                    "-_id"
                  ).then((liveSession) => {
                    let arrLiveSession = [];
                    for (let l = 0; l < liveSession.length; l++) {
                      let liveSessionObj = {};

                      liveSessionObj["Timings"] =
                        liveSession[l].startTime +
                        " - " +
                        liveSession[l].endTime;
                      liveSessionObj["Batch Name"] = liveSession[l].bNm;
                      liveSessionObj["Chapter"] = liveSession[l].chapter;
                      // liveSessionObj["Topic"] = liveSession[l].topic;

                      arrLiveSession.push(liveSessionObj);
                    }
                    resObj["studentTodaySessions"] = arrLiveSession;
                    //Get Insti Name
                    Institute.findOne({ _id: req.body.insId }, "nm").then(
                      (ins) => {
                        resObj["insNm"] = ins.nm;
                        resObj["insId"] = ins._id;
                        res.status(200).json({
                          flag: 1,
                          data: resObj,
                        });
                      }
                    );
                  });
                });
              });
            break;
          }
        }
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be hit by admin in case of multiple institutes
//He will send institute Id and  admin Id and we will fetch
//the dashboard data.
router.post("/admins/ins", (req, res) => {
  User.findOne({ _id: req.body.aId })
    .then((admin) => {
      GetAdminDashboardData(admin, req.body.insId).then((response) => {
        res.status(200).json(response);
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//Forget Password API
//The API will take the phone number of the user registered in the system.
//Generate the OTP and send the same to user over his registered email ID.
//OTP will be used by the user to update his password.
router.post("/forgetpasswordotp", (req, res) => {
  //First check the cNo provided by user is registered in our system.
  //Else request him to signup
  User.findOne({ cNo: req.body.cNo })
    .then((user) => {
      if (user) {
        ForgetPassword.findOne({ cNo: req.body.cNo })
          .then((pwdDetails) => {
            if (pwdDetails) {
              if (Math.trunc(Date.now() / 1000) - pwdDetails.dt > 180) {
                //User is found in the system, generate the otp and send the mail to user.
                GenerateOTP().then((OTP) => {
                  //Save the OTP details in the system and then send the mail to user
                  ForgetPassword.findOneAndUpdate(
                    { cNo: pwdDetails.cNo },
                    { $set: { dt: Math.trunc(Date.now() / 1000), otp: OTP } },
                    { new: true }
                  ).then((otpDetails) => {
                    //Send mail to user
                    SendMail(
                      user.email,
                      forgetPasswordOtpSub,
                      forgetPasswordOtpBody.replace("#OTPValue", otpDetails.otp)
                    )
                      .then((data) => {
                        res.status(200).json({
                          flag: 1,
                          id: otpDetails._id,
                          msg: "OTP sent successfully",
                        });
                      })
                      .catch((err) => {
                        console.log(err);
                        res.status(200).json(errorMsg);
                      });
                  });
                });
              } else {
                SendMail(
                  user.email,
                  forgetPasswordOtpSub,
                  forgetPasswordOtpBody.replace("#OTPValue", pwdDetails.otp)
                )
                  .then((data) => {
                    res.status(200).json({
                      flag: 1,
                      id: pwdDetails._id,
                      msg: "OTP sent successfully",
                    });
                  })
                  .catch((err) => {
                    console.log(err);
                    res.status(200).json(errorMsg);
                  });
              }
            } else {
              //User is found in the system, generate the otp and send the mail to user.
              GenerateOTP().then((OTP) => {
                //Save the OTP details in the system and then send the mail to user
                const forgetPasswordOTP = new ForgetPassword({
                  cNo: req.body.cNo,
                  otp: OTP,
                  email: user.email,
                  dt: Math.trunc(Date.now() / 1000),
                });

                forgetPasswordOTP
                  .save()
                  .then((otpDetails) => {
                    //Send mail to user
                    SendMail(
                      user.email,
                      forgetPasswordOtpSub,
                      forgetPasswordOtpBody.replace("#OTPValue", otpDetails.otp)
                    )
                      .then((data) => {
                        res.status(200).json({
                          flag: 1,
                          id: otpDetails._id,
                          msg: "OTP sent successfully",
                        });
                      })
                      .catch((err) => {
                        console.log(err);
                        res.status(200).json(errorMsg);
                      });
                  })
                  .catch((err) => {
                    console.log(err);
                    res.status(200).json(errorMsg);
                  });
              });
            }
          })
          .catch((err) => {
            console.log(err);
            res.status(200).json(errorMsg);
          });
      } else {
        res.status(200).json({
          flag: 0,
          msg:
            "This phone number is not linked to any account. Request you to signup.",
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be used to generate new OTP and send the user
router.post("/resendforgetpasswordotp", (req, res) => {
  ForgetPassword.findOne({ _id: req.body.id })
    .then((forgetpasswordotp) => {
      //If the previous OTP is not older tan 180 sec, send the same.
      //Else generate the new OTP, and send the same to user.
      if (Math.trunc(Date.now() / 1000) - forgetpasswordotp.dt <= 180) {
        SendMail(
          forgetpasswordotp.email,
          forgetPasswordOtpSub,
          forgetPasswordOtpBody.replace("#OTPValue", forgetpasswordotp.otp)
        )
          .then((response) => {
            res.status(200).json({
              flag: 1,
              id: forgetpasswordotp._id,
              msg: "OTP send successfully",
            });
          })
          .catch((err) => {
            console.log(err);
            return reject(errorMsg);
          });
      } else {
        GenerateOTP().then((otp) => {
          ForgetPassword.findOneAndUpdate(
            { _id: forgetpasswordotp._id },
            { $set: { dt: Math.trunc(Date.now() / 1000), otp: otp } },
            { new: true }
          ).then((forgetpasswordotp) => {
            SendMail(
              forgetpasswordotp.email,
              forgetPasswordOtpSub,
              forgetPasswordOtpBody.replace("#OTPValue", forgetpasswordotp.otp)
            )
              .then((response) => {
                res.status(200).json({
                  flag: 1,
                  id: forgetpasswordotp._id,
                  msg: "OTP send successfully",
                });
              })
              .catch((err) => {
                console.log(err);
                return reject(errorMsg);
              });
          });
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will receive the new password from the user
//and update the same in User collection
router.post("/resetpassword", (req, res) => {
  ForgetPassword.findOne({ _id: req.body.id }).then((pwdDetails) => {
    if (pwdDetails) {
      if (Math.trunc(Date.now() / 1000) - Number(pwdDetails.dt) <= 180) {
        if (pwdDetails.otp == req.body.otp) {
          //When the OTP has matched, generate hash of user password
          //and update the same in User collection
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.pwd, salt, (err, hash) => {
              if (err) throw err;
              else {
                User.findOneAndUpdate(
                  { cNo: pwdDetails.cNo },
                  { $set: { pwd: hash } },
                  { new: true }
                )
                  .then((user) => {
                    res.status(200).json({
                      flag: 1,
                      msg:
                        "Password updated successfully. Request you to login.",
                    });
                  })
                  .catch((err) => {
                    console.log(err);
                    res.status(200).json(errorMsg);
                  });
              }
            });
          });
        } else {
          res.status(200).json({
            flag: 0,
            msg: "OTP mismatch. Request you to enter correct OTP.",
          });
        }
      } else {
        res.status(200).json({
          flag: 0,
          msg: "OTP has expired. Request you to generate it again.",
        });
      }
    } else {
      res.status(200).json(errorMsg);
    }
  });
});

//Function will be used to fetch the dasboard data of parents
//and send the same to him
const GetParentDashboardData = (parentDetails, insId = "-1") => {
  try {
    return new Promise((resolve, reject) => {
      //Means parent have access to one insId.
      //Send him the dashboard data accordingly
      if (insId === "-1") {
        return resolve({
          flag: 1,
          data: {
            insId: "5e44485bc5f9613d060ae74b",
            insNm: "Institute 1",
            pId: "5e444553332ed10b4449459f",
            students: [
              {
                sId: "5e44f183b26a8736acda83fa",
                sNm: "Student 1",
                lstAttended: "23 - Oct - 2019",
                badges: {
                  Maths: "S",
                  Science: "N",
                  SST: "G",
                  Attendance: "B",
                },
                batches: [
                  { bId: "5e444d3f37d6f12430533cf9", nm: "Batch 1 - Maths" },
                  { bId: "5e444d3f37d6f12430533cf9", nm: "Batch 1 - Maths" },
                ],
                attendance: 70,
                notifCnt: 21,
                nextCls: "Science",
                fee: {
                  lstDt: "01 - Sep - 2019",
                  lstMethod: "PayTm",
                  dueDt: "01 - Oct - 2019",
                  dueMethod: "PayTm/Cash/Other",
                },
                result: {
                  Maths: 80,
                  Science: 40,
                  SST: 95,
                  Attendance: 70,
                },
                graph1: {
                  Maths: [80, 100, "26 - Oct - 2010"],
                  Science: [40, 100, "26 - Oct - 2019"],
                  SST: [95, 95, "26 - Oct - 2019"],
                },
                graph2: {
                  Maths: [
                    { "20 - Oct - 2019": 90 },
                    { "24 - Oct - 2019": 70 },
                    { "26 - Oct - 2019": 80 },
                  ],
                  Science: [
                    { "10 - Oct - 2019": 30 },
                    { "15 - Oct - 2019": 60 },
                    { "20 - Oct - 2019": 50 },
                    { "25 - Oct - 2019": 20 },
                    { "30 - Oct - 2019": 40 },
                  ],
                  SST: [
                    { "10 - Oct - 2019": 90 },
                    { "15 - Oct - 2019": 93 },
                    { "20 - Oct - 2019": 97 },
                    { "25 - Oct - 2019": 100 },
                    { "30 - Oct - 2019": 95 },
                  ],
                },
              },
              {
                sId: "5e44f183b26a8736acda83fa",
                sNm: "Student 1",
                lstAttended: "23 - Oct - 2019",
                badges: {
                  Maths: "S",
                  Science: "N",
                  SST: "G",
                  Attendance: "B",
                },
                batches: [
                  { bId: "5e444d3f37d6f12430533cf9", nm: "Batch 1 - Maths" },
                  { bId: "5e444d3f37d6f12430533cf9", nm: "Batch 1 - Maths" },
                ],
                attendance: 70,
                notifCnt: 21,
                nextCls: "Science",
                fee: {
                  lstDt: "01 - Sep - 2019",
                  lstMethod: "PayTm",
                  dueDt: "01 - Oct - 2019",
                  dueMethod: "PayTm/Cash/Other",
                },
                result: {
                  Maths: 80,
                  Science: 40,
                  SST: 95,
                  Attendance: 70,
                },
                graph1: {
                  Maths: [80, 100, "26 - Oct - 2010"],
                  Science: [40, 100, "26 - Oct - 2019"],
                  SST: [95, 95, "26 - Oct - 2019"],
                },
                graph2: {
                  Maths: [
                    { "20 - Oct - 2019": 90 },
                    { "24 - Oct - 2019": 70 },
                    { "26 - Oct - 2019": 80 },
                  ],
                  Science: [
                    { "10 - Oct - 2019": 30 },
                    { "15 - Oct - 2019": 60 },
                    { "20 - Oct - 2019": 50 },
                    { "25 - Oct - 2019": 20 },
                    { "30 - Oct - 2019": 40 },
                  ],
                  SST: [
                    { "10 - Oct - 2019": 90 },
                    { "15 - Oct - 2019": 93 },
                    { "20 - Oct - 2019": 97 },
                    { "25 - Oct - 2019": 100 },
                    { "30 - Oct - 2019": 95 },
                  ],
                },
              },
            ],
          },
          pId: parentDetails._id,
        });
      }
      //Parent have access to multiple institutes.
      //Now search parent data of single institue.
      else {
        //Check whether the Student of the parent is
        //confirmed in the batches or not and show him the data for the
        //batches teacher has confirmed
        Student.find({ pId: parentDetails._id })
          .then((studentDetails) => {
            let studentBatches = {};
            //This loop indicates parent can have multiple students
            for (let s = 0; s < studentDetails.length; s++) {
              //This loop indicates, single parent student can have multiple insti in our system.
              for (let i = 0; i < studentDetails[s].insti.length; i++) {
                //Here we will look for the only institute that parent has
                //logged for.
                if (studentDetails[s].insti[i].insId == insId) {
                  //This loop indicates student can have multiple batches in the same insti
                  for (
                    let b = 0;
                    b < studentDetails[s].insti[i].bIds.length;
                    b++
                  ) {
                    //Check for the batches for which the student is confirmed
                    if (studentDetails[s].insti[i].bIds[b].confirmed == 0) {
                    }
                  }
                  break;
                }
              }
            }
          })
          .catch((err) => {
            console.log(err);
            res.status(200).json(errorMsg);
          });
        return resolve({
          flag: 1,
          data: {
            insId: "5e44485bc5f9613d060ae74b",
            insNm: "Institute 1",
            pId: "5e444553332ed10b4449459f",
            students: [
              {
                sId: "5e44f183b26a8736acda83fa",
                sNm: "Student 1",
                lstAttended: "23 - Oct - 2019",
                badges: {
                  Maths: "S",
                  Science: "N",
                  SST: "G",
                  Attendance: "B",
                },
                batches: [
                  { bId: "5e444d3f37d6f12430533cf9", nm: "Batch 1 - Maths" },
                  { bId: "5e444d3f37d6f12430533cf9", nm: "Batch 1 - Maths" },
                ],
                attendance: 70,
                notifCnt: 21,
                nextCls: "Science",
                fee: {
                  lstDt: "01 - Sep - 2019",
                  lstMethod: "PayTm",
                  dueDt: "01 - Oct - 2019",
                  dueMethod: "PayTm/Cash/Other",
                },
                result: {
                  Maths: 80,
                  Science: 40,
                  SST: 95,
                  Attendance: 70,
                },
                graph1: {
                  Maths: [80, 100, "26 - Oct - 2010"],
                  Science: [40, 100, "26 - Oct - 2019"],
                  SST: [95, 95, "26 - Oct - 2019"],
                },
                graph2: {
                  Maths: [
                    { "20 - Oct - 2019": 90 },
                    { "24 - Oct - 2019": 70 },
                    { "26 - Oct - 2019": 80 },
                  ],
                  Science: [
                    { "10 - Oct - 2019": 30 },
                    { "15 - Oct - 2019": 60 },
                    { "20 - Oct - 2019": 50 },
                    { "25 - Oct - 2019": 20 },
                    { "30 - Oct - 2019": 40 },
                  ],
                  SST: [
                    { "10 - Oct - 2019": 90 },
                    { "15 - Oct - 2019": 93 },
                    { "20 - Oct - 2019": 97 },
                    { "25 - Oct - 2019": 100 },
                    { "30 - Oct - 2019": 95 },
                  ],
                },
              },
              {
                sId: "5e44f183b26a8736acda83fa",
                sNm: "Student 1",
                lstAttended: "23 - Oct - 2019",
                badges: {
                  Maths: "S",
                  Science: "N",
                  SST: "G",
                  Attendance: "B",
                },
                batches: [
                  { bId: "5e444d3f37d6f12430533cf9", nm: "Batch 1 - Maths" },
                  { bId: "5e444d3f37d6f12430533cf9", nm: "Batch 1 - Maths" },
                ],
                attendance: 70,
                notifCnt: 21,
                nextCls: "Science",
                fee: {
                  lstDt: "01 - Sep - 2019",
                  lstMethod: "PayTm",
                  dueDt: "01 - Oct - 2019",
                  dueMethod: "PayTm/Cash/Other",
                },
                result: {
                  Maths: 80,
                  Science: 40,
                  SST: 95,
                  Attendance: 70,
                },
                graph1: {
                  Maths: [80, 100, "26 - Oct - 2010"],
                  Science: [40, 100, "26 - Oct - 2019"],
                  SST: [95, 95, "26 - Oct - 2019"],
                },
                graph2: {
                  Maths: [
                    { "20 - Oct - 2019": 90 },
                    { "24 - Oct - 2019": 70 },
                    { "26 - Oct - 2019": 80 },
                  ],
                  Science: [
                    { "10 - Oct - 2019": 30 },
                    { "15 - Oct - 2019": 60 },
                    { "20 - Oct - 2019": 50 },
                    { "25 - Oct - 2019": 20 },
                    { "30 - Oct - 2019": 40 },
                  ],
                  SST: [
                    { "10 - Oct - 2019": 90 },
                    { "15 - Oct - 2019": 93 },
                    { "20 - Oct - 2019": 97 },
                    { "25 - Oct - 2019": 100 },
                    { "30 - Oct - 2019": 95 },
                  ],
                },
              },
            ],
          },
          pId: parentDetails._id,
        });
      }
    });
  } catch (err) {
    console.log(err);
  }
};

//Function will be used to fetch the dasboard data of parents
//and send the same to him
const GetStudentDashboardData = (studentDetails) => {
  try {
    return new Promise((resolve, reject) => {
      return resolve({
        flag: 1,
        sId: studentDetails._id,
        data: {},
      });
    });
  } catch (err) {
    console.log(err);
  }
};
//Function will be used to fetch the dasboard data of admin
//and send the same to him
const GetAdminDashboardData = (adminDetails, insId = "-1") => {
  try {
    return new Promise((resolve, reject) => {
      return resolve({
        flag: 1,
        aId: adminDetails._id,
        data: {
          insId: "5e44485bc5f9613d060ae74b",
          insNm: "Institute 1",
          aId: "5e4445dac5f9613d060ae714",
          aNm: "Admin 1",
          feeCenter: {
            week: [20000, 22000, 10],
            month: [80000, 88000, 10],
            quarter: [240000, 264000, 10],
          },
          studentCenter: {
            week: [10, 11, 10],
            month: [40, 44, 10],
            quarter: [120, 132, 10],
          },
          fee: {
            submit: 20,
            due: 10,
            input: 5,
          },
          pendingActions: 10,
          revenue: [80000, 70000, 90000, 70000, 90000],
        },
      });
    });
  } catch (err) {
    console.log(err);
  }
};

//Function will be used to fetch the dasboard data of teacher
//and send the same to him
const GetTeacherDashboardData = (teacherDetails, insId = "-1") => {
  try {
    return new Promise((resolve, reject) => {
      return resolve({
        flag: 1,
        tId: teacherDetails._id,
        data: {
          insId: "5e44485bc5f9613d060ae74b",
          insNm: "Institute 1",
          tId: "5e444a5937d6f12430533cf5",
          tNm: "Teacher 1",
          stdntCnt: 190,
          verficationRqsts: 43,
          msgFrmPrnt: 1,
          graph1: [
            {
              year: 2019,
              data: [-1, -1, -1, 130, 120, 160, 160, 160, 170, 180, 190],
            },
            {
              year: 2020,
              data: [80, 100, 120, 130, 120, 160, 160, 160, 170, 180, 190],
            },
          ],
        },
      });
    });
  } catch (err) {
    console.log(err);
  }
};

const GenerateRegistrationOTP = (userDetails) => {
  try {
    return new Promise((resolve, reject) => {
      //Generate OTP and send the same to user.
      //Also store the intermediate details in the db,
      //so that after receiving the otp, we can verify it and proceed with storing the same.
      GenerateOTP().then((OTP) => {
        const userOTP = new UserOTPSchema({
          cNo: userDetails.cNo,
          email: userDetails.email,
          pwd: userDetails.pwd,
          otp: OTP,
          nm: userDetails.nm,
          addrs: userDetails.addrs,
          role: userDetails.role,
          dt: Math.trunc(Date.now() / 1000),
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(userOTP.pwd, salt, (err, hash) => {
            if (err) throw err;
            else {
              userOTP.pwd = hash;
              //Now save the user otp detials in Database
              userOTP
                .save()
                .then((userOTP) => {
                  //Mail OTP details to user.
                  SendMail(
                    userOTP.email,
                    registrationOtpSub,
                    registrationOtpBody.replace("#OTPValue", userOTP.otp)
                  )
                    .then((response) => {
                      return resolve({
                        flag: 1,
                        id: userOTP._id,
                        msg: "OTP send successfully",
                      });
                    })
                    .catch((err) => {
                      console.log(err);
                      return reject(errorMsg);
                    });
                })
                .catch((err) => {
                  console.log(err);
                  return reject(errorMsg);
                });
            }
          });
        });
      });
    });
  } catch (err) {
    console.log(err);
  }
};

//The function will accept the user that has hit login
//and rolelogin APIs adn will send the appropriate response
const SendParentLoginResponse = (user) => {
  //Check for multiple institutes for parents.
  //In case parents have multiple institutes.
  //Ask him to select one institute
  //In case of one institute, we will send him dashboard data
  return new Promise((resolve, reject) => {
    Student.find({ pId: user._id })
      .populate("insti.insId", "nm")
      .then((details) => {
        let insti = [];
        //The logic will check for multiple institutes in the parent.
        for (let i = 0; i < details.length; i++) {
          for (let j = 0; j < details[i].insti.length; j++) {
            let addInsti = true;
            //console.log(details[i].insti[j]);
            for (let k = 0; k < insti.length; k++) {
              if (details[i].insti[j].insId._id == insti[k]._id)
                addInsti = false;
            }
            if (addInsti) insti.push(details[i].insti[j].insId);
          }
        }

        //End of logic
        if (insti.length > 1) {
          return resolve({
            flag: 1,
            ins: insti,
            pId: user._id,
          });
        } else if (insti.length == 0) {
          //If no insti is associated with parents
          //then it means he has not added students in the system.
          //Take him to add students page on the app side.
          return resolve({
            flag: 1,
            data: {},
            pId: user._id,
          });
        } else {
          return resolve({
            flag: 1,
            pId: user._id,
            data: insti[0]._id,
          });
        }
      })
      .catch((err) => {
        console.log(err);
        return reject(errorMsg);
      });
  });
};

//The function will accept the user that has hit login
//and rolelogin APIs adn will send the appropriate response
const SendTeacherLoginResponse = (user) => {
  //First check whether the teacher is associated with any
  //institute in our system.
  //If no, redirect teacher to page in app to associate with institute
  //If yes, check for multiple institute. If yes, ask them to select one insti
  //If no, we can\ send him the signal to hit dahboard data API.
  return new Promise((resolve, reject) => {
    Teacher.findOne({ tId: user._id })
      .populate("insti.insId", "nm")
      .then((teacherDetails) => {
        if (teacherDetails) {
          //check for multiple institutes.
          let insti = [];
          //The logic will check for multiple institutes in the parent.
          for (let j = 0; j < teacherDetails.insti.length; j++) {
            let addInsti = true;
            for (let k = 0; k < insti.length; k++) {
              if (teacherDetails.insti[j].insId._id == insti[k]._id)
                addInsti = false;
            }
            if (addInsti) insti.push(teacherDetails.insti[j].insId);
          }

          if (insti.length > 1) {
            return resolve({
              flag: 1,
              ins: insti,
              tId: user._id,
            });
          } else {
            return resolve({
              flag: 1,
              data: insti[0]._id,
              tId: user._id,
            });
          }
        } else {
          return resolve({
            flag: 1,
            data: {},
            tId: user._id,
          });
        }
      })
      .catch((err) => {
        console.log(err);
        return reject(errorMsg);
      });
  });
};

//The function will accept the user that has hit login
//and rolelogin APIs adn will send the appropriate response
const SendStudentLoginResponse = (user) => {
  //First check whether the student is associated with any
  //institute in our system.
  //If no, redirect student to page in app to associate with institute
  //If yes, check for multiple institute. If yes, ask them to select one insti
  //If no, we can\ send him the signal to hit dahboard data API.
  return new Promise((resolve, reject) => {
    Student.findOne({ sId: user._id })
      .populate("insti.insId", "nm")
      .then((studentDetails) => {
        if (studentDetails) {
          //check for multiple institutes.
          let insti = [];
          //The logic will check for multiple institutes in the parent.
          for (let j = 0; j < studentDetails.insti.length; j++) {
            let addInsti = true;
            for (let k = 0; k < insti.length; k++) {
              if (studentDetails.insti[j].insId._id == insti[k]._id)
                addInsti = false;
            }
            if (addInsti) insti.push(studentDetails.insti[j].insId);
          }

          if (insti.length > 1) {
            return resolve({
              flag: 1,
              ins: insti,
              sId: user._id,
            });
          } else {
            return resolve({
              flag: 1,
              data: insti[0]._id,
              sId: user._id,
            });
          }
        } else {
          return resolve({
            flag: 1,
            data: {},
            sId: user._id,
          });
        }
      })
      .catch((err) => {
        console.log(err);
        return reject(errorMsg);
      });
  });
};

//The function will accept the user that has hit login
//and rolelogin APIs and will send the appropriate response
const SendAdminLoginResponse = (user) => {
  return new Promise((resolve, reject) => {
    //First check whether the admin is associated with any
    //institute in our system.
    //If no, ask him to add institute in the system by contacting our support guy.
    //If yes, check for multiple institute. If yes, ask them to select one insti
    //If no, we can send him the signal to hit dahboard data API.
    Admin.findOne({ aId: user._id })
      .populate("insti", "nm")
      .then((adminDetails) => {
        if (adminDetails) {
          //check for multiple institutes.
          if (adminDetails.insti.length > 1) {
            return resolve({
              flag: 1,
              ins: adminDetails.insti,
              aId: user._id,
            });
          } else {
            return resolve({
              flag: 1,
              data: adminDetails.insti[0]._id,
              aId: user._id,
            });
          }
        } else {
          return resolve({
            flag: 1,
            data: {},
            aId: user._id,
          });
        }
      })
      .catch((err) => {
        console.log(err);
        return reject(errorMsg);
      });
  });
};

module.exports = router;
