const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const Student = require("../../models/Student");
const ApproveStudents = require("../../models/ApproveStudents");
const ValidateStudentFees = require("../../models/ValidateStudentFees");
const StudentWiseAttendance = require("../../models/StudentWiseAttendance");
const Batch = require("../../models/Batch");
const { GenerateRandomPwd, SendMail } = require("../../common/Common");
const { isEmpty } = require("../../validations/is-empty");
const fees = require("../../common/Fees");
const {
  accountCreatedSub,
  accountCreatedBody,
} = require("../../common/EmailTemplate");

//The API will be used to add student details in the system.
//Will send the dashboard data to the stakeholders.
//Also we will be sending the registration details to student email Id
//along with there user id and password so that they can also login in
//our system
router.post("/addstudent", (req, res) => {
  //Check the student with the same number exist in our database or not.
  //If no, allow parent to add the same. Else, tell him that the student
  //already exist.
  User.findOne({ cNo: req.body.cNo }).then((student) => {
    if (student) {
      res.status(400).json({
        flag: 0,
        msg:
          "Student is already registered in our system. Request you to check contact number.",
      });
    } else {
      //Add student details in user collection with basic details like
      //name, cNo, email, addrs, pwd, role
      GenerateRandomPwd().then((pwd) => {
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(pwd, salt, (err, hash) => {
            const user = new User({
              nm: req.body.nm,
              cNo: req.body.cNo,
              email: req.body.email,
              addrs: req.body.addrs,
              role: ["S"],
              pwd: hash,
            });
            //Save this student in our database and on success, send te password to student,
            //informing him of his account creation.
            user.save().then((user) => {
              //We need to store parent student mapping, student mapping with Insti and batches
              //in our system.
              const student = new Student({
                sId: user._id,
                pId: req.body.pId,
                clsId: req.body.clsId,
                sch: req.body.schId,
                joinDt: req.body.joinDt,
                insti: JSON.parse(req.body.insti),
              });

              student
                .save()
                .then((student) => {
                  //Send parent the dashboard data
                  res.status(200).json({
                    flag: 1,
                    msg:
                      "Student data added successfully. Please wait for teacher to confirm the same.",
                  });
                })
                .catch((err) => {
                  console.log(err);
                  res.status(400).json(errorMsg);
                });

              //The below logic was return to enter the students that are not confirmed
              //in the database, so that teacher can fetch the same in one go -- start
              let institute = JSON.parse(req.body.insti);
              for (let i = 0; i < institute.length; i++) {
                for (let b = 0; b < institute[i].bIds.length; b++) {
                  let approveStudents = new ApproveStudents({
                    sId: user._id,
                    pId: req.body.pId,
                    insId: institute[i].insId,
                    bId: institute[i].bIds[b].bId,
                    dt: Math.trunc(Date.now() / 1000),
                  });

                  approveStudents.save().catch((err) => {
                    console.log(err);
                  });
                }
              }
              //The below logic was return to enter the students that are not confirmed
              //in the database, so that teacher can fetch the same in one go -- end

              //Send the mail to the student informing him that his account is created and that he can login
              //to the account
              // SendMail(
              //   user.email,
              //   accountCreatedSub,
              //   accountCreatedBody
              //     .replace("#UserId", user.cNo)
              //     .replace("#UserPassword", pwd)
              // );

              //Send the notification to teacher, telling her that student as been added by a parent.
              //Confirm the same.
            });
          });
        });
      });
    }
  });
});

//The API will be used by parent to feed in the fee details he has paid
//for the student
router.post("/feepaid", (req, res) => {
  let {
    sId,
    pId,
    insId,
    bId,
    fee,
    discount,
    scholarship,
    fine,
    totalfee,
    dueDt,
    paidDt,
    paidMethod,
    txnId,
    epochDueDt,
  } = req.body;

  let isPaid = false;
  let validateFees = new ValidateStudentFees({
    sId,
    pId,
    insId,
    bId,
    fee,
    discount,
    scholarship,
    fine,
    totalFee: Number(totalfee),
    dueDt,
    epochDueDt,
    paidDt,
    paidMethod,
    isPaid,
    txnId,
  });

  validateFees
    .save()
    .then((feeDetails) => {
      res.status(200).json({
        falg: 1,
        msg:
          "Fees submit details saved successfully. Waiting for Teacher to verify the same.",
      });
    })
    .catch((err) => {
      res.status(400).json(errorMsg);
    });

  //Store the fee paid dt in the fees hash we have.
  fees.ChangeStudentFeePaidDt(sId, insId, bId, paidDt, epochDueDt);
});

