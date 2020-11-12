const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");

const { errorMsg } = require("../../config/keys");
const { SendMail, GetCurrentDate } = require("../../common/Common");
const { PublishData } = require("../../common/RedisLayer");

const Batch = require("../../models/Batch");
const Teacher = require("../../models/Teacher");
const Student = require("../../models/Student");
const User = require("../../models/User");
const ApproveStudents = require("../../models/ApproveStudents");
const StudentWiseAttendance = require("../../models/StudentWiseAttendance");
const StudentWiseTest = require("../../models/StudentWiseTest");
const BatchWiseAttendance = require("../../models/BatchWiseAttendance");
const TeacherWiseAttendance = require("../../models/TeacherWiseAttendance");
const BatchWiseSyllabus = require("../../models/BatchWiseSyllabus");
const BatchWiseTest = require("../../models/BatchWiseTest");
const BatchActivityTracker = require("../../models/BatchActivityTracker");
const BatchWiseContent = require("../../models/BatchWiseContent");
const TeacherActivityTracker = require("../../models/TeacherActivityTracker");
const InputStudentFees = require("../../models/InputStudentFees");
const UpdatedBatchTimings = require("../../models/UpdatedBatchTimings");
const BatchWiseMessage = require("../../models/BatchWiseMessage");
const LiveSession = require("../../models/LiveSession");
const LastAttendedClass = require("../../models/LastAttendedClass");
const fcm = require("../../common/Fcm");
const redis = require("../../common/RedisLayer");
const {
  RedisKeyTeacherVerifyStudent,
  RedisKeyStudentParentMapping,
} = require("../../config/keys");
const {
  studentAddedToBatchSub,
  studentAddedToBatchBody,
  studentRejectedByTeacherSub,
  studentRejectedByTeacherBody,
} = require("../../common/EmailTemplate");

//Map with key student Id and value will be its attendance data for that year
var mapStudentAttendanceDetails = {};

var mapStudentTestDetails = {};

//The API will be used by teacher to add associated insti details
//in my application
router.post("/addinsti", (req, res) => {
  let teacher = new Teacher({
    tId: req.body.tId,
    insti: JSON.parse(req.body.insti),
  });

  teacher
    .save()
    .then((teacher) => {
      res.status(200).json({
        flag: 1,
        msg: "Institute details saved successfully",
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });

  //We need to associate the teacher details with the Batches of the institutes.
});

//The API will be used by teacher and will send the associated batches to teacher
//in an institute
router.post("/mybatch", (req, res) => {
  let teacherBatchesProjection = {
    __v: false,
    _id: false,
    cDt: false,
    mDt: false,
    tId: false,
    "insti.insId": false,
    "insti.joinDt": false,
    "insti._id": false,
    "insti.bIds._id": false,
    "insti.bIds.joinBatchDt": false,
  };
  let { tId, insId } = req.body;
  Teacher.findOne({ tId: tId, "insti.insId": insId }, teacherBatchesProjection)
    .populate("insti.bIds.bId", "nm sub timings")
    .then((teacherBatches) => {
      let data = [];
      let arrBatchIds = [];
      for (let b = 0; b < teacherBatches.insti[0].bIds.length; b++) {
        let batch = {};
        batch.id = teacherBatches.insti[0].bIds[b].bId._id;
        batch.nm =
          teacherBatches.insti[0].bIds[b].bId.nm +
          " - " +
          teacherBatches.insti[0].bIds[b].bId.sub.join(", ");

        batch.timings = teacherBatches.insti[0].bIds[b].bId.timings;
        batch.a = 0;
        arrBatchIds.push(batch.id);
        data.push(batch);
      }

      //Check teacher has submitted attendance for the day or not.
      let dt = new Date();
      let zoneOffset = dt.getTimezoneOffset();
      // dt = new Date(dt.getTime() + (zoneOffset + 330) * 60 * 1000);

      TeacherWiseAttendance.find({
        insId: insId,
        tId: tId,
        bId: { $in: arrBatchIds },
        year: dt.getFullYear(),
        month: dt.getMonth() + 1,
        day: dt.getDate(),
      }).then((teacherAttendanceDetails) => {
        //If teacher attendance is present for the day for the batch,
        //mark it as 1
        for (let t = 0; t < teacherAttendanceDetails.length; t++) {
          for (let d = 0; d < data.length; d++) {
            if (String(teacherAttendanceDetails[t].bId) == String(data[d].id)) {
              console.log("Here");
              data[d].a = 1;
              break;
            }
          }
        }
        res.status(200).json({
          flag: 1,
          data,
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be used by teacher to mark attendance of student
//in a batch of particular institute.
//This is one of the API that will do the below steps:
//1. It will log the student attendance information in a batch.
//2. It will also log the Batch meta data information in BatchWiseAttendance.
//3. It will inform admin via notification, if teacher manually updates the timings
//4. It will log teacher attendance information in TeacherWiseAttendance collection
router.post("/attendance", (req, res) => {
  let insId = req.body.insId;
  let year = req.body.year;
  let month = req.body.month - 1;
  let day = req.body.day - 1;
  let bId = req.body.bId;
  let tId = req.body.tId;
  let timings = req.body.timings;
  let updatedTimings = req.body.updatedTimings;
  let tNm = req.body.tNm;
  let students = JSON.parse(req.body.students);

  //I am building array of student Ids here
  //to query studentwiseattendance collection for all students
  //in a one go and will be using these details to update attendance info
  let arrStudentIds = [];
  students.map((s) => {
    if (typeof mapStudentAttendanceDetails[s.sId] == "undefined")
      arrStudentIds.push(s.sId);
  });

  //1. Feeds the student information in the database and maintain state in the local machine --start
  //Log student attendance here
  StudentWiseAttendance.find({
    insId: insId,
    year: year,
    sId: { $in: arrStudentIds },
  })
    .populate("sId", "nm -_id")
    .populate("insId", "nm -_id")
    .then((studentAttendanceDetails) => {
      if (studentAttendanceDetails.length > 0)
        //Creating the map here
        studentAttendanceDetails.map(
          (s) => (mapStudentAttendanceDetails[s.sId] = s)
        );

      let bulk = StudentWiseAttendance.collection.initializeUnorderedBulkOp();
      let bulkLastAttendedClass = LastAttendedClass.collection.initializeUnorderedBulkOp();
      let executeBulk = false;
      for (let s = 0; s < students.length; s++) {
        //No attendance entry for institute, year exist for this student.
        //So we need to add. This is the new student
        if (
          typeof mapStudentAttendanceDetails[students[s].sId] == "undefined"
        ) {
          let arrMonth = [];
          let arrDay = [];
          while (arrDay.length < day) {
            arrDay.push(-1);
          }
          arrDay[day] = students[s].a;
          while (arrMonth.length < month) {
            arrMonth.push({});
          }
          arrMonth[month] = { count: 1, day: arrDay };
          bulk.insert({
            sId: mongoose.Types.ObjectId(students[s].sId),
            insId: mongoose.Types.ObjectId(insId),
            year: Number(year),
            bIds: [{ bId: mongoose.Types.ObjectId(bId), month: arrMonth }],
          });
          executeBulk = true;
        } else {
          //If the Student attendance information exist for insId, year, then we need to update the information.
          //Update cases
          //1. It is for different day in existing batch.
          //2. It is for different month in existing batch
          //3. It is for altogether different batch
          //Check whether the attendance info is for existing batch
          //or new batch
          let batchIdFound = false;
          for (
            let b = 0;
            b < mapStudentAttendanceDetails[students[s].sId].bIds.length;
            b++
          ) {
            //When the  batch exist in the system.
            if (
              bId == mapStudentAttendanceDetails[students[s].sId].bIds[b].bId
            ) {
              //Suggests attendance information for new month
              if (
                typeof mapStudentAttendanceDetails[students[s].sId].bIds[b]
                  .month[month] == "undefined"
              ) {
                let arrDay = [];
                while (arrDay.length < day) {
                  arrDay.push(-1);
                }
                arrDay[day] = students[s].a;
                while (
                  mapStudentAttendanceDetails[students[s].sId].bIds[b].month
                    .length < month
                ) {
                  mapStudentAttendanceDetails[students[s].sId].bIds[
                    b
                  ].month.push({});
                }
                mapStudentAttendanceDetails[students[s].sId].bIds[b].month[
                  month
                ] = {
                  count: 1,
                  day: arrDay,
                };
              }
              //Entry for same month
              else {
                mapStudentAttendanceDetails[students[s].sId].bIds[b].month[
                  month
                ].count += 1;
                while (
                  mapStudentAttendanceDetails[students[s].sId].bIds[b].month[
                    month
                  ].day.length < day
                ) {
                  mapStudentAttendanceDetails[students[s].sId].bIds[b].month[
                    month
                  ].day.push(-1);
                }
                mapStudentAttendanceDetails[students[s].sId].bIds[b].month[
                  month
                ].day[day] = students[s].a;
              }
              batchIdFound = true;
              break;
            }
          }

          //If new batch occurs for the student.
          if (!batchIdFound) {
            //This means that this is a new batch for the existing student
            let objbId = {};
            let arrMonth = [];
            let arrDay = [];
            while (arrDay.length < day) {
              arrDay.push(-1);
            }
            arrDay[day] = students[s].a;
            while (arrMonth.length < month) arrMonth.push({});
            arrMonth[month] = { count: 1, day: arrDay };
            objbId.bId = bId;
            objbId.month = arrMonth;
            mapStudentAttendanceDetails[students[s].sId].bIds.push(objbId);
          }

          bulk
            .find({
              sId: mongoose.Types.ObjectId(students[s].sId),
              insId: mongoose.Types.ObjectId(insId),
              year: Number(year),
            })
            .updateOne({
              $set: { bIds: mapStudentAttendanceDetails[students[s].sId].bIds },
            });
          executeBulk = true;
        }

        //Record the last attended class of the student
        if (students[s].a == 1) {
          GetCurrentDate().then((dt) => {
            bulkLastAttendedClass.insert({
              insId: insId,
              sId: students[s].sId,
              bId: bId,
              classDt: Math.trunc(dt.getTime() / 1000),
            });
          });
        }

        //Send notification to parent informing him about his student.
        redis.HashSetFieldExistOrNot(
          "redisClient6001",
          RedisKeyStudentParentMapping,
          String(students[s].sId),
          function (exist) {
            if (exist) {
              //Get the parent Id
              redis.FetchHashSetFields("redisClient6001"),
                RedisKeyStudentParentMapping,
                String(students[s].sId),
                function (pId) {
                  if (students[s].a == 1) {
                    //Present Notification
                    fcm.sendNotification(
                      String(JSON.parse(pId)),
                      "Present in Class",
                      mapStudentAttendanceDetails[students[s].sId].sId.nm +
                        " is attending class in " +
                        mapStudentAttendanceDetails[students[s].sId].insId.nm +
                        " at " +
                        timings,
                      "N0013"
                    );
                  } else {
                    //Absent Notification
                    fcm.sendNotification(
                      String(JSON.parse(pId)),
                      "Absent in Class",
                      mapStudentAttendanceDetails[students[s].sId].sId.nm +
                        " is absent for class in " +
                        mapStudentAttendanceDetails[students[s].sId].insId.nm +
                        " at " +
                        timings,
                      "N0014"
                    );
                  }
                };
            }
          }
        );
      }

      if (executeBulk) {
        bulk
          .execute()
          .then((response) => {
            res.status(200).json({
              flag: 1,
              msg: "Attendance details submitted successfully",
            });
          })
          .catch((err) => {
            console.log(err);
            res.status(200).json(errorMsg);
          });
      }

      LastAttendedClass.deleteMany({
        insId: insId,
        sId: { $in: arrStudentIds },
      }).then((response) => {
        bulkLastAttendedClass.execute().catch((err) => {
          console.log(err);
        });
      });

      //1. Feeds the student information in the database and maintain state in the local machine --end

      //2. Feeds the batch specific information in the database -- start

      //Update the batch timings to keep  track of daily timings and
      //which teacher has conducted it
      //This is done to setup the batch data of the institute.
      BatchWiseAttendance.findOne({ insId: insId, bId: bId, year: year })
        .then((batchWiseDetails) => {
          //The statement checks whether batchwiseattendance schema is setup
          if (batchWiseDetails) {
            let batchWiseAttendance = [];
            batchWiseAttendance = batchWiseDetails.month;

            //If yes, we are checking whether this attendance info is for
            //new month of a particular year.
            if (batchWiseAttendance.length <= month) {
              //If yes create empty DS for the batch months to update it
              //later on
              while (batchWiseAttendance.length < month) {
                batchWiseAttendance.push({});
              }
              batchWiseAttendance[month] = {
                day: [],
                tIds: [],
                timings: [],
                sIds: [],
                max: -1,
                min: -1,
                avg: -1,
                count: -1,
              };
            }

            //If the current day is greater than the day present in database
            //we will add default values for the day in between.
            while (batchWiseAttendance[month].day.length < day) {
              batchWiseAttendance[month].day.push(-1);
              batchWiseAttendance[month].timings.push("-1");
              batchWiseAttendance[month].tIds.push(undefined);
              batchWiseAttendance[month].sIds.push([]);
            }

            batchWiseAttendance[month].day.push(1);
            batchWiseAttendance[month].tIds.push(tId);
            batchWiseAttendance[month].timings.push(timings);
            batchWiseAttendance[month].sIds.push(students);

            //Update the batch atttendance details
            BatchWiseAttendance.findOneAndUpdate(
              { insId: insId, bId: bId, year: year },
              { $set: { month: batchWiseAttendance } }
            )
              .then((response) => {})
              .catch((err) => {
                console.log(err);
              });
          } else {
            //Means no entry for the batch exists, we need to enter the new details
            //Then we will create the default schema and save it in database.
            let arrMonth = [];
            let arrDay = [];
            let arrTid = [];
            let arrTimings = [];
            let arrsIds = [];
            while (arrMonth.length < month) arrMonth.push({});
            while (arrDay.length < day) {
              arrDay.push(-1);
              arrTid.push(undefined);
              arrTimings.push("-1");
              arrsIds.push([]);
            }
            arrDay.push(1);
            arrTid.push(tId);
            arrTimings.push(timings);
            arrsIds.push(students);

            arrMonth[month] = {
              day: arrDay,
              tIds: arrTid,
              sIds: arrsIds,
              timings: arrTimings,
              max: -1,
              min: -1,
              avg: -1,
              count: -1,
            };

            const batchWiseAttendance = new BatchWiseAttendance({
              bId: bId,
              insId: insId,
              year: year,
              month: arrMonth,
            });

            batchWiseAttendance.save().catch((err) => {
              console.log(err);
            });
          }
        })
        .catch((err) => {
          console.log(err);
        });
      BatchWiseAttendance.findOneAndUpdate(
        { insId: insId, bId: bId, year: year },
        {
          $push: {},
        }
      )
        .then((res) => {})
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });

  //2. Feed the batch specific information in database -- end

  //3. If Default timings of batch are updated by teacher, we need to inform admin of the same
  //via Notification -- start
  if (updatedTimings) {
    console.log(tNm);
  }
  //4. If Default timings of batch are updated by teacher, we need to inform admin of the same
  //via Notification -- start

  //4. Marks the teacher attendance in the database -- start
  //We are just logging teacher attendance information
  //I can log teacher information from the req body params but I don't know how many
  //students study in that batch at the time of attendance,
  //so need to query the batch to get list of students
  Batch.findOne({ _id: bId })
    .then((batchDetails) => {
      let teacherAttendance = new TeacherWiseAttendance({
        tId,
        insId,
        bId,
        year,
        month: req.body.month,
        day: req.body.day,
        timings,
        totalMins: Math.round(
          (new Date(
            year,
            req.body.month,
            req.body.day,
            timings.split("-")[1].trim().split(":")[0],
            timings.split("-")[1].trim().split(":")[1]
          ).getTime() -
            new Date(
              year,
              req.body.month,
              req.body.day,
              timings.split("-")[0].trim().split(":")[0],
              timings.split("-")[0].trim().split(":")[1]
            ).getTime()) /
            60000
        ),
        studentsInBatch: batchDetails.student.length,
      });
      teacherAttendance.save().catch((err) => {
        console.log(err);
      });
    })
    .catch((err) => {
      console.log(err);
    });
  //4. Marks the teacher attendance in the database -- end
});

//The API will be used by teacher to get the details of the student
//that require teacher approval to get added in the system and access the dashboard.
router.post("/getstudentsforconfirmation", (req, res) => {
  let tId = req.body.tId;
  let insId = req.body.insId;
  let teacherBatchesProjection = {
    __v: false,
    _id: false,
    cDt: false,
    mDt: false,
    tId: false,
    "insti.insId": false,
    "insti.joinDt": false,
    "insti._id": false,
    "insti.bIds.joinBatchDt": false,
    "insti.bIds._id": false,
  };

  //To get the students, we will first get the batches that teacher teaches
  //and then in that batch, we will get the students that require approval.
  Teacher.findOne({ tId: tId, "insti.insId": insId }, teacherBatchesProjection)
    .then((teacherBatches) => {
      console.log(teacherBatches);
      let batchWiseStudents = [];
      let countCallbacks = 0;
      let approveStudentProjection = {
        dt: false,
        _id: false,
        insId: false,
        __v: false,
      };
      for (let b = 0; b < teacherBatches.insti[0].bIds.length; b++) {
        //Get students that require approval in teacher batches
        ApproveStudents.find(
          {
            insId: insId,
            bId: teacherBatches.insti[0].bIds[b].bId,
          },
          approveStudentProjection
        )
          .populate("sId", "nm cNo email")
          .populate("bId", "sub timings nm ")
          .then((students) => {
            //Now in this we are cooking the data in the format
            //which will be of format like
            //[{batchName -- string, students: [{studentDetailsObj}]}]
            if (students.length > 0) {
              //Students will be an array containing batchDetails and studentDetails
              let arrStudents = [];
              let objBatchStudents = {};
              let batch = {};
              for (let s = 0; s < students.length; s++) {
                arrStudents.push(students[s].sId); //sId conatins the student details object.
              }
              batch.id = students[0].bId._id;
              batch.nm =
                students[0].bId.nm + " - " + students[0].bId.sub.join(", ");
              batch.timings = students[0].bId.timings[new Date().getDay()];
              objBatchStudents.batch = batch;
              objBatchStudents.students = arrStudents;

              batchWiseStudents.push(objBatchStudents);
            }
            countCallbacks++;
            if (countCallbacks == teacherBatches.insti[0].bIds.length)
              res.status(200).json({
                flag: 1,
                data: batchWiseStudents,
              });
          })
          .catch((err) => {
            console.log(err);
            res.status(200).json(errorMsg);
          });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be used to approve students waiting for confirmation to
//join the batch
router.post("/approvestudents", (req, res) => {
  let bId = req.body.bId;
  let insId = req.body.insId;
  let insNm = req.body.insNm;
  let arrStudents = JSON.parse(req.body.students); //arrStudent will contain object and confirmation status.

  let numberOfStudentsExecuted = 0;
  for (let s = 0; s < arrStudents.length; s++) {
    let sId = arrStudents[s].sId;
    let confirmed = arrStudents[s].sts;
    let email = arrStudents[s].email;
    let batchDt = arrStudents[s].batchDt;

    //Update the status in student collection as per the input from teacher
    Student.update(
      {},
      {
        $set: { "insti.$[i].bIds.$[b].confirmed": confirmed },
        $set: { "insti.$[i].bIds.$[b].joinBatchDt": batchDt },
      },
      {
        arrayFilters: [
          { "i.insId": mongoose.Types.ObjectId(insId) },
          { "b.bId": mongoose.Types.ObjectId(bId) },
        ],
        multi: true,
      }
    )
      .then((response) => {
        //Delete from approve students collection as teacher has taken action on it
        ApproveStudents.findOneAndDelete({ sId: sId, insId: insId, bId: bId })
          .populate("sId", "cNo nm ")
          .populate("pId", "cNo email")
          .populate("bId", "nm sub")
          .populate("insId", "admin")
          .then((deleted) => {
            //Send the mail to the student informing him that his account is created and that he can login
            //to the account
            //On confirmation, send the mail to parent and student informing him
            numberOfStudentsExecuted++;
            if (confirmed == 1) {
              SendMail(
                email,
                studentAddedToBatchSub
                  .replace("#Insti", insNm)
                  .replace(
                    "#Batch",
                    deleted.bId.nm + " - " + deleted.bId.sub.join(", ")
                  ),
                studentAddedToBatchBody
                  .replace("#UserId", deleted.sId.cNo)
                  .replace("#Insti", insNm)
                  .replace(
                    "#Batch",
                    deleted.bId.nm + " - " + deleted.bId.sub.join(", ")
                  )
              );

              //When confirmed by teacher, add the students in the batches
              Batch.findOneAndUpdate(
                { _id: deleted.bId._id },
                { $push: { student: mongoose.Types.ObjectId(deleted.sId._id) } }
              ).catch((err) => {
                console.log(err);
              });

              //Enter student in input fees collection schema, so that admin can enter his
              //fees plan for the batch
              let inputStudentFees = new InputStudentFees({
                sId: deleted.sId._id,
                pId: deleted.pId._id,
                insId: insId,
                bId: deleted.bId._id,
                batchJoiningDt: batchDt,
              });

              inputStudentFees.save().catch((err) => {
                console.log(err);
              });

              fcm.sendNotification(
                String(deleted.pId._id),
                "Student Verified",
                "Request to add student in institute, " +
                  insNm +
                  " has been approved ",
                "N0010"
              );

              //Send notification to admin, telling him to input student fees
              fcm.sendNotification(
                String(deleted.insId.admin[0]),
                "Input Student Fees",
                "Student has been added in " +
                  insNm +
                  " in batch, " +
                  deleted.bId.nm +
                  ". Request you to enter student fees plan.",
                "N0012"
              );

              //Send notification to parent informing him about that his student request got approved
            } else if (confirmed == -1) {
              //When confirmed = -1, means teacher has rejected the student,
              //send parent the message that your student has been rejected by parent

              fcm.sendNotification(
                String(deleted.pId._id),
                "Student Rejected",
                "Request to add student in institute, " +
                  insNm +
                  " has been rejected. Request you to contact administrator.",
                "N0011"
              );

              // SendMail(
              //   deleted.pId.email,
              //   studentRejectedByTeacherSub
              //     .replace("#Insti", insNm)
              //     .replace(
              //       "#Batch",
              //       deleted.bId.nm + " - " + deleted.bId.sub.join(", ")
              //     ),
              //   studentRejectedByTeacherBody
              //     .replace("#Student", deleted.sId.nm)
              //     .replace("#Insti", insNm)
              //     .replace(
              //       "#Batch",
              //       deleted.bId.nm + " - " + deleted.bId.sub.join(", ")
              //     )
              // );
            }

            //Decrease the number of approved student by 1
            //Set the number of approve student field for tId in redis
            redis.HashSetFieldExistOrNot(
              "redisClient6001",
              RedisKeyTeacherVerifyStudent,
              String(deleted.tId),
              function (exist) {
                if (exist) {
                  redis.FetchHashSetFields(
                    "redisClient6001",
                    RedisKeyTeacherVerifyStudent,
                    String(deleted.tId),
                    function (noOfStudents) {
                      let newNumberOfStudents =
                        Number(JSON.parse(noOfStudents)) - 1;
                      redis.SetHashSetInRedis(
                        "redisClient6001",
                        RedisKeyTeacherVerifyStudent,
                        String(deleted.tId),
                        String(newNumberOfStudents),
                        function (res) {}
                      );
                    }
                  );
                }
              }
            );
            if (numberOfStudentsExecuted == arrStudents.length) {
              res.status(200).json({
                flag: 1,
                msg:
                  "According to your inputs, necessary actions have been taken.",
              });
            }
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
  }
});

//The API will be used to update the syllabus of the batch.
//Techer can use it to enter chapter name and sub chapter name.
router.post("/syllabus", (req, res) => {
  let chapter = req.body.chapter;
  let topic = req.body.topic;
  let chapterDone = req.body.chptrDone;
  let dt = req.body.dt;
  let tId = req.body.tId;
  let year = req.body.year;
  let bId = req.body.bId;
  let insId = req.body.insId;
  let isTest = req.body.isTest;
  let testMarks = req.body.testMarks;
  let description = req.body.description;

  //While updating the batchwise syllabus, I am first checking whether
  //syllabus exist for batch or not for the particular institute and year.
  //If exist, then I am updating the chapter objects at application level
  //in order to update it to database later.
  BatchWiseSyllabus.findOne({
    bId: mongoose.Types.ObjectId(bId),
    insId: mongoose.Types.ObjectId(insId),
    year: Number(year),
  })
    .then((response) => {
      //Syllabus deatils exist for the batch
      if (response) {
        let chapterExist = false;
        for (let c = 0; c < response.chapters.length; c++) {
          if (chapter == response.chapters[c].nm) {
            //Chapter exist in Database, append the topic to it.
            response.chapters[c].done = chapterDone;
            response.chapters[c].topic.push({
              nm: topic,
              dt: dt,
              description: description,
            });
            chapterExist = true;
            break;
          }
        }
        if (!chapterExist) {
          //Chapter doesn't exist, so we need to append it to chapters array.
          response.chapters.push({
            done: chapterDone,
            topic: { nm: topic, dt: dt, description: description },
            nm: chapter,
          });
        }

        //Updating batch syllabus details
        BatchWiseSyllabus.updateOne(
          { bId: bId, insId: insId, year: year },
          { $set: { chapters: response.chapters } }
        )
          .then((response) => {
            res.status(200).json({
              flag: 1,
              msg: "Syllabus updated successfully",
            });
          })
          .catch((err) => {
            console.log(err);
            res.status(200).json(errorMsg);
          });
      } else {
        //Syllabus details doesn't exist for the batch in particular year
        //So first add them
        let batchWiseSyllabus = new BatchWiseSyllabus({
          bId: bId,
          insId: insId,
          year: year,
          chapters: [
            {
              nm: chapter,
              topic: [{ nm: topic, dt: dt, description: description }],
              done: chapterDone,
            },
          ],
        });
        batchWiseSyllabus
          .save()
          .then((response) => {
            res.status(200).json({
              flag: 1,
              msg: "Activity logged successfully.",
            });
          })
          .catch((err) => {
            console.log(err);
            res.status(200).json(errorMsg);
          });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });

  BatchActivityTracker.findOneAndUpdate(
    { bId: bId, insId: insId, year: year },
    {
      $push: {
        activity: {
          dt: dt,
          topic: chapter,
          subtopic: topic,
          description: description,
          tId: tId,
          chptrDone: chapterDone,
          test: isTest == 1 ? true : false,
        },
      },
    },
    { upsert: true }
  ).catch((err) => {
    console.log(err);
  });

  TeacherActivityTracker.findOneAndUpdate(
    { tId: tId, year: year, dt: dt },
    {
      $push: {
        "activity.bIds": {
          bId: bId,
          topic: chapter,
          subtopic: topic,
          description: description,
        },
      },
    },
    { upsert: true }
  ).catch((err) => {
    console.log(err);
  });

  //If teacher as taken a teat today, we will get to know from isTest flag and will
  //store the entry in isTest nodule.
  if (isTest == 1) {
    //Save the test details in the BatchWiseTest module.
    let batchWiseTest = new BatchWiseTest({
      tId: tId,
      bId: bId,
      insId: insId,
      testDt: dt,
      topic: chapter,
      subtopic: topic,
      totalMarks: testMarks,
    });

    batchWiseTest.save().catch((err) => {
      console.log(err);
    });
  }
});

//The API will be used to update the syllabus of the batch.
//Techer can use it to enter chapter name and sub chapter name.
router.post("/schedulelivesession", (req, res) => {
  let {
    tId,
    bId,
    bNm,
    tNm,
    chapter,
    topic,
    description,
    chapterDone,
    startTime,
    endTime,
  } = req.body;

  //Log the details of live session in the collection.
  GetCurrentDate().then((dt) => {
    let epochDt = Math.trunc(dt.getTime() / 1000);

    let liveSession = new LiveSession({
      tId: tId,
      bId: bId,
      bNm: bNm,
      tNm: tNm,
      dt: epochDt,
      chapter: chapter,
      topic: topic,
      description: description,
      startTime: startTime,
      endTime: endTime,
      chapterDone: Boolean(chapterDone),
    });

    liveSession
      .save()
      .then((response) => {
        res.status(200).json({
          flag: 1,
          msg:
            "Live Session has been scheduled and details shared with students.",
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(200).json(errorMsg);
      });
  });
});

//The API will used by teacher to start the live session.
router.post("/startlivesession", (req, res) => {
  let sessionId = req.body.sessionId;
  LiveSession.updateOne({ _id: sessionId }, { $set: { started: true } })
    .then((session) => {
      res.json({ flag: 1, msg: "Session Started" });

      //Update Activity Logger
      LiveSession.findOne({ _id: sessionId })
        .populate("bId", "insti _id")
        .then((sessionObj) => {
          GetCurrentDate().then((dt) => {
            let epochDt = Math.trunc(dt.getTime() / 1000);
            let year = dt.getFullYear();
            BatchActivityTracker.findOneAndUpdate(
              {
                bId: sessionObj.bId._id,
                insId: sessionObj.bId.insti,
                year: year,
              },
              {
                $push: {
                  activity: {
                    dt: epochDt,
                    topic: sessionObj.chapter,
                    subtopic: sessionObj.topic,
                    description: sessionObj.description,
                    tId: sessionObj.tId,
                    online: true,
                  },
                },
              },
              { upsert: true }
            ).catch((err) => {
              console.log(err);
            });
            TeacherActivityTracker.findOneAndUpdate(
              { tId: sessionObj.tId, year: year, dt: epochDt },
              {
                $push: {
                  "activity.bIds": {
                    bId: sessionObj.bId,
                    topic: sessionObj.chapter,
                    subtopic: sessionObj.topic,
                    description: sessionObj.description,
                    online: true,
                  },
                },
              },
              { upsert: true }
            ).catch((err) => {
              console.log(err);
            });
          });
        });
    })
    .catch((err) => {
      console.log(err);
    });
});

//The API will be used to fetch the last chapter taught in the batch
//based on the number of days/
//Teacher can query for 1 day, 1 week, 2 weeks and customised number of days
router.post("/lastbatchactivity", (req, res) => {
  let bId = req.body.bId;
  let year = req.body.year;
  let epochFromDt = req.body.fromDt;
  let epochToDt = req.body.toDt;

  //Now find the batch activity based on epoc times
  BatchActivityTracker.aggregate([
    {
      $match: {
        bId: mongoose.Types.ObjectId(bId),
        year: Number(year),
      },
    },
    {
      $project: {
        activity: {
          $filter: {
            input: "$activity",
            as: "activity",
            cond: {
              $and: [
                { $gte: ["$$activity.dt", Number(epochFromDt)] },
                { $lte: ["$$activity.dt", Number(epochToDt)] },
              ],
            },
          },
        },
      },
    },
  ]).then((response) => {
    //The logic is written here to transform epoch time to dd--mm-yyyy format  and then send the response
    for (let a = 0; a < response[0].activity.length; a++) {
      let dt = new Date(response[0].activity[a].dt * 1000);
      response[0].activity[a].dt =
        dt.getDate() + "-" + (dt.getMonth() + 1) + "-" + dt.getFullYear();
    }

    res.status(200).json({
      flag: 1,
      data: response[0].activity,
    });
  });
});

//The API will be used to broadcast messages to parents and, students
//Teacher can broadcast to batch student, batch and, all the batches taught by him/her.
router.post("/broadcast", (req, res) => {
  let arrBids = [];
  let msg = req.body.msg;
  let sIds = [];
  let tNm = req.body.tNm;
  let tId = req.body.tId;
  let insNm = req.body.insNm;
  if ("sIds" in req.body) {
    sIds = JSON.parse(req.body.sIds);
  }

  if ("bIds" in req.body) {
    arrBids = JSON.parse(req.body.bIds);
  }
  //sId 0 means broadcast it to the batches students/parents present in bIds
  if (sIds.length == 0) {
    //Will be inserting the messages in the batchwismessages
    GetCurrentDate().then((dt) => {
      let epochTime = Math.trunc(dt.getTime() / 1000);
      for (let b = 0; b < arrBids.length; b++) {
        let batchWiseMessages = new BatchWiseMessage({
          bId: arrBids[b],
          broadcastDt: epochTime,
          message: msg,
          tId: tId,
          tNm: tNm,
        });

        batchWiseMessages.save();
      }
    });
    Batch.find(
      {
        _id: { $in: arrBids },
      },
      "student sub -_id"
    )
      .populate("student", "cNo email")
      .then((arrStudents) => {
        res.status(200).json({
          flag: 1,
          msg: "Appropriate person(s) have been informed.",
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(200).json(errorMsg);
      });
  } else {
    //Send to the students present in the sIds array
    res.status(200).json({
      flag: 1,
      msg: "Appropriate person(s) have been informed.",
    });
  }
});

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

//The API will be used by teacher to rescedule the batch.
//Updates will be send to parent/students/admin about the same.
router.post("/reschedulebatch", (req, res) => {
  //dt will be epoch date
  let { bId, bNm, timings, tNm, clsDt, tId, extraCls } = req.body;

  Batch.findOne({ _id: mongoose.Types.ObjectId(bId) }, "student insti")
    .populate("insti", "admin -_id")
    .then((batches) => {
      Student.find(
        {
          sId: { $in: batches.student },
        },
        "pId -_id"
      ).then((parentIds) => {
        let arrUserIds = batches.student;
        parentIds.map((obj) => {
          arrUserIds.push(obj.pId);
        });

        arrUserIds = arrUserIds.concat(batches.insti.admin);
        arrUserIds = arrUserIds.filter(onlyUnique);
        //In the arrUserIds, we have admin, parent and student Ids, now we can find
        //Emails and contact number and now we can send mail, informing about batch change
        //timings
        User.find(
          {
            _id: { $in: arrUserIds },
          },
          "cNo email role -_id"
        ).then((response) => {
          //Use response to send mail to stakeholders, informing them about the timing change
          //Insert in UpdatedBatchTimingsSchema so that we can keep a log and also on dashboard,
          //show the same thing to parent.
          const updatedBatchTimings = new UpdatedBatchTimings({
            bId: bId,
            timings: timings,
            tId: tId,
            clsDt: clsDt,
            extraCls: extraCls,
            cDt: Math.trunc(new Date().getTime() / 1000),
          });

          updatedBatchTimings.save().catch((err) => {
            console.log(err);
          });

          //Update the timings in the batch as well.
          Batch.updateOne(
            { _id: bId },
            {
              $set: {
                updatedTimings: timings,
                updatedDt: clsDt,
                extraCls: extraCls,
              },
            },
            {}
          ).catch((err) => {
            console.log(err);
          });
          res.status(200).json({
            flag: 1,
            msg: "Timings updated successfully for the next class.",
          });
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//THe API will inform teacher about the tests that require marks upload
//from his end.
router.post("/tests", (req, res) => {
  let { tId, insId, year } = req.body;

  //The API first figures out the tests for the teacher, that requires her to upload the
  //marks.
  BatchWiseTest.find(
    { tId: tId, insId: insId, marksUploaded: false },
    "testDt topic subtopic totalMarks"
  )
    .populate("bId", "nm")
    .then((tests) => {
      if (tests.length > 0) {
        let data = [];
        let count = 0;
        tests.map((test) => {
          let testDetails = {};
          let dt = new Date(test.testDt * 1000);
          //Get the attendance of the students for that day in a batch.
          BatchWiseAttendance.aggregate([
            {
              $match: {
                bId: mongoose.Types.ObjectId(test.bId._id),
                year: Number(dt.getFullYear()),
              },
            },
            {
              $project: {
                month: { $arrayElemAt: ["$month", dt.getMonth()] },
              },
            },
            {
              $project: {
                sIds: { $arrayElemAt: ["$month.sIds", dt.getDate() - 1] },
              },
            },
          ]).then((response) => {
            let studentObj = response[0].sIds;
            User.populate(studentObj, {
              path: "sId",
              select: "nm",
            }).then((students) => {
              count++;
              //Populate the test details like Btach Id, Batch Name, Test Name and, Test Date
              testDetails.bId = test.bId._id;
              testDetails.bNm = test.bId.nm;
              testDetails.testId = test._id;
              testDetails.tNm = test.topic + " - " + test.subtopic;
              testDetails.tMarks = test.totalMarks;
              testDetails.tDt =
                dt.getDate() +
                "-" +
                (dt.getMonth() + 1) +
                "-" +
                dt.getFullYear();
              testDetails.students = students;
              data.push(testDetails);

              if (count == tests.length)
                res.status(200).json({
                  flag: 1,
                  data: data,
                });
            });
          });
        });
      } else {
        res.status(200).json({
          flag: 1,
          msg: "No tests exist in the system.",
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be used by teacher to upload marks of students
//in a test and do some analytics and update the same in
//BatchWiseTest and StudentWiseTest collections
router.post("/uploadmarks", (req, res) => {
  let { testId, tNm, tMarks, tDt, bId, insId, epochTDt } = req.body;
  let arrStudentMarks = JSON.parse(req.body.sMarks);

  //These five variables will be used to calculate the test specific metrics and
  //update the same in batchwisetest
  let minMarks = -1,
    maxMarks = -1,
    sMarks = 0,
    countStudents = 0,
    avgMarks = -1,
    year = Number(tDt.split("-")[2]);

  //I am building array of student Ids here
  //to query studentwisetest collection for all students that doesn't exist in local storage
  //in a one go and will be using these details to update test info
  let arrStudentIds = [];
  arrStudentMarks.map((s) => {
    if (typeof mapStudentTestDetails[s.sId] == "undefined")
      arrStudentIds.push(s.sId);
  });

  //1. Feeds the student information in the database and maintain state in the local machine --start
  //Log student test here
  StudentWiseTest.find({
    insId: insId,
    year: year,
    sId: { $in: arrStudentIds },
  })
    .then((studentTestDetails) => {
      if (studentTestDetails.length > 0)
        //Creating the map here
        studentTestDetails.map((s) => (mapStudentTestDetails[s.sId] = s));

      let bulk = StudentWiseTest.collection.initializeUnorderedBulkOp();
      let executeBulk = false;

      for (let s = 0; s < arrStudentMarks.length; s++) {
        //No test entry for institute, year exist for this new student.
        //So we need to add. This is the new student
        if (
          typeof mapStudentTestDetails[arrStudentMarks[s].sId] == "undefined"
        ) {
          let arrTest = [];
          let testObj = {};
          testObj.testId = testId;
          testObj.tNm = tNm;
          testObj.tDt = epochTDt;
          testObj.tMarks = tMarks;
          testObj.sMarks = arrStudentMarks[s].marks;
          testObj.attendance = arrStudentMarks[s].a;

          arrTest.push(testObj);

          bulk.insert({
            sId: mongoose.Types.ObjectId(arrStudentMarks[s].sId),
            insId: mongoose.Types.ObjectId(insId),
            year: Number(year),
            bIds: [{ bId: mongoose.Types.ObjectId(bId), tests: arrTest }],
          });
          executeBulk = true;
        } else {
          //If the Student attendance information exist for insId, year, then we need to update the information.
          //Update cases
          //1. It is for sam batch in the system
          //2. It is for altogether different batch
          //Check whether the test info is for existing batch
          //or new batch
          let batchIdFound = false;
          for (
            let b = 0;
            b < mapStudentTestDetails[arrStudentMarks[s].sId].bIds.length;
            b++
          ) {
            //When the  batch exist in the system.
            if (
              bId == mapStudentTestDetails[arrStudentMarks[s].sId].bIds[b].bId
            ) {
              //When the batch exist, update the test details object of student for the batch.
              //Or I can say that, add new test details in test object of student.
              let testObj = {};
              testObj.testId = testId;
              testObj.tNm = tNm;
              testObj.tDt = epochTDt;
              testObj.tMarks = tMarks;
              testObj.sMarks = arrStudentMarks[s].marks;
              testObj.attendance = arrStudentMarks[s].a;
              mapStudentTestDetails[arrStudentMarks[s].sId].bIds[b].tests.push(
                testObj
              );
              batchIdFound = true;
              break;
            }
          }

          //If new batch occurs for the student.
          if (!batchIdFound) {
            //This means that this is a new batch for the existing student

            let arrTest = [];
            let testObj = {};
            testObj.testId = testId;
            testObj.tNm = tNm;
            testObj.tDt = epochTDt;
            testObj.tMarks = tMarks;
            testObj.sMarks = arrStudentMarks[s].marks;
            testObj.attendance = arrStudentMarks[s].a;
            arrTest.push(testObj);

            let objbId = {
              bId: bId,
              tests: arrTest,
            };
            mapStudentTestDetails[arrStudentMarks[s].sId].bIds.push(objbId);
          }

          bulk
            .find({
              sId: mongoose.Types.ObjectId(arrStudentMarks[s].sId),
              insId: mongoose.Types.ObjectId(insId),
              year: Number(year),
            })
            .updateOne({
              $set: {
                bIds: mapStudentTestDetails[arrStudentMarks[s].sId].bIds,
              },
            });
          executeBulk = true;
        }
        //Metrics for calculating batchwise test and updating the same in collection.
        //Initialise metrics when s = 0;
        //To calculate metrics we will consider only present students
        if (arrStudentMarks[s].a == 1) {
          if (s == 0) {
            minMarks = arrStudentMarks[s].marks;
            maxMarks = arrStudentMarks[s].marks;
            sMarks = arrStudentMarks[s].marks;
          } else {
            sMarks += arrStudentMarks[s].marks;
            if (arrStudentMarks[s].marks < minMarks)
              minMarks = arrStudentMarks[s].marks;
            if (arrStudentMarks[s].marks > maxMarks)
              maxMarks = arrStudentMarks[s].marks;
          }
          countStudents++;
        }
      }

      avgMarks = sMarks / countStudents;

      BatchWiseTest.updateOne(
        { _id: mongoose.Types.ObjectId(testId) },
        {
          maxMarks: Number(maxMarks),
          minMarks: Number(minMarks),
          avgMarks: Number(avgMarks),
          marksUploaded: Boolean(true),
          processedByJob: Boolean(true),
        }
      )
        .then((response) => {
          if (executeBulk) {
            bulk
              .execute()
              .then((response) => {
                res.status(200).json({
                  flag: 1,
                  msg: "Test details submitted successfully",
                });
              })
              .catch((err) => {
                console.log(err);
                res.status(200).json(errorMsg);
              });
          }
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

//The API will be used by teacer to upload contents for the batch -- start
//Specify the destination of the uploaded files
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let { insNm, year, bId } = req.body;
    let path =
      // "/root/sourabh" +
      "/home/drogon/Content/" + insNm + "/" + year + "/" + bId;
    fs.stat(path, (err, stats) => {
      if (err) {
        //No directory exist, we need to create one.
        if (err.code === "ENOENT") {
          fs.mkdir(path, { recursive: true }, (err) => {
            if (err) {
              console.log(err);
              cb(new Error(err));
            }
            cb(null, path);
          });
        } else {
          console.log(err);
          cb(new Error(err));
        }
      } else {
        cb(null, path);
      }
    });
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

// var upload = multer({ storage: storage, limits: { fileSize: 10485760 } });

var upload = multer({ storage: storage });

//This part is used to upload content file and store content info in batch wise
//content collection
router.post("/uploadcontent", upload.single("file"), (req, res, next) => {
  // if (err) {
  //   res.json({ err: "ERROR" });
  // }
  let {
    year,
    bId,
    shareToStudents,
    uploadedDt,
    tId,
    description,
    nm,
    insNm,
  } = req.body;
  const file = req.file;
  if (!file) {
    res.status(200).json({
      flag: 0,
      msg: "Please upload a file",
    });
  } else {
    //Save the content information in the BatchWiseContent collection.
    let batchContent = new BatchWiseContent({
      bId: bId,
      year: year,
      uploadedDt: uploadedDt,
      //shareToStudents: shareToStudents,
      uploadedPath: file.path,
      fileNm: nm,
      fileSize: file.size,
      fileType: file.mimetype,
      tId: tId,
      description: description,
    });
    batchContent.save().then((response) => {
      //if (shareToStudents == true) {
      //Inform all the students/parents of the batch about the new content
      //that has been uploaded.
      //Send notification.
      res.status(200).json({
        flag: 1,
        msg:
          "Content have been uploaded successfully and shared with batch students.",
      });

      //Publish the saved file to pythona app, so we can scan it
      let fileInfo = {
        nm: nm,
        path: file.path,
        tId: tId,
      };
      PublishData("ScanFile", JSON.stringify(fileInfo));
      //} else {
      //res.status(200).json({
      //     flag: 1,
      //     msg: "Content have been uploaded successfully."
      //   });
      // }
    });
  }
});

//This is use to send file too large error
router.use(function (err, req, res, next) {
  if (err.code === "LIMIT_FILE_SIZE") {
    res.status(200).json({
      flag: 0,
      msg:
        "Uploaded file size is more than 10 Mb. Request you to upload files with size less than 10 Mb.",
    });
    return;
  }
});

//The API will be used by teacer to upload contents for the batch -- end

module.exports = router;