//The API will be used to send the upcoming 3 classes of student
//batch wise
router.post("/upcomingclass", (req, res) => {
  let { sId, insId } = req.body;
  let arrbatchTimingObj = [];
  let arrBIds = [];

  Student.findOne({ sId: sId })
    .then((sDetails) => {
      for (let i = 0; i < sDetails.insti.length; i++) {
        if (sDetails.insti[i].insId == insId) {
          for (let b = 0; b < sDetails.insti[i].bIds.length; b++) {
            arrBIds.push(sDetails.insti[i].bIds[b].bId);
          }
        }
        break;
      }

      Batch.find(
        { _id: { $in: arrBIds } },
        "nm timings sub extraCls updatedDt updatedTimings -_id"
      ).then((batches) => {
        for (let b = 0; b < batches.length; b++) {
          let batchTimingObj = {};
          batchTimingObj["nm"] =
            batches[b].nm + " - " + batches[b].sub.join(",");
          //Check for parameters updated class params
          let arrTimings = [];
          let extraCls = String(batches[b].extraCls);

          //First ceck do teacher have reschedule any class for future.
          //If yes we will check if it is a extraCls or reschedule class.

          if (batches[b].updatedDt > Math.trunc(new Date().getTime() / 1000)) {
            let objTiming = {};
            let updatedDt = new Date(0);
            updatedDt.setSeconds(batches[b].updatedDt);
            let month = updatedDt.getMonth() + 1;

            objTiming["t"] = batches[b].updatedTimings;
            objTiming["d"] = GetDay(updatedDt.getDay());
            objTiming["dt"] =
              updatedDt.getDate() + "-" + month + "-" + updatedDt.getFullYear();
            arrTimings.push(objTiming);
          }

          //The dayIndex will let us know, how many days I need to add in the present date,
          //to get the correct date.
          let dayIndex = 0;
          //Get index of date today
          for (let t = new Date().getDay(); t < 7; t++) {
            let newDt = new Date();
            newDt.setDate(newDt.getDate() + dayIndex);
            let day = newDt.getDate();
            let month = newDt.getMonth() + 1;
            let year = newDt.getFullYear();

            if (batches[b].timings[t] != "-1") {
              if (String(extraCls) == "true") {
                extraCls = "false";
                dayIndex += 1;
                continue;
              }
              let objTiming = {};
              objTiming["t"] = batches[b].timings[t];
              objTiming["d"] = GetDay(t);
              objTiming["dt"] = day + "-" + month + "-" + year;
              arrTimings.push(objTiming);
              //We are sharing 3 future classes, if length is 3 get out of the loop
              if (arrTimings.length == 3) break;
            }

            dayIndex += 1;
          }

          //If three classes have not been recorded, got to next week to get the class.
          if (arrTimings.length < 3) {
            for (let t = 0; t < 7; t++) {
              let newDt = new Date();
              newDt.setDate(newDt.getDate() + dayIndex);
              let day = newDt.getDate();
              let month = newDt.getMonth() + 1;
              let year = newDt.getFullYear();

              if (batches[b].timings[t] != "-1") {
                if (String(extraCls) == "true") {
                  extraCls = "false";
                  dayIndex += 1;
                  continue;
                }
                let objTiming = {};
                objTiming["t"] = batches[b].timings[t];
                objTiming["d"] = GetDay(t);
                objTiming["dt"] = day + "-" + month + "-" + year;
                arrTimings.push(objTiming);
                //We are sharing 3 future classes, if length is 3 get out of the loop
                if (arrTimings.length == 3) break;
              }

              dayIndex += 1;
            }
          }

          batchTimingObj["nm"] =
            batches[b].nm + " - " + batches[b].sub.join(",");
          batchTimingObj["timings"] = arrTimings;
          arrbatchTimingObj.push(batchTimingObj);
        }

        res.status(200).json({
          flag: 1,
          data: arrbatchTimingObj,
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will get the attendance information of the student
router.post("/attendance", (req, res) => {
  let { epochFromDt, epochToDt, sId, bId, insId } = req.body;

  //Check both dates are falling in same year or not
  let fromDt = new Date(epochFromDt * 1000);
  let toDt = new Date(epochToDt * 1000);
  let arrAttendance = [];
  //If fromDt and toDt falls in same year
  if (fromDt.getFullYear() == toDt.getFullYear()) {
    //Query only one collection
    StudentWiseAttendance.findOne({
      sId: sId,
      insId: insId,
      year: Number(fromDt.getFullYear()),
    }).then((response) => {
      for (let b = 0; b < response.bIds.length; b++) {
        if (bId == response.bIds[b].bId) {
          //loop through the response and store the attendance info
          while (fromDt <= toDt) {
            //check month of fromDate
            let m = fromDt.getMonth();
            let d = fromDt.getDate() - 1;
            if (typeof response.bIds[b].month[m].day[d] != "undefined") {
              arrAttendance.push(response.bIds[b].month[m].day[d]);
            } else {
              arrAttendance.push(-1);
            }
            fromDt.setDate(fromDt.getDate() + 1);
          }
          res.status(200).json({
            flag: 1,
            data: arrAttendance,
          });
          break;
        }
      }
    });
  } else {
    //Query two collections based on year.
  }
});

//The API will used to fetch the transaction details of the parent
router.post("/feetxndetails", (req, res) => {});

//The API will be used by parent to fetch due fees details of
//student.
router.post("/getduefees", (req, res) => {
  let { sId, insId } = req.body;
  fees.FetchStudentWiseDueFees(sId, insId).then((data) => {
    res.status(200).json({
      flag: 1,
      data: data,
    });
  });
});

const GetDay = (dayIndex) => {
  switch (dayIndex) {
    case 0:
      return "Sunday";
      break;
    case 1:
      return "Monday";
      break;
    case 2:
      return "Tuesday";
      break;
    case 3:
      return "Wednesday";
      break;
    case 4:
      return "Thrusday";
      break;
    case 5:
      return "Friday";
      break;
    case 6:
      return "Saturday";
      break;
  }
};

module.exports = router;
