const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const router = express.Router();

const User = require("../../models/User");
const Teacher = require("../../models/Teacher");
const Institute = require("../../models/Institute");
const Batch = require("../../models/Batch");
const BatchWiseFeePlan = require("../../models/BatchWiseFeePlan");
const InputStudentFees = require("../../models/InputStudentFees");
const StudentWiseFee = require("../../models/StudentWiseFee");
const ValidateStudentFees = require("../../models/ValidateStudentFees");
const FeeTxnDetails = require("../../models/FeeTxnDetails");
const InstiMappingWithExTeachers = require("../../models/InstiMappingWithExTeachers");
const PLCenter = require("../../models/PLCenter");
const { errorMsg } = require("../../config/keys");
const {
  SendMail,
  GenerateRandomPwd,
  AddFeePLCenter,
} = require("../../common/Common");
const {
  teacherAddedBody,
  teacherAddedSub,
  accountCreatedBody,
  accountCreatedSub,
  teacherAddedToBatchSub,
  teacherAddedToBatchBody,
} = require("../../common/EmailTemplate");

//The API will be used by Admin to add batches
//in the institute and map the same to teachers in the institute
router.post("/addbatch", (req, res) => {
  let insId = req.body.insId;
  let nm = req.body.nm; //Name of the batch
  let arrSub = req.body.sub; // subjects can be multiple separated by commas
  let tId = req.body.tId; // will be the teacher Id who is mentoring the batch
  let tNm = req.body.tNm;
  let joinBatchDt = req.body.joinBatchDt;
  let timings = req.body.timings; // This will be an string array of seven days containg the batch time details
  let adminNm = req.body.adminNm;
  let insNm = req.body.insNm;
  let addBatch = true;
  let arrFeePlans = JSON.parse(req.body.arrFeePlans);

  //No two batches in the insti can have same name.
  //So we will first verify the name of the batch and if it good then we
  //will proceed to add the batch
  let batchProjection = {
    insti: false,
    cDt: false,
    mDt: false,
    updatedTimings: false,
    updatedDt: false,
    __v: false,
  };

  Batch.find({ insti: insId }, batchProjection)
    .then((batches) => {
      for (let b = 0; b < batches.length; b++) {
        //Two batches cannot have same name.
        if (batches[b].nm == nm) {
          addBatch = false;
          res.status(200).json({
            flag: 0,
            msg:
              "Batch with the name, " +
              nm +
              " already exist. Request you to enter unique Batch Name.",
          });
        }

        //Also the same teacher cannot take different batches at same time
        if (addBatch) {
          if (batches[b].teacher == tId) {
            let errorMsg =
              "Teacher, " +
              tNm +
              " takes " +
              batches[b].sub +
              " class of batch, " +
              batches[b].nm +
              " on ";
            let timingsMatched = batches[b].timings.map((item, i) => {
              if (item == "-1" && timings[i] == "-1") return false;
              let arrExistingBatchTime = String(item).split("-"); //Array will store start and end time of existing batch
              let arrNewBatchTime = String(timings[i]).split("-");
              //Start time of new batch falls between existing batch times
              if (
                arrNewBatchTime[0].trim() > arrExistingBatchTime[0].trim() &&
                arrNewBatchTime[0].trim() < arrExistingBatchTime[1].trim()
              ) {
                return true;
              }
              //End time of new batch falls between existing batch times
              if (
                arrNewBatchTime[1].trim() > arrExistingBatchTime[0].trim() &&
                arrNewBatchTime[1].trim() < arrExistingBatchTime[1].trim()
              ) {
                return true;
              }
              //Start time of existing batch falls between new batch times
              if (
                arrExistingBatchTime[0].trim() > arrNewBatchTime[0].trim() &&
                arrExistingBatchTime[0].trim() < arrNewBatchTime[1].trim()
              ) {
                return true;
              }
              //End time of new existing batch falls between new batch times
              if (
                arrExistingBatchTime[1].trim() > arrNewBatchTime[0].trim() &&
                arrExistingBatchTime[1].trim() < arrNewBatchTime[1].trim()
              ) {
                return true;
              }
              if (
                arrExistingBatchTime[0].trim() == arrNewBatchTime[0].trim() &&
                arrExistingBatchTime[1].trim() == arrNewBatchTime[1].trim()
              ) {
                return true;
              }
              return item == timings[i];
            });
            for (let r = 0; r < timingsMatched.length; r++) {
              if (timingsMatched[r]) {
                addBatch = false;
                switch (r) {
                  case 0:
                    errorMsg += "sunday, ";
                    break;
                  case 1:
                    errorMsg += "monday, ";
                    break;
                  case 2:
                    errorMsg += "tuesday, ";
                    break;
                  case 3:
                    errorMsg += "wednesday, ";
                    break;
                  case 4:
                    errorMsg += "thursday, ";
                    break;
                  case 5:
                    errorMsg += "friday, ";
                    break;
                  case 6:
                    errorMsg += "saturday, ";
                    break;
                }
              }
            }

            if (!addBatch) {
              errorMsg = errorMsg.slice(0, -2) + " at same time.";
              res.status(200).json({
                flag: 0,
                msg: errorMsg,
              });
            }
          }
        }
      }

      if (addBatch) {
        let batch = new Batch({
          nm: nm,
          sub: arrSub,
          insti: insId,
          teacher: tId,
          timings: timings,
        });

        //Saving the batch metadata in the Batch collection
        batch
          .save()
          .then((batch) => {
            //Now simultaneously we will store these batches details in the Teacher collection
            Teacher.updateOne(
              { tId: tId },
              {
                $push: {
                  "insti.$[i].bIds": {
                    bId: batch._id,
                    joinBatchDt: joinBatchDt,
                  },
                },
              },
              { arrayFilters: [{ "i.insId": mongoose.Types.ObjectId(insId) }] }
            )
              .then((teacher) => {
                User.findOne({ _id: tId })
                  .then((user) => {
                    SendMail(
                      user.email,
                      teacherAddedToBatchSub
                        .replace("#Batch", nm)
                        .replace("#Insti", insNm),
                      teacherAddedToBatchBody
                        .replace("#Batch", nm)
                        .replace("#Insti", insNm)
                        .replace("#Admin", adminNm)
                    );
                  })
                  .catch((err) => console.log(err));
                res.status(200).json({
                  flag: 1,
                  msg: nm + " added in the institute.",
                });

                //Send mail to teacher informing him about the batch insertion
              })
              .catch((err) => {
                console.log(err);
                res.status(200).json(errorMsg);
              });

            //Add fee plan of the batch.
            let batchFeePlan = new BatchWiseFeePlan({
              bId: batch._id,
              insId: insId,
              feePlans: arrFeePlans,
            });

            batchFeePlan.save().catch((err) => {
              console.log(err);
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

//The API will be used to check all details of the batch
//Right now, adding teacher specific details
//Will add Student specific later
router.post("/batchdetails", (req, res) => {
  let batchProjection = {
    __v: false,
    cDt: false,
    mDt: false,
    _id: false,
    insti: false,
    updatedTimings: false,
    updatedDt: false,
  };
  // let insId = req.body.insId;
  let batchId = req.body.batchId;
  Batch.findById({ _id: mongoose.Types.ObjectId(batchId) }, batchProjection)
    .populate({ path: "teacher", select: "nm email cNo -_id" })
    .populate({ path: "student", select: "nm email cNo -_id" })
    .then((batchDetails) => {
      let data = {};
      data.sub = batchDetails.sub;
      data.timings = batchDetails.timings;
      data.nm = batchDetails.nm;
      data.teachers = batchDetails.teacher;
      data.students = batchDetails.student;
      res.status(200).json({
        flag: 1,
        data,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be used by admin to update the batch details
//1. Like he can assign new teacher to the batch.
//2. He can update the timings of the batch
//3. He can rename the batch.
//4. He cqn update the batch fee plan as well.
//5. he can rename the subject of the batch.
router.post("/updatebatch", (req, res) => {
  let { tId, tNm, insId, insNm, adminNm, bId } = req.body;
  let nm = ""; //Name of the batch
  let arrSub = []; // subjects can be multiple separated by commas
  let joinBatchDt = -1;
  let timings = []; // This will be an string array of seven days containg the batch time details
  let arrFeePlans = [];
  let updateParams = {};
  let oldTId = "";
  let oldTNm = "";
  let bNm = "";

  //The three variables will be used to know when to execute the batch update function and whether
  //any error has come.
  let noOfValidationMethodCount = 0;
  let validationMethodExecutedCount = 0;
  let errors = [];

  if ("nm" in req.body) {
    noOfValidationMethodCount++;
    nm = req.body.nm;
  }
  if ("sub" in req.body) {
    arrSub = req.body.sub;
  }
  if ("joinBatchDt" in req.body) {
    joinBatchDt = req.body.joinBatchDt;
    oldTId = req.body.oldTId;
    oldTNm = req.body.oldTNm;
    bNm = req.body.bNm;
  }
  if ("timings" in req.body) {
    noOfValidationMethodCount++;
    timings = req.body.timings;
  }
  if ("arrFeePlans" in req.body) {
    arrFeePlans = JSON.parse(req.body.arrFeePlans);
  }

  //Admin decided to update the subject of the batch
  if (arrSub.length > 0) updateParams["sub"] = arrSub;

  //Join bacth date grater than 1 indicates that batch is assigned to new teacher and old teacher has been replaced.
  //We will be creating logs in this case.
  if (joinBatchDt > 0) {
    //timings check will happen, whether the new teacher teaches another batch at same time.
    validateBatchTimings(tId, tNm, insId, timings, bId)
      .then((response) => {
        validationMethodExecutedCount++;
        updateParams["timings"] = timings;
        updateParams["teacher"] = tId;

        if (errors.length == 0) {
          if (noOfValidationMethodCount == validationMethodExecutedCount) {
            //Create Unlink logs of teacher in our system
            UnlinkTeacherFromBatch(
              bId,
              insId,
              tId,
              oldTId,
              oldTNm,
              adminNm,
              bNm,
              joinBatchDt,
              insNm
            );
            Batch.updateOne({ _id: bId }, updateParams, {}).then((response) => {
              res.status(200).json({
                flag: 1,
                msg: "Batch details updated successfully",
              });
            });
          }
        } else {
          res.status(200).json({
            flag: 0,
            msg: errors,
          });
        }
      })
      .catch((err) => {
        errors.push(err);
        validationMethodExecutedCount++;
        if (noOfValidationMethodCount == validationMethodExecutedCount) {
          res.status(200).json({
            flag: 0,
            msg: errors,
          });
        }
      });
  } else {
    //Check if admin has updated timings
    if (timings.length > 0) {
      //timings check will happen, whether the teacher teaches another batch at same time.
      validateBatchTimings(tId, tNm, insId, timings, bId)
        .then((response) => {
          validationMethodExecutedCount++;
          updateParams["timings"] = timings;
          //Send mail to teacher as well informing him/her about the updated timings.
          if (errors.length == 0) {
            if (noOfValidationMethodCount == validationMethodExecutedCount) {
              Batch.updateOne({ _id: bId }, updateParams, {}).then(
                (response) => {
                  res.status(200).json({
                    flag: 1,
                    msg: "Batch details updated successfully",
                  });
                }
              );
            }
          } else {
            res.status(200).json({
              flag: 0,
              msg: errors,
            });
          }
        })
        .catch((err) => {
          errors.push(err);
          validationMethodExecutedCount++;
          if (noOfValidationMethodCount == validationMethodExecutedCount) {
            res.status(200).json({
              flag: 0,
              msg: errors,
            });
          }
        });
    }
  }

  //The admin has asked to update the batch name
  if (nm != "") {
    validateBatchNm(insId, bId, nm)
      .then((response) => {
        validationMethodExecutedCount++;
        updateParams["nm"] = nm;

        if (errors.length == 0) {
          if (noOfValidationMethodCount == validationMethodExecutedCount) {
            //The joinBatchDt greater than 0 indicates that we have assigned the batch
            //to new teacher, so we need to remove the batchdetails from the old teacher and
            //aad the same in new teacher and update the batch details as well.
            if (joinBatchDt > 0) {
              updateParams["teacher"] = tId;
              //Create Unlink logs of teacher in our system
              UnlinkTeacherFromBatch(
                bId,
                insId,
                tId,
                oldTId,
                oldTNm,
                adminNm,
                bNm,
                joinBatchDt,
                insNm
              );
            }
            Batch.updateOne({ _id: bId }, updateParams, {}).then((response) => {
              res.status(200).json({
                flag: 1,
                msg: "Batch details updated successfully",
              });
            });
          }
        } else {
          res.status(200).json({
            flag: 0,
            msg: errors,
          });
        }
      })
      .catch((err) => {
        validationMethodExecutedCount++;
        errors.push(err);
        if (noOfValidationMethodCount == validationMethodExecutedCount) {
          res.status(200).json({ flag: 0, msg: errors });
        }
      });
  }
  //If I need not hit any validation method and this will happen in case of sub updation only.
  //This block will be called.
  if (noOfValidationMethodCount == 0) {
    Batch.updateOne({ _id: bId }, updateParams, {}).then((response) => {
      res.status(200).json({
        flag: 1,
        msg: "Batch details updated successfully",
      });
    });
  }

  //If the admin intents to update fee plan of batch.
  if (arrFeePlans.length > 0) {
    BatchWiseFeePlan.updateOne(
      { bId: bId },
      { feePlans: arrFeePlans },
      {}
    ).catch((err) => {
      console.log(err);
    });
  }
});

//The API will be used to prepare the data for the profit loss center for the admin
//and send him the same.
router.post("/plcenter", (req, res) => {
  let { insId } = req.body;
  let curentYear = new Date().getFullYear();
  let lastYear = curentYear - 1;
  let month = new Date().getMonth();

  //Final PL object that will be send to create the dashboard
  let objPLDashboard = {};
  //Profit analysis chart object
  let objProfitAnalysis = {};
  objProfitAnalysis["1"] = [];
  objProfitAnalysis["3"] = [];
  objProfitAnalysis["6"] = [];
  objProfitAnalysis["12"] = [];

  FetchPLInfo(insId, month, curentYear, lastYear).then((response) => {
    //Profit Analysis section -- start
    switch (month) {
      case 0:
      case 1:
      case 2:
      case 3:
        if (response.length != 0) {
          if (response.length == 1) {
            if (response[0].year == curentYear) {
              //Means I don't have previous year data, so 6 months, 12 months are -1
              objProfitAnalysis["6"].push(-1);
              //Expenditure of last month
              objProfitAnalysis["6"].push(-1);
              //Profit of last month
              objProfitAnalysis["6"].push(-1);

              //If current month is january, then also -1 for last month
              if (month == 0) {
                objProfitAnalysis["1"].push(-1);
                //Expenditure of last month
                objProfitAnalysis["1"].push(-1);
                //Profit of last month
                objProfitAnalysis["1"].push(-1);
              } else {
                if (typeof response[1].month[month - 1] == "undefined") {
                  objProfitAnalysis["1"].push(0);
                  //Expenditure of last month
                  objProfitAnalysis["1"].push(0);
                  //Profit of last month
                  objProfitAnalysis["1"].push(0);
                } else {
                  //For all above month cases I will have last month data.
                  //Earnings of last month
                  objProfitAnalysis["1"].push(
                    response[1].month[month - 1].instiFeeCollected +
                      response[1].month[month - 1].monthlyErngs
                  );
                  //Expenditure of last month
                  objProfitAnalysis["1"].push(
                    response[1].month[month - 1].monthlyExp
                  );
                  //Profit of last month
                  objProfitAnalysis["1"].push(response[1].month[month - 1].PL);
                }
              }

              //For 3 months
              if (month == 3) {
                let earning = 0;
                let exp = 0;
                let pl = 0;

                for (let m = 0; m < month; m++) {
                  if (typeof response[0].month[m] == "undefined") {
                    earning += 0;
                    exp += 0;
                    pl += 0;
                  } else {
                    earning +=
                      response[0].month[m].instiFeeCollected +
                      response[0].month[m].monthlyErngs;
                    exp += response[0].month[m].monthlyExp;
                    pl += response[0].month[m].PL;
                  }
                }
                objProfitAnalysis["3"].push(earning);
                //Expenditure of last month
                objProfitAnalysis["3"].push(exp);
                //Profit of last month
                objProfitAnalysis["3"].push(pl);
              } else {
                objProfitAnalysis["3"].push(-1);
                //Expenditure of last month
                objProfitAnalysis["3"].push(-1);
                //Profit of last month
                objProfitAnalysis["3"].push(-1);
              }
            }
            //Response year is last year.
            else {
              //Last month case .. For month 0, we need to query decembe of last year.
              if (month == 0) {
                if (typeof response[0].month[11] == "undefined") {
                  objProfitAnalysis["1"].push(0);
                  //Expenditure of last month
                  objProfitAnalysis["1"].push(0);
                  //Profit of last month
                  objProfitAnalysis["1"].push(0);
                } else {
                  objProfitAnalysis["1"].push(
                    response[0].month[11].instiFeeCollected +
                      response[0].month[11].monthlyErngs
                  );
                  //Expenditure of last month
                  objProfitAnalysis["1"].push(response[0].month[11].monthlyExp);
                  //Profit of last month
                  objProfitAnalysis["1"].push(response[0].month[11].PL);
                }
              } else {
                objProfitAnalysis["1"].push(0);
                //Expenditure of last month
                objProfitAnalysis["1"].push(0);
                //Profit of last month
                objProfitAnalysis["1"].push(0);
              }

              //For 3 months
              let earning = 0;
              let pl = 0;
              let exp = 0;
              let startIndex = 13;

              switch (month) {
                case 0:
                  startIndex = 9;
                  break;
                case 1:
                  startIndex = 10;
                  break;
                case 2:
                  startIndex = 11;
                  break;
              }

              for (let m = startIndex; m < 12; m++) {
                if (typeof response[0].month[m] == "undefined") {
                  earning += 0;
                  exp += 0;
                  pl += 0;
                } else {
                  earning +=
                    response[0].month[m].instiFeeCollected +
                    response[0].month[m].monthlyErngs;
                  exp += response[0].month[m].monthlyExp;
                  pl += response[0].month[m].PL;
                }
              }
              objProfitAnalysis["3"].push(earning);
              //Expenditure of last month
              objProfitAnalysis["3"].push(exp);
              //Profit of last month
              objProfitAnalysis["3"].push(pl);

              //For 6 months
              earning = 0;
              exp = 0;
              pl = 0;
              startIndex = 13;

              switch (month) {
                case 0:
                  startIndex = 6;
                  break;
                case 1:
                  startIndex = 7;
                  break;
                case 2:
                  startIndex = 8;
                  break;
                case 3:
                  startIndex = 9;
                  break;
              }

              for (let m = startIndex; m < 12; m++) {
                if (typeof response[0].month[m] == "undefined") {
                  earning += 0;
                  exp += 0;
                  pl += 0;
                } else {
                  earning +=
                    response[0].month[m].instiFeeCollected +
                    response[0].month[m].monthlyErngs;
                  exp += response[0].month[m].monthlyExp;
                  pl += response[0].month[m].PL;
                }
              }

              objProfitAnalysis["6"].push(earning);
              //Expenditure of last month
              objProfitAnalysis["6"].push(exp);
              //Profit of last month
              objProfitAnalysis["6"].push(pl);
            }
            objProfitAnalysis["12"].push(-1);
            //Expenditure of last month
            objProfitAnalysis["12"].push(-1);
            //Profit of last month
            objProfitAnalysis["12"].push(-1);
          } else {
            //Last month case .. For month 0, we need to query decembe of last year.
            if (month == 0) {
              if (typeof response[0].month[11] == "undefined") {
                objProfitAnalysis["1"].push(0);
                //Expenditure of last month
                objProfitAnalysis["1"].push(0);
                //Profit of last month
                objProfitAnalysis["1"].push(0);
              } else {
                objProfitAnalysis["1"].push(
                  response[0].month[11].instiFeeCollected +
                    response[0].month[11].monthlyErngs
                );
                //Expenditure of last month
                objProfitAnalysis["1"].push(response[0].month[11].monthlyExp);
                //Profit of last month
                objProfitAnalysis["1"].push(response[0].month[11].PL);
              }
            } else {
              if (typeof response[1].month[month - 1] == "undefined") {
                objProfitAnalysis["1"].push(0);
                //Expenditure of last month
                objProfitAnalysis["1"].push(0);
                //Profit of last month
                objProfitAnalysis["1"].push(0);
              } else {
                //For all above month cases I will have last month data.
                //Earnings of last month
                objProfitAnalysis["1"].push(
                  response[1].month[month - 1].instiFeeCollected +
                    response[1].month[month - 1].monthlyErngs
                );
                //Expenditure of last month
                objProfitAnalysis["1"].push(
                  response[1].month[month - 1].monthlyExp
                );
                //Profit of last month
                objProfitAnalysis["1"].push(response[1].month[month - 1].PL);
              }
            }

            //For 3 months
            let earning = 0;
            let pl = 0;
            let exp = 0;

            for (let m = 0; m < month; m++) {
              if (typeof response[1].month[m] == "undefined") {
                earning += 0;
                exp += 0;
                pl += 0;
              } else {
                earning +=
                  response[1].month[m].instiFeeCollected +
                  response[1].month[m].monthlyErngs;

                exp += response[1].month[m].monthlyExp;
                pl += response[1].month[m].PL;
              }
            }

            let startIndex = 13;

            switch (month) {
              case 0:
                startIndex = 9;
                break;
              case 1:
                startIndex = 10;
                break;
              case 2:
                startIndex = 11;
                break;
            }

            for (let m = startIndex; m < 12; m++) {
              if (typeof response[0].month[m] == "undefined") {
                earning += 0;
                exp += 0;
                pl += 0;
              } else {
                earning +=
                  response[0].month[m].instiFeeCollected +
                  response[0].month[m].monthlyErngs;
                exp += response[0].month[m].monthlyExp;
                pl += response[0].month[m].PL;
              }
            }

            objProfitAnalysis["3"].push(earning);
            //Expenditure of last month
            objProfitAnalysis["3"].push(exp);
            //Profit of last month
            objProfitAnalysis["3"].push(pl);

            //For 6 months
            earning = 0;
            exp = 0;
            pl = 0;
            startIndex = 13;

            for (let m = 0; m < month; m++) {
              if (typeof response[1].month[m] == "undefined") {
                earning += 0;
                exp += 0;
                pl += 0;
              } else {
                earning +=
                  response[1].month[m].instiFeeCollected +
                  response[1].month[m].monthlyErngs;
                exp += response[1].month[m].monthlyExp;
                pl += response[1].month[m].PL;
              }
            }

            switch (month) {
              case 0:
                startIndex = 6;
                break;
              case 1:
                startIndex = 7;
                break;
              case 2:
                startIndex = 8;
                break;
              case 3:
                startIndex = 9;
                break;
            }

            for (let m = startIndex; m < 12; m++) {
              if (typeof response[0].month[m] == "undefined") {
                earning += 0;
                exp += 0;
                pl += 0;
              } else {
                earning +=
                  response[0].month[m].instiFeeCollected +
                  response[0].month[m].monthlyErngs;
                exp += response[0].month[m].monthlyExp;
                pl += response[0].month[m].PL;
              }
            }

            objProfitAnalysis["6"].push(earning);
            //Expenditure of last month
            objProfitAnalysis["6"].push(exp);
            //Profit of last month
            objProfitAnalysis["6"].push(pl);

            //For 12 months

            if (month == 3) {
              earning = 0;
              exp = 0;
              pl = 0;
              for (let m = 3; m < 12; m++) {
                if (typeof response[0].month[m] == "undefined") {
                  earning += 0;
                  exp += 0;
                  pl += 0;
                } else {
                  earning +=
                    response[0].month[m].instiFeeCollected +
                    response[0].month[m].monthlyErngs;
                  exp += response[0].month[m].monthlyExp;
                  pl += response[0].month[m].PL;
                }
              }

              for (let m = 0; m < 3; m++) {
                if (typeof response[1].month[m] == "undefined") {
                  earning += 0;
                  exp += 0;
                  pl += 0;
                } else {
                  earning +=
                    response[1].month[m].instiFeeCollected +
                    response[1].month[m].monthlyErngs;
                  exp += response[1].month[m].monthlyExp;
                  pl += response[1].month[m].PL;
                }
              }

              objProfitAnalysis["12"].push(earning);
              //Expenditure of last month
              objProfitAnalysis["12"].push(exp);
              //Profit of last month
              objProfitAnalysis["12"].push(pl);
            } else {
              objProfitAnalysis["12"].push(-1);
              //Expenditure of last month
              objProfitAnalysis["12"].push(-1);
              //Profit of last month
              objProfitAnalysis["12"].push(-1);
            }
          }
        } else {
          objProfitAnalysis["1"].push(-1);
          //Expenditure of last month
          objProfitAnalysis["1"].push(-1);
          //Profit of last month
          objProfitAnalysis["1"].push(-1);

          objProfitAnalysis["3"].push(-1);
          //Expenditure of last month
          objProfitAnalysis["3"].push(-1);
          //Profit of last month
          objProfitAnalysis["3"].push(-1);

          objProfitAnalysis["6"].push(-1);
          //Expenditure of last month
          objProfitAnalysis["6"].push(-1);
          //Profit of last month
          objProfitAnalysis["6"].push(-1);

          objProfitAnalysis["12"].push(-1);
          //Expenditure of last month
          objProfitAnalysis["12"].push(-1);
          //Profit of last month
          objProfitAnalysis["12"].push(-1);
        }
        break;
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
        if (response.length != 0) {
          //For all above  month cases I can't compute for last year data...as I don't have it
          objProfitAnalysis["12"].push(-1);
          //Expenditure of last month
          objProfitAnalysis["12"].push(-1);
          //Profit of last month
          objProfitAnalysis["12"].push(-1);

          //For all above month cases I will have last month data.
          //Earnings of last month
          if (typeof response[0].month[month - 1] == "undefined") {
            objProfitAnalysis["1"].push(0);
            //Expenditure of last month
            objProfitAnalysis["1"].push(0);
            //Profit of last month
            objProfitAnalysis["1"].push(0);
          } else {
            objProfitAnalysis["1"].push(
              response[0].month[month - 1].instiFeeCollected +
                response[0].month[month - 1].monthlyErngs
            );
            //Expenditure of last month
            objProfitAnalysis["1"].push(
              response[0].month[month - 1].monthlyExp
            );
            //Profit of last month
            objProfitAnalysis["1"].push(response[0].month[month - 1].PL);
          }

          if (month < 6) {
            //I won't be having the data for last three months.
            objProfitAnalysis["3"].push(-1);
            //Expenditure of last month
            objProfitAnalysis["3"].push(-1);
            //Profit of last month
            objProfitAnalysis["3"].push(-1);
          } else {
            let earning = 0;
            let pl = 0;
            let exp = 0;
            for (let m = month - 3; m < month; m++) {
              if (typeof response[0].month[m] == "undefined") {
                earning += 0;
                exp += 0;
                pl += 0;
              } else {
                earning +=
                  response[0].month[m].instiFeeCollected +
                  response[0].month[m].monthlyErngs;
                exp += response[0].month[m].monthlyExp;
                pl += response[0].month[m].PL;
              }
            }
            objProfitAnalysis["3"].push(earning);
            //Expenditure of last month
            objProfitAnalysis["3"].push(exp);
            //Profit of last month
            objProfitAnalysis["3"].push(pl);
          }

          if (month < 9) {
            //I won't be having the data for last 6 months.
            objProfitAnalysis["6"].push(-1);
            //Expenditure of last month
            objProfitAnalysis["6"].push(-1);
            //Profit of last month
            objProfitAnalysis["6"].push(-1);
          } else {
            let earning = 0;
            let pl = 0;
            let exp = 0;
            for (let m = month - 6; m < month; m++) {
              if (typeof response[0].month[m] == "undefined") {
                earning += 0;
                exp += 0;
                pl += 0;
              } else {
                earning +=
                  response[0].month[m].instiFeeCollected +
                  response[0].month[m].monthlyErngs;
                exp += response[0].month[m].monthlyExp;
                pl += response[0].month[m].PL;
              }
            }
            objProfitAnalysis["6"].push(earning);
            //Expenditure of last month
            objProfitAnalysis["6"].push(exp);
            //Profit of last month
            objProfitAnalysis["6"].push(pl);
          }
          break;
        } else {
          objProfitAnalysis["1"].push(-1);
          //Expenditure of last month
          objProfitAnalysis["1"].push(-1);
          //Profit of last month
          objProfitAnalysis["1"].push(-1);

          objProfitAnalysis["3"].push(-1);
          //Expenditure of last month
          objProfitAnalysis["3"].push(-1);
          //Profit of last month
          objProfitAnalysis["3"].push(-1);

          objProfitAnalysis["6"].push(-1);
          //Expenditure of last month
          objProfitAnalysis["6"].push(-1);
          //Profit of last month
          objProfitAnalysis["6"].push(-1);

          objProfitAnalysis["12"].push(-1);
          //Expenditure of last month
          objProfitAnalysis["12"].push(-1);
          //Profit of last month
          objProfitAnalysis["12"].push(-1);
        }
    }
    //Profit Analysis section -- end

    //Revenue Analysis & Expenditure section -- start
    let objRA = [];
    let objExp = [];
    let objPresentMonthExpDetails = [];
    let objPastMonthExpDetails = [];
    let objPresentMonthErngDetails = [];
    let objPastMonthErngDetails = [];
    if (response.length != 0) {
      switch (month) {
        case 0:
        case 1:
        case 2:
          //Profit Analysis & Expenditure Analysis -- Start
          if (response.length == 1) {
            if (response[0].year == curentYear) {
              for (let m = 3; m < 12; m++) {
                objRA.push(-1);
                objExp.push(-1);
              }
              for (let m = 0; m < 3; m++) {
                if (typeof response[0].month[m] == "undefined") {
                  objRA.push(-1);
                  objExp.push(-1);

                  //Expenditure details
                  if (m == month) {
                    objPresentMonthErngDetails = [];
                    objPresentMonthExpDetails = [];
                  }

                  if (m == month - 1) {
                    objPastMonthErngDetails = [];
                    objPastMonthExpDetails = [];
                  }
                } else {
                  objRA.push(
                    response[0].month[m].monthlyErngs +
                      response[0].month[m].instiFeeCollected
                  );
                  objExp.push(response[0].month[m].monthlyExp);

                  //Expenditure details
                  if (m == month) {
                    objPresentMonthErngDetails = response[0].month[m].earnings;
                    objPresentMonthExpDetails = response[0].month[m].expense;
                  }

                  if (m == month - 1) {
                    objPastMonthErngDetails = response[0].month[m - 1].earnings;
                    objPastMonthExpDetails = response[0].month[m - 1].expense;
                  }
                }
              }

              //When month is january and I don't have past year details
              if (m == 0) {
                objPastMonthErngDetails = [];
                objPastMonthExpDetails = [];
              }
            }
            //Handler for previous year.
            else {
              for (let m = 3; m < 12; m++) {
                if (typeof response[0].month[m] == "undefined") {
                  objRA.push(-1);
                  objExp.push(-1);

                  //Special case of january month. As it is past month will december
                  if (month == 0 && m == 11) {
                    objPastMonthErngDetails = [];
                    objPastMonthExpDetails = [];
                  }
                } else {
                  objRA.push(
                    response[0].month[m].monthlyErngs +
                      response[0].month[m].instiFeeCollected
                  );
                  objExp.push(response[0].month[m].monthlyExp);

                  //Special case of january month. As it is past month will december
                  if (month == 0 && m == 11) {
                    objPastMonthErngDetails = response[0].month[m].earnings;
                    objPastMonthExpDetails = response[0].month[m].expense;
                  }
                }
              }

              //For all months have values as -1. I am doing this, because will always send him array of size 12
              for (let m = 0; m < 3; m++) {
                objRA.push(-1);
                objExp.push(-1);
              }

              objPresentMonthErngDetails = [];
              objPresentMonthExpDetails = [];
            }
          }
          //Handler for both years
          else {
            for (let m = 3; m < 12; m++) {
              if (typeof response[0].month[m] == "undefined") {
                objRA.push(-1);
                objExp.push(-1);

                //Special case of january month. As it is past month will december
                if (month == 0 && m == 11) {
                  objPastMonthErngDetails = [];
                  objPastMonthExpDetails = [];
                }
              } else {
                objRA.push(
                  response[0].month[m].monthlyErngs +
                    response[0].month[m].instiFeeCollected
                );
                objExp.push(response[0].month[m].monthlyExp);

                //Special case of january month. As it is past month will december
                if (month == 0 && m == 11) {
                  objPastMonthErngDetails = response[0].month[m].earnings;
                  objPastMonthExpDetails = response[0].month[m].expense;
                }
              }
            }

            for (let m = 0; m < 3; m++) {
              if (typeof response[1].month[m] == "undefined") {
                objRA.push(-1);
                objExp.push(-1);

                if (month == m) {
                  objPresentMonthErngDetails = [];
                  objPresentMonthExpDetails = [];
                }

                if (month - 1 == m) {
                  objPastMonthErngDetails = [];
                  objPastMonthExpDetails = [];
                }
              } else {
                objRA.push(
                  response[1].month[m].monthlyErngs +
                    response[1].month[m].instiFeeCollected
                );
                objExp.push(response[1].month[m].monthlyExp);

                if (month == m) {
                  objPresentMonthErngDetails = response[1].month[m].earnings;
                  objPresentMonthExpDetails = response[1].month[m].expense;
                }

                if (month - 1 == m) {
                  objPastMonthErngDetails = response[1].month[m].earnings;
                  objPastMonthExpDetails = response[1].month[m].expense;
                }
              }
            }
          }
          //Profit Analysis & Expenditure Analysis -- end

          break;
        case 3:
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
          //Profit Analysis & Expenditure Analysis -- Start
          for (let m = 3; m < 12; m++) {
            if (typeof response[0].month[m] == "undefined") {
              objRA.push(-1);
              objExp.push(-1);

              if (month == m) {
                objPresentMonthErngDetails = [];
                objPresentMonthExpDetails = [];
              }

              if (month - 1 == m) {
                objPastMonthErngDetails = [];
                objPastMonthExpDetails = [];
              }
            } else {
              objRA.push(
                response[0].month[m].monthlyErngs +
                  response[0].month[m].instiFeeCollected
              );
              objExp.push(response[0].month[m].monthlyExp);

              if (month == m) {
                objPresentMonthErngDetails = response[0].month[m].earnings;
                objPresentMonthExpDetails = response[0].month[m].expense;
              }

              if (month - 1 == m) {
                objPastMonthErngDetails = response[0].month[m].earnings;
                objPastMonthExpDetails = response[0].month[m].expense;
              }
            }
          }
          for (let m = 0; m < 3; m++) {
            objRA.push(-1);
            objExp.push(-1);
          }
          //Profit Analysis & Expenditure Analysis -- End
          break;
      }
    } else {
      objRA.push(-1);
      objRA.push(-1);
      objRA.push(-1);
      objRA.push(-1);
      objRA.push(-1);
      objRA.push(-1);
      objRA.push(-1);
      objRA.push(-1);
      objRA.push(-1);
      objRA.push(-1);
      objRA.push(-1);
      objRA.push(-1);

      objExp.push(-1);
      objExp.push(-1);
      objExp.push(-1);
      objExp.push(-1);
      objExp.push(-1);
      objExp.push(-1);
      objExp.push(-1);
      objExp.push(-1);
      objExp.push(-1);
      objExp.push(-1);
      objExp.push(-1);
      objExp.push(-1);
    }
    //Revenue Analysis section -- end
    objPLDashboard["PA"] = objProfitAnalysis;
    objPLDashboard["RA"] = objRA;
    objPLDashboard["EA"] = objExp;
    objPLDashboard["PEx"] = objPresentMonthExpDetails;
    objPLDashboard["LEx"] = objPastMonthExpDetails;
    objPLDashboard["PEr"] = objPresentMonthErngDetails;
    objPLDashboard["LEr"] = objPastMonthErngDetails;
    res.status(200).json(objPLDashboard);
  });
});

//The API will be used by Admin to insert earnings and expense details
//for the particular month.
router.post("/plinputs", (req, res) => {
  let { insId, year, month, type } = req.body;
  let input = JSON.parse(req.body.input);
  //Type will let us know whether it is expense or earning, that has been
  //entered by admin.
  PLCenter.findOne({ insId: insId, year: year }).then((plDetails) => {
    let arrMonth = [];
    if (plDetails == null) {
      while (arrMonth.length < month - 1) {
        //Assign default values till month index reaches
        let objMonth = {};
        let arrBatchFeeCollected = [];
        let objBatchFeeCollected = {};
        let instiFeeCollected = 0;
        let monthyExp = 0;
        let monthlyErngs = 0;
        let PL = 0;
        let arrExpnese = [];
        let objExpense = {};
        let arrEarnings = [];
        let objEarnings = [];

        arrBatchFeeCollected.push(objBatchFeeCollected);
        arrEarnings.push(objEarnings);
        arrExpnese.push(objExpense);

        objMonth["batchFeeCollected"] = arrBatchFeeCollected;
        objMonth["instiFeeCollected"] = instiFeeCollected;
        objMonth["monthyExp"] = monthyExp;
        objMonth["monthlyErngs"] = monthlyErngs;
        objMonth["PL"] = PL;
        objMonth["expense"] = arrExpnese;
        objMonth["earnings"] = arrEarnings;

        arrMonth.push(objMonth);
      }
      //For the current month in which fees came.
      let objMonth = {};
      objMonth["monthyExp"] = 0;
      objMonth["monthlyErngs"] = 0;
      objMonth["instiFeeCollected"] = 0;
      objMonth["PL"] = 0;
      //objMonth["batchFeeCollected"] = [{}];
      objMonth["batchFeeCollected"] = [];
      for (let i = 0; i < input.length; i++) {
        if (type == "Er") {
          objMonth["monthlyErngs"] += Number(input[i].amt);
          objMonth["PL"] += Number(input[i].amt);
        } else if (type == "Ex") {
          objMonth["monthyExp"] += Number(input[i].amt);
          objMonth["PL"] -= Number(input[i].amt);
        }
      }

      if (type == "Er") {
        // objMonth["expense"] = [{}];
        objMonth["expense"] = [];
        objMonth["earnings"] = input;
      } else if (type == "Ex") {
        // objMonth["earnings"] = [{}];
        objMonth["earnings"] = [];
        objMonth["expense"] = input;
      }

      arrMonth.push(objMonth);

      const pl = new PLCenter({
        insId: insId,
        year: year,
        month: arrMonth,
      });

      pl.save().then((response) => {
        if (type == "Ex") {
          res.status(200).json({
            flag: 1,
            data: response.month[month - 1].expense,
            msg: "Details submitted successfully.",
          });
        } else if (type == "Er") {
          res.status(200).json({
            flag: 1,
            data: response.month[month - 1].earnings,
            msg: "Details submitted successfully.",
          });
        }
      });
    } else {
      //If mont data exist in our database
      if (plDetails.month.length >= month) {
        for (let i = 0; i < input.length; i++) {
          if (type == "Er") {
            plDetails.month[month - 1].monthlyErngs += Number(input[i].amt);
            plDetails.month[month - 1].PL += Number(input[i].amt);
            plDetails.month[month - 1].earnings.push(input[i]);
          } else if (type == "Ex") {
            plDetails.month[month - 1].monthlyExp += Number(input[i].amt);
            plDetails.month[month - 1].PL -= Number(input[i].amt);
            plDetails.month[month - 1].expense.push(input[i]);
          }
        }
      } else {
        while (plDetails.month.length < month - 1) {
          //Assign default values till month index reaches
          let objMonth = {};
          let arrBatchFeeCollected = [];
          let objBatchFeeCollected = {};
          let instiFeeCollected = 0;
          let monthyExp = 0;
          let monthlyErngs = 0;
          let PL = 0;
          let arrExpnese = [];
          let objExpense = {};
          let arrEarnings = [];
          let objEarnings = [];

          arrBatchFeeCollected.push(objBatchFeeCollected);
          arrEarnings.push(objEarnings);
          arrExpnese.push(objExpense);

          objMonth["batchFeeCollected"] = arrBatchFeeCollected;
          objMonth["instiFeeCollected"] = instiFeeCollected;
          objMonth["monthyExp"] = monthyExp;
          objMonth["monthlyErngs"] = monthlyErngs;
          objMonth["PL"] = PL;
          objMonth["expense"] = arrExpnese;
          objMonth["earnings"] = arrEarnings;

          plDetails.month.push(objMonth);
        }

        //For the current month in which fees came.
        let objMonth = {};
        objMonth["monthyExp"] = 0;
        objMonth["monthlyErngs"] = 0;
        objMonth["instiFeeCollected"] = 0;
        objMonth["PL"] = 0;
        // objMonth["batchFeeCollected"] = [{}];
        objMonth["batchFeeCollected"] = [];
        for (let i = 0; i < input.length; i++) {
          if (type == "Er") {
            objMonth["monthlyErngs"] += Number(input[i].amt);
            objMonth["PL"] += Number(input[i].amt);
          } else if (type == "Ex") {
            objMonth["monthyExp"] += Number(input[i].amt);
            objMonth["PL"] -= Number(input[i].amt);
          }
        }

        if (type == "Er") {
          // objMonth["expense"] = [{}];
          objMonth["expense"] = [];
          objMonth["earnings"] = input;
        } else if (type == "Ex") {
          // objMonth["earnings"] = [{}];
          objMonth["earnings"] = [];
          objMonth["expense"] = input;
        }

        plDetails.month.push(objMonth);
      }

      PLCenter.findOneAndUpdate(
        { insId: insId, year: year },
        { month: plDetails.month },
        { new: true }
      )
        .then((response) => {
          if (type == "Er") {
            res.status(200).json({
              flag: 1,
              data: response.month[month - 1].earnings,
              msg: "Details submitted successfully.",
            });
          } else {
            res.status(200).json({
              flag: 1,
              data: response.month[month - 1].expense,
              msg: "Details submitted successfully.",
            });
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  });
});

//The API will be used to update earnings and expense details
//for the particular month
router.post("/plupdate", (req, res) => {
  let { insId, year, month, type, index } = req.body;
  let input = {};

  if ("input" in req.body) {
    input = JSON.parse(req.body.input);
  }

  //Check if object is not empty. If not empty, it is an update operation,
  //else delete operation.
  if (Object.keys(input).length === 0 && input.constructor === Object) {
    //Delete command here
    //Deleting element at array index is an open issue.
    //As soon as we can do it in one command, I will do it.
    PLCenter.findOne({ insId: insId, year: year })
      .then((plDetails) => {
        if (type == "Er") {
          //Subtract earnings money from PL and monthlyEarngs
          plDetails.month[month - 1].monthlyErngs -= Number(
            plDetails.month[month - 1].earnings[index].amt
          );
          plDetails.month[month - 1].PL -= Number(
            plDetails.month[month - 1].earnings[index].amt
          );
          plDetails.month[month - 1].earnings.splice(index, 1);
        } else if (type == "Ex") {
          //Subtract earnings money from PL and monthlyEarngs
          plDetails.month[month - 1].monthlyExp -= Number(
            plDetails.month[month - 1].expense[index].amt
          );
          plDetails.month[month - 1].PL += Number(
            plDetails.month[month - 1].expense[index].amt
          );
          plDetails.month[month - 1].expense.splice(index, 1);
        }
        PLCenter.findOneAndUpdate(
          { insId: insId, year: year },
          { month: plDetails.month },
          { new: true }
        ).then((plDetails) => {
          if (type == "Er") {
            res.status(200).json({
              flag: 1,
              data: plDetails.month[month - 1].earnings,
              msg: "Data deleted successfully",
            });
          } else if (type == "Ex") {
            res.status(200).json({
              flag: 1,
              data: plDetails.month[month - 1].expense,
              msg: "Data deleted successfully",
            });
          }
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(200).json(errorMsg);
      });
  } else {
    //Update command here, when input is there, we will update the data
    PLCenter.findOne({ insId: insId, year: year })
      .then((plDetails) => {
        if (type == "Er") {
          //Subtract earnings money from PL and monthlyEarngs
          plDetails.month[month - 1].monthlyErngs +=
            Number(input[0].amt) -
            Number(plDetails.month[month - 1].earnings[index].amt);

          plDetails.month[month - 1].PL +=
            Number(input[0].amt) -
            Number(plDetails.month[month - 1].earnings[index].amt);

          plDetails.month[month - 1].earnings[index] = input[0];
        } else if (type == "Ex") {
          //Subtract earnings money from PL and monthlyEarngs
          plDetails.month[month - 1].monthlyExp +=
            Number(input[0].amt) -
            Number(plDetails.month[month - 1].expense[index].amt);

          plDetails.month[month - 1].PL +=
            Number(plDetails.month[month - 1].expense[index].amt) -
            Number(input[0].amt);
          plDetails.month[month - 1].expense[index] = input[0];
        }
        PLCenter.findOneAndUpdate(
          { insId: insId, year: year },
          { month: plDetails.month },
          { new: true }
        ).then((plDetails) => {
          if (type == "Er") {
            res.status(200).json({
              flag: 1,
              data: plDetails.month[month - 1].earnings,
              msg: "Data Updated successfully",
            });
          } else if (type == "Ex") {
            res.status(200).json({
              flag: 1,
              data: plDetails.month[month - 1].expense,
              msg: "Data Updated successfully",
            });
          }
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(200).json(errorMsg);
      });
  }
});

//The API will be used to broadcast messages to teachers
//Admin can broadcast to Teachers
router.post("/broadcast", (req, res) => {
  let { msg, teachers, adminNm, adminId, insNm } = req.body;
  //will write the logic of broadcasting to msgs to teachers -- here

  console.log(req.body);

  //Send to the teacher present in the sIds array
  res.status(200).json({
    flag: 1,
    msg: "Appropriate person(s) have been informed.",
  });
});

//The function will be used to just blindly fetch PL details
//from our mongoDB
const FetchPLInfo = (insId, month, curentYear, lastYear) => {
  return new Promise((resolve, reject) => {
    //Since sesssion is from Apr - Mar. So when
    //month less than 3 means, current month will be Jan, Feb, March.
    //It means for the institue to create the dashboard we have to query previous
    //year details as well.
    if (month < 4) {
      PLCenter.find({
        insId: insId,
        year: { $in: [curentYear, lastYear] },
      })
        .then((response) => {
          return resolve(response);
        })
        .catch((err) => {
          console.log(err);
          return reject(err);
        });
    } else {
      PLCenter.find({ insId: insId, year: curentYear })
        .then((response) => {
          return resolve(response);
        })
        .catch((err) => {
          console.log(err);
          return reject(err);
        });
    }
  });
};

//The function will be used to remove the batch details from teacher
//and also create the logs of the same, update the batch details in new teacher
const UnlinkTeacherFromBatch = (
  bId,
  insId,
  tId,
  oldTId,
  oldTNm,
  adminNm,
  bNm,
  joinBatchDt,
  insNm
) => {
  //Remove the batch details from the teacher.
  Teacher.findOneAndUpdate(
    { tId: oldTId },
    {
      $pull: {
        "insti.$[i].bIds": { bId: bId },
      },
    },
    {
      arrayFilters: [{ "i.insId": insId }],
      multi: true,
    }
  ).then((response) => {
    //We will be logging the delinking information here.

    for (let i = 0; i < response.insti.length; i++) {
      if (response.insti[i].insId == insId) {
        for (let b = 0; b < response.insti[i].bIds.length; b++) {
          if (response.insti[i].bIds[b].bId == bId) {
            //Maintain logs of deleted teacher
            let epochJoinBatchDt = response.insti[i].bIds[b].joinBatchDt;
            const instiMappingWIthExTeachers = new InstiMappingWithExTeachers({
              tId: oldTId,
              insId: insId,
              bId: bId,
              batchJoiningDt: epochJoinBatchDt,
              batchLeavingDt: Math.trunc(new Date().getTime() / 1000),
            });

            instiMappingWIthExTeachers.save().catch((err) => {
              console.log(err);
            });

            //Save the insti details in new teacher as well and inform her via mail.
            //Now simultaneously we will store these batches details in the Teacher collection
            Teacher.updateOne(
              { tId: tId },
              {
                $push: {
                  "insti.$[i].bIds": {
                    bId: bId,
                    joinBatchDt: joinBatchDt,
                  },
                },
              },
              {
                arrayFilters: [{ "i.insId": mongoose.Types.ObjectId(insId) }],
              }
            )
              .then((teacher) => {
                User.findOne({ _id: tId })
                  .then((user) => {
                    SendMail(
                      user.email,
                      teacherAddedToBatchSub
                        .replace("#Batch", bNm)
                        .replace("#Insti", insNm),
                      teacherAddedToBatchBody
                        .replace("#Batch", bNm)
                        .replace("#Insti", insNm)
                        .replace("#Admin", adminNm)
                    );
                  })
                  .catch((err) => console.log(err));
              })
              .catch((err) => {
                console.log(err);
              });
            // }
            // );
          }
        }
        break;
      }
    }
  });
};

//The function will validate the batch name while renaming the batch
const validateBatchNm = (insId, bId, nm) => {
  return new Promise((resolve, reject) => {
    //No two batches in the insti can have same name.
    //So we will first verify the name of the batch and if it good then we
    //will proceed to add the batch
    let batchProjection = {
      insti: false,
      cDt: false,
      mDt: false,
      __v: false,
      updatedTimings: false,
      updatedDt: false,
    };

    Batch.find({ insti: insId }, batchProjection).then((batches) => {
      for (let b = 0; b < batches.length; b++) {
        if (batches[b]._id != bId) {
          //Two batches cannot have same name.
          if (batches[b].nm == nm) {
            return reject(
              "Batch with the name, " +
                nm +
                " already exist. Request you to enter unique Batch Name."
            );
          }
        }
      }
      return resolve("Nm is unique");
    });
  });
};

//The below function will be used to validate batch timing of the teacher.
//In case teacher already teaches at same time, it will return an error msg
const validateBatchTimings = (tId, tNm, insId, timings, bId) => {
  return new Promise((resolve, reject) => {
    Batch.find({ insti: insId, teacher: tId }).then((batches) => {
      for (let b = 0; b < batches.length; b++) {
        if (batches[b]._id != bId) {
          let addBatch = true;
          //Also the same teacher cannot take different batches at same time
          let errorMsg =
            "Teacher, " +
            tNm +
            " takes " +
            batches[b].sub +
            " class of batch, " +
            batches[b].nm +
            " on ";
          let timingsMatched = batches[b].timings.map((item, i) => {
            if (item == "-1" && timings[i] == "-1") return false;
            let arrExistingBatchTime = String(item).split("-"); //Array will store start and end time of existing batch
            let arrNewBatchTime = String(timings[i]).split("-");
            //Start time of new batch falls between existing batch times
            if (
              arrNewBatchTime[0].trim() > arrExistingBatchTime[0].trim() &&
              arrNewBatchTime[0].trim() < arrExistingBatchTime[1].trim()
            ) {
              return true;
            }
            //End time of new batch falls between existing batch times
            if (
              arrNewBatchTime[1].trim() > arrExistingBatchTime[0].trim() &&
              arrNewBatchTime[1].trim() < arrExistingBatchTime[1].trim()
            ) {
              return true;
            }
            //Start time of existing batch falls between new batch times
            if (
              arrExistingBatchTime[0].trim() > arrNewBatchTime[0].trim() &&
              arrExistingBatchTime[0].trim() < arrNewBatchTime[1].trim()
            ) {
              return true;
            }
            //End time of new existing batch falls between new batch times
            if (
              arrExistingBatchTime[1].trim() > arrNewBatchTime[0].trim() &&
              arrExistingBatchTime[1].trim() < arrNewBatchTime[1].trim()
            ) {
              return true;
            }
            return item == timings[i];
          });
          for (let r = 0; r < timingsMatched.length; r++) {
            if (timingsMatched[r]) {
              addBatch = false;
              switch (r) {
                case 0:
                  errorMsg += "sunday, ";
                  break;
                case 1:
                  errorMsg += "monday, ";
                  break;
                case 2:
                  errorMsg += "tuesday, ";
                  break;
                case 3:
                  errorMsg += "wednesday, ";
                  break;
                case 4:
                  errorMsg += "thursday, ";
                  break;
                case 5:
                  errorMsg += "friday, ";
                  break;
                case 6:
                  errorMsg += "saturday, ";
                  break;
              }
            }
          }
          if (!addBatch) {
            errorMsg = errorMsg.slice(0, -2) + " at same time.";
            return reject(errorMsg);
          }
        }
      }
      return resolve("Done");
    });
  });
};

//The Admin has the provision to delete the batch as well
//Copy entire data of batch in history table and store the same before deleting them from main collections
//In this we will unlink the batch from teachers & students
router.post("/deletebatch", (req, res) => {
  let batchId = req.body.batchId;
});

//The API will be used to add the teacher in the institute
//This will be used by admin
//insId
router.post("/addteachers", (req, res) => {
  let insId = req.body.insId;
  let insNm = req.body.insNm;
  let teachersObject = JSON.parse(req.body.teachers);
  let adminNm = req.body.adminNm;

  //Loop through teachers array. Teachers array will have objects containing name of teacher, number, email
  //Now we add using the below steps.
  //1. Check whether we have the below teacher added in our system.
  //If yes, we will inform teacher with the mail that you have been added in the institute.
  //If no, we will first add the user and save its details in the system and then inform the teacher about the same through mail.

  //Loop through teachers array to get individual teacher
  // for (let t = 0; t < teachersArray.length; t++) {
  User.findOne({ cNo: teachersObject.cNo })
    .then((user) => {
      //If user exist in the system.
      //Check for its role, whether it is something other than teacher.
      //If yes assign the new role teacher to user
      if (user) {
        if (user.role.includes("T")) {
          //Check whether following teacher is already added in institute.
          //If yes send admin an update that teacher is already added in the system.
          Institute.findOne({ _id: insId })
            .populate("teachers", "cNo")
            .then((instiDetails) => {
              let teacherAlreadyExistInInsti = false;
              for (let t = 0; t < instiDetails.teachers.length; t++) {
                if (instiDetails.teachers[t].cNo == teachersObject.cNo) {
                  teacherAlreadyExistInInsti = true;
                  break;
                }
              }
              if (teacherAlreadyExistInInsti) {
                res.status(200).json({
                  flag: 0,
                  msg: "Teacher already exist in the institute",
                });
              } else {
                //Now update the mapping of teacher with the institute and update the teacher via mail
                Teacher.findOneAndUpdate(
                  { tId: user._id },
                  {
                    $push: {
                      insti: {
                        insId: insId,
                        joinDt: teachersObject.joinDt,
                        sub: teachersObject.subjects,
                        bIds: [],
                      },
                    },
                  }
                )
                  .then((teacher) => {
                    //Add the teacher details to institute as well
                    Institute.findOneAndUpdate(
                      { _id: insId },
                      { $push: { teachers: user._id } }
                    )
                      .then((institute) => {
                        //Send the mail to teacher informing her about the addition in intitute.
                        SendMail(
                          user.email,
                          teacherAddedSub.replace("#Insti", insNm),
                          teacherAddedBody
                            .replace("#Insti", insNm)
                            .replace("#Admin", adminNm)
                        );
                        res.status(200).json({
                          flag: 1,
                          msg: "Teachers added successfully in the institute.",
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
              }
            })
            .catch((err) => {
              console.log(err);
              res.status(200).json(errorMsg);
            });
        } else {
          //Add the role teacher to the user and inform teacher about the addition
          user.role.push("T");
          user
            .save()
            .then((user) => {
              MapTeacherToInsti(
                insId,
                teachersObject.joinDt,
                user,
                adminNm,
                insNm,
                teachersObject.subjects
              )
                .then((response) => {
                  res.status(200).json(response);
                })
                .catch((err) => {
                  console.log(err);
                  res.status(200).json(err);
                });
            })
            .catch((err) => {
              console.log(err);
              res.status(200).json(errorMsg);
            });
        }
      } else {
        //When the teacher doesn't exist in the system. First create it's account and then map inti with it
        GenerateRandomPwd().then((pwd) => {
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(pwd, salt, (err, hash) => {
              const user = new User({
                cNo: teachersObject.cNo,
                email: teachersObject.email,
                nm: teachersObject.nm,
                role: ["T"],
                pwd: hash,
              });
              //Save this teacher in our database and on success, send the password to teahcer,
              //informing him of his account creation.
              user.save().then((user) => {
                //Send the mail to the teacher informing him that his account is created and that he can login
                //to the account
                MapTeacherToInsti(
                  insId,
                  teachersObject.joinDt,
                  user,
                  adminNm,
                  insNm,
                  teachersObject.subjects
                )
                  .then((response) => {
                    res.status(200).json(response);
                  })
                  .catch((err) => {
                    console.log(err);
                    res.status(200).json(err);
                  });
                SendMail(
                  user.email,
                  accountCreatedSub,
                  accountCreatedBody
                    .replace("Student", "Teacher")
                    .replace("#UserId", user.cNo)
                    .replace("#UserPassword", pwd)
                );
              });
            });
          });
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(200);
    });
  // }
});

//The API will give admin the privilege to delete teacher from
//his insti, after she has left. Before removing any teacher from the institute
//we will ask admin to unlink him/her to the batches.
router.post("/removeteachers", (req, res) => {
  let { insId, tId } = req.body;
  Teacher.findOne({ tId: tId, "insti.insId": insId }, { "insti.$": 1 }).then(
    (response) => {
      if (response.insti[0].bIds.length > 0) {
        res.status(200).json({
          flag: 0,
          msg:
            "The Teacher is associated with the batches. Request you to unlink them before removing the teacher",
        });
      } else {
        //Delete Institute details from Teachers.
        Teacher.findOneAndUpdate(
          {
            tId: tId,
          },
          {
            $pull: {
              insti: { insId: insId },
            },
          },
          {
            multi: true,
          }
        )
          .then((response) => {
            //Create the logs of the teacher that has been removed from the institute
            let insJoinDt = response.insti[0].joinDt;
            const instiMappingWithTeacher = new InstiMappingWithExTeachers({
              tId: tId,
              insId: insId,
              instiJoiningDt: insJoinDt,
              instiLeavingDt: Math.trunc(new Date().getTime() / 1000),
            });

            instiMappingWithTeacher.save().catch((err) => {
              console.log(err);
            });
          })
          .catch((err) => {
            console.log(err);
          });

        //Delete Teacher details from Institutes.
        Institute.updateOne(
          { _id: insId },
          { $pull: { teachers: tId } },
          {
            multi: true,
          }
        ).catch((err) => {
          console.log(err);
        });

        res.json({ flag: 1, msg: "Teacher have been successfully removed" });
      }
    }
  );
});

//The API will be used by admin to fetch the students
//whose fees need to be entered in the system.
//The API will also send him the batch fees plans that was set
//by him earlier.
router.post("/getstudentsforfees", (req, res) => {
  let { insId } = req.body;
  InputStudentFees.find({ insId: insId }, " -pId -insId -dt -_id -__v")
    .populate("sId", "nm cNo email")
    .populate("bId", "sub nm")
    .populate("batchFeePlan", "feePlans -_id")
    .then((obj) => {
      if (obj.length > 0) {
        let data = [];
        for (let o = 0; o < obj.length; o++) {
          let objData = {};
          objData.student = {
            id: obj[o].sId._id,
            nm: obj[o].sId.nm,
            cNo: obj[o].sId.cNo,
            email: obj[o].sId.email,
            batchJoiningDt: obj[o].batchJoiningDt,
          };
          objData.batch = {
            id: obj[o].bId._id,
            nm: obj[o].bId.nm + " - " + obj[o].bId.sub.join(","),
            feePlan: obj[o].batchFeePlan.feePlans,
          };
          data.push(objData);
        }
        res.status(200).json({
          flag: 1,
          data,
        });
      } else {
        res.status(200).json({
          flag: 1,
          msg: "No such student exist",
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be used to calculate the fees info of student based on the Admin Inputs.
//Will return the Fee breakage to admin and once admin validates it, we store the same
//in our job.
//This will be done by Admin of institute.
router.post("/validatefeeinfo", (req, res) => {
  let {
    fromDt,
    totalMonths,
    periodicMonths,
    feeInstallment,
    batchFee,
    feeDiscount,
  } = req.body;

  let epochFromDt = fromDt;

  let arrFeeData = [];
  let m = Number(periodicMonths);
  let dt = new Date(Number(epochFromDt) * 1000);
  let totalDiscount = 0; //Used to calculate total discount offered by Institute to Student.
  //If the total months for which the student is enrolled is exactly divisible by periodic months
  //Then fee installment will remail same.
  if (totalMonths % periodicMonths == 0) {
    while (Number(totalMonths) >= m) {
      let objFee = {};
      objFee.feeDt =
        dt.getDate() + "-" + (dt.getMonth() + 1) + "-" + dt.getFullYear();
      objFee.feeInstallment = Number(feeInstallment);
      objFee.feeDiscount = Math.trunc(
        (feeDiscount * objFee.feeInstallment) / 100
      );
      totalDiscount += objFee.feeDiscount;
      objFee.totalFee = objFee.feeInstallment - objFee.feeDiscount;

      arrFeeData.push(objFee);

      //Incrementing periodic months and fromDt -- start
      m += Number(periodicMonths);
      dt.setMonth(dt.getMonth() + Number(periodicMonths));
      epochFromDt = dt.getTime() / 1000;
      //Incrementing periodic months and fromDt -- end
    }
  } else {
    //If the total months for which the student is enrolled is not exactly divisible by periodic months
    //Then fee installment will differ for last time duration and will be the ratio of time spend by student in Institute.
    while (Number(totalMonths) > m) {
      let objFee = {};
      objFee.feeDt =
        dt.getDate() + "-" + (dt.getMonth() + 1) + "-" + dt.getFullYear();
      objFee.feeInstallment = Number(feeInstallment);
      objFee.feeDiscount = Math.trunc(
        (feeDiscount * objFee.feeInstallment) / 100
      );
      objFee.totalFee = objFee.feeInstallment - objFee.feeDiscount;
      totalDiscount += objFee.feeDiscount;
      arrFeeData.push(objFee);

      //Incrementing periodic months and fromDt -- start
      m += Number(periodicMonths);
      dt.setMonth(dt.getMonth() + Number(periodicMonths));
      epochFromDt = dt.getTime() / 1000;
      //Incrementing periodic months and fromDt -- end
    }
    //This is the case when installment amount will differ.
    let objFee = {};
    objFee.feeDt =
      dt.getDate() + "-" + (dt.getMonth() + 1) + "-" + dt.getFullYear();
    objFee.feeInstallment = Math.trunc(
      (feeInstallment * (totalMonths % periodicMonths)) / periodicMonths
    );
    objFee.feeDiscount = Math.trunc(
      (feeDiscount * objFee.feeInstallment) / 100
    );
    totalDiscount += objFee.feeDiscount;
    objFee.totalFee = objFee.feeInstallment - objFee.feeDiscount;
    arrFeeData.push(objFee);
  }

  //Compute the batch Fee, total Discount, total fee that student will pay during his association with institute.
  res.status(200).json({
    flag: 1,
    data: {
      feeInstallmentInfo: arrFeeData,
      feePlan: {
        month: Number(periodicMonths),
        installment: Number(feeInstallment),
        fee: Number(batchFee),
      },
      batchFee: Number(batchFee),
      discount: totalDiscount,
      totalFee: batchFee - totalDiscount,
    },
  });
});

//The API will be used to record fee Info of student in the system.
//Will receive the student fee info data and store the same in our system.
//so that appropriate reminders will be send to student/parents.
router.post("/enterfeeinfo", (req, res) => {
  //studentFeeInfo is an array contains array of student fees Info
  let studentFeeInfo = JSON.parse(req.body.studentFeeInfo);
  let feePlan = JSON.parse(req.body.feePlan);
  let { sId, insId, bId } = req.body;
  let arrBatchFeeInfo = [];
  let arrDt = [];

  studentFeeInfo.map((feeInfo) => {
    arrDt.push(feeInfo.feeDt.replace("-", "").replace("-", ""));
  });

  let arrEpochDt = arrDt;
  //Fees Information can have max two years in student array Info,
  let initialYear = Number(studentFeeInfo[0].feeDt.split("-")[2]);
  for (let f = 0; f < studentFeeInfo.length; f++) {
    let currentYear = Number(studentFeeInfo[f].feeDt.split("-")[2]);
    if (initialYear == currentYear) {
      let feeInfo = {};
      while (
        arrBatchFeeInfo.length <
        Number(studentFeeInfo[f].feeDt.split("-")[1]) - 1
      ) {
        let feeInfo = {};
        feeInfo.fee = -1;
        feeInfo.discount = -1;
        feeInfo.scholarship = -1;
        feeInfo.fine = -1;
        feeInfo.totalFee = -1;
        feeInfo.dueDt = -1;
        feeInfo.paidDt = -1;
        feeInfo.paidMethod = "";
        feeInfo.isPaid = false;
        arrBatchFeeInfo.push(feeInfo);
      }
      feeInfo.fee = studentFeeInfo[f].feeInstallment;
      feeInfo.discount = studentFeeInfo[f].feeDiscount;
      feeInfo.scholarship = 0;
      feeInfo.fine = 0;
      feeInfo.totalFee = studentFeeInfo[f].totalFee;
      feeInfo.dueDt = arrEpochDt[f];
      feeInfo.paidDt = -1;
      feeInfo.paidMethod = "";
      feeInfo.isPaid = false;
      arrBatchFeeInfo.push(feeInfo);
    } else {
      //Save the last array batch Info for previous year and reset array and prepare it for new year.
      StudentWiseFee.findOneAndUpdate(
        {
          sId: sId,
          insId: insId,
          year: initialYear,
        },
        {
          $push: {
            bIds: {
              bId: bId,
              feeInfo: arrBatchFeeInfo,
              feePlan: feePlan,
            },
          },
        },
        { upsert: true }
      ).catch((err) => {
        console.log(err);
      });

      //Reset Batch Info Error
      arrBatchFeeInfo = [];

      let feeInfo = {};
      while (
        arrBatchFeeInfo.length <
        Number(studentFeeInfo[f].feeDt.split("-")[1]) - 1
      ) {
        let feeInfo = {};
        feeInfo.fee = -1;
        feeInfo.discount = -1;
        feeInfo.scholarship = -1;
        feeInfo.fine = -1;
        feeInfo.totalFee = -1;
        feeInfo.dueDt = -1;
        feeInfo.paidDt = -1;
        feeInfo.paidMethod = "";
        feeInfo.isPaid = false;
        arrBatchFeeInfo.push(feeInfo);
      }
      feeInfo.fee = studentFeeInfo[f].feeInstallment;
      feeInfo.discount = studentFeeInfo[f].feeDiscount;
      feeInfo.scholarship = 0;
      feeInfo.fine = 0;
      feeInfo.totalFee = studentFeeInfo[f].totalFee;
      feeInfo.dueDt = arrEpochDt[f];
      feeInfo.paidDt = -1;
      feeInfo.paidMethod = "";
      feeInfo.isPaid = false;

      arrBatchFeeInfo.push(feeInfo);

      initialYear = Number(studentFeeInfo[f].feeDt.split("-")[2]);
    }
  }

  //Save the student Fee Information here.
  StudentWiseFee.findOneAndUpdate(
    {
      sId: sId,
      insId: insId,
      year: initialYear,
    },
    {
      $push: {
        bIds: {
          bId: bId,
          feeInfo: arrBatchFeeInfo,
          feePlan: feePlan,
        },
      },
    },
    { upsert: true }
  )
    .then((response) => {
      //Delete the same from Input Student Fees collection and update the Admin that fees information has been updated.
      InputStudentFees.findOneAndDelete({
        sId: sId,
        insId: insId,
        bId: bId,
      }).catch((err) => {
        console.log(err);
      });
      res.status(200).json({
        flag: 1,
        msg: "Fees Details Updated Successfully",
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

//The API will tell admin that these students are saying that they have paid the fee.
//Request you to check it and verfiy it.
router.post("/verifyfeeinfo", (req, res) => {
  let { insId } = req.body;
  ValidateStudentFees.find(
    { insId: insId },
    "pId sId discount fee totalFee scholarship fine paidMethod paidDt dueDt txnId"
  )
    .populate("sId", "cNo email nm")
    .populate("bId", "nm sub")
    .then((studentFees) => {
      let arrStudentFeesObj = [];
      for (let s = 0; s < studentFees.length; s++) {
        let studentFeesObj = {};
        studentFeesObj.pId = studentFees[s].pId;
        studentFeesObj.sId = studentFees[s].sId._id;
        studentFeesObj.sNm = studentFees[s].sId.nm;
        studentFeesObj.sEmail = studentFees[s].sId.email;
        studentFeesObj.sCNo = studentFees[s].sId.cNo;
        studentFeesObj.bId = studentFees[s].bId._id;
        studentFeesObj.bNm =
          studentFees[s].bId.nm + " - " + studentFees[s].bId.sub.join(",");
        studentFeesObj.fee = studentFees[s].fee;
        studentFeesObj.discount = studentFees[s].discount;
        studentFeesObj.scholarship = studentFees[s].scholarship;
        studentFeesObj.fine = studentFees[s].fine;
        studentFeesObj.totalFee = studentFees[s].totalFee;
        studentFeesObj.dueDt = studentFees[s].dueDt;
        studentFeesObj.paidDt = studentFees[s].paidDt;
        studentFeesObj.paidMethod = studentFees[s].paidMethod;
        studentFeesObj.txnId = studentFees[s].txnId;
        arrStudentFeesObj.push(studentFeesObj);
      }
      res.status(200).json({
        flag: 1,
        data: arrStudentFeesObj,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be used by admin to approve the fee submit info of the student.
//He will say whether e has received the fee or not. In case, he hasn't then notification will
//be send to parent/student informing them about the same.
router.post("/approvefeeinfo", (req, res) => {
  let {
    sId,
    bId,
    insId,
    pId,
    fee,
    discount,
    scholarship,
    fine,
    totalFee,
    paidDt,
    paidMethod,
    isPaid,
    dueDt,
    txnId,
    epochDueDt,
  } = req.body;

  let sts = 1;

  let epochPaidDt = paidDt;

  if (String(isPaid) == "true") {
    //Admin has received the fee, update the details in the student fee details
    StudentWiseFee.findOneAndUpdate(
      {
        insId: insId,
        year: Number(dueDt.split("-")[2]),
        sId: sId,
      },
      {
        $set: {
          "bIds.$[b].feeInfo.$[f].isPaid": isPaid,
          "bIds.$[b].feeInfo.$[f].txnId": txnId,
          "bIds.$[b].feeInfo.$[f].paidDt": epochPaidDt,
          "bIds.$[b].feeInfo.$[f].paidMethod": paidMethod,
        },
      },
      {
        arrayFilters: [{ "b.bId": bId }, { "f.dueDt": epochDueDt }],
        multi: true,
      }
    ).then((response) => {
      res.status(200).json({
        flag: 1,
        msg: "Fee details updated successfully",
      });
    });

    //Log the received fee infomation in the plcenter, so that admin can see later on
    //while calculating profit and loss.
    AddFeePLCenter(
      Number(paidDt.split("-")[1]) - 1,
      Number(String(paidDt.split("-")[2]).split(" ")[0]),
      insId,
      bId,
      totalFee
    );
  } else {
    //Admin is saying he hasn't received any fee, so he is rejecting the submit details.
    //Inform parents/students about the same.
    sts = 0;

    res.status(200).json({
      flag: 1,
      msg: "Fee details updated successfully",
    });
  }

  //Delete from the Validate Student Fees Collection and add the data in Fee txn Collection
  ValidateStudentFees.findOneAndDelete({
    sId: sId,
    insId: insId,
    bId: bId,
    dueDt: dueDt,
  }).catch((err) => {
    console.log(err);
  });

  //Add txn details in fee txn details collection
  const feeTxnDetails = new FeeTxnDetails({
    sId,
    pId,
    insId,
    bId,
    fee,
    discount,
    scholarship,
    fine,
    totalFee,
    dueDt: epochDueDt,
    paidDt: epochPaidDt,
    paidMethod,
    isPaid,
    txnId,
    sts,
  });

  feeTxnDetails.save().catch((err) => {
    console.log(err);
  });
});

//The API will be sending the details of students(fees delayed) to admin
router.post("/getduefeedetails", (req, res) => {
  //Right now I am hard coding the data, as this data will be cooked by job.
  res.status(200).json({
    flag: 1,
    data: [
      {
        sId: "5e44f183b26a8736acda83fa",
        sNm: "Student 1",
        pId: "5e444553332ed10b4449459f",
        sEmail: "sourabh.axestrack@gmail.com",
        sCNo: "7703934715",
        bId: "5e444d3f37d6f12430533cf9",
        bNm: "Batch 1 - Maths",
        fee: 2300,
        discount: 230,
        scholarship: 0,
        fine: 0,
        totalFee: 2070,
        dueDt: "1-7-2019",
      },
      {
        sId: "5e44f259f053cf3d2c889de4",
        sNm: "Student 2",
        pId: "5e444553332ed10b4449459f",
        sEmail: "sourabh.axestrack@gmail.com",
        sCNo: "7703934716",
        bId: "5e444d3f37d6f12430533cf9",
        bNm: "Batch 1 - Maths",
        fee: 2300,
        discount: 230,
        scholarship: 0,
        fine: 0,
        totalFee: 2070,
        dueDt: "1-10-2019",
      },
    ],
  });
});

//The API will be used to approve the due fees of the parent and
//update the same in database.
router.post("/approveduefees", (req, res) => {
  let {
    sId,
    bId,
    insId,
    pId,
    fee,
    discount,
    scholarship,
    fine,
    totalFee,
    dueDt,
    epochDueDt,
  } = req.body;

  let sts = 1;
  let epochPaidDt = Math.trunc(new Date().getTime() / 1000);

  //Admin has received the fee, update the details in the student fee details
  StudentWiseFee.findOneAndUpdate(
    {
      insId: insId,
      year: Number(dueDt.split("-")[2]),
      sId: sId,
    },
    {
      $set: {
        "bIds.$[b].feeInfo.$[f].isPaid": true,
        "bIds.$[b].feeInfo.$[f].txnId": " ",
        "bIds.$[b].feeInfo.$[f].paidDt": epochPaidDt,
        "bIds.$[b].feeInfo.$[f].paidMethod": "NA",
      },
    },
    {
      arrayFilters: [{ "b.bId": bId }, { "f.dueDt": epochDueDt }],
      multi: true,
    }
  ).then((response) => {
    res.status(200).json({
      flag: 1,
      msg: "Fee details updated successfully",
    });
  });

  //Add txn details in fee txn details collection
  const feeTxnDetails = new FeeTxnDetails({
    sId,
    pId,
    insId,
    bId,
    fee,
    discount,
    scholarship,
    fine,
    totalFee,
    dueDt: epochDueDt,
    paidDt: epochPaidDt,
    paidMethod: "NA",
    isPaid: true,
    txnId: " ",
    sts,
  });

  feeTxnDetails.save().catch((err) => {
    console.log(err);
  });

  //Log the received fee infomation in the plcenter, so that admin can see later on
  //while calculating profit and loss.

  AddFeePLCenter(
    new Date().getMonth(),
    new Date().getFullYear(),
    insId,
    bId,
    totalFee
  );
});

//The API is responsible for preparing the dashboard data of the
//instructor management dashboard in our system
router.post("/instructor", (req, res) => {
  let { insId } = req.body;

  Institute.findOne({ _id: insId }, "teachers -_id").then((response) => {
    Teacher.find({ tId: { $in: response.teachers } }, "-cDt -mDt -_id")
      .populate("tId", "nm cNo email")
      .populate("insti.bIds.bId", "_id nm  timings student sub cDt")
      .then((teachersInfo) => {
        let arrTeachers = [];
        teachersInfo.map((info) => {
          let teacherObj = {};
          teacherObj["tId"] = info.tId._id;
          teacherObj["tNm"] = info.tId.nm;
          teacherObj["cNo"] = info.tId.cNo;
          teacherObj["email"] = info.tId.email;
          teacherObj["subs"] = [];
          info.insti.map((insDetails) => {
            if (insDetails.insId == insId) {
              if (insDetails.bIds.length > 0) {
                let arrBatches = [];
                insDetails.bIds.map((batch) => {
                  let batchObj = {};
                  batchObj["bId"] = batch.bId._id;
                  batchObj["bNm"] = batch.bId.nm;
                  batchObj["timings"] = batch.bId.timings;
                  batchObj["students"] = batch.bId.student.length;
                  batchObj["bCDt"] = batch.bId.cDt;
                  batchObj["batchJoiningDt"] = batch.joinBatchDt;

                  //Check for sub in array
                  batch.bId.sub.map((sub) => {
                    if (!teacherObj["subs"].includes(sub))
                      teacherObj["subs"].push(sub);
                  });

                  arrBatches.push(batchObj);
                });
                teacherObj["batches"] = arrBatches;
              } else teacherObj["batches"] = [];
            }
          });

          arrTeachers.push(teacherObj);
        });

        res.status(200).json({ flag: 1, data: arrTeachers });
      });
  });
  // res.status(200).json({
  //   flag: 1,
  //   data: [
  //     {
  //       tId: "5e444a5937d6f12430533cf5",
  //       tNm: "Teacher 1",
  //       cNo: 9599333635,
  //       email: "sourabh.axestrack@gmail.com",
  //       subs: ["Maths", "Science"],
  //       batches: [
  //         {
  //           bId: "5e444d3f37d6f12430533cf9",
  //           bNm: "Batch 1 - Maths",
  //           timings: [
  //             "-1",
  //             "-1",
  //             "19:00 - 20:00",
  //             "-1",
  //             "19:00 - 20:00",
  //             "-1",
  //             "19:00 - 20:00",
  //           ],
  //           attendance: 89,
  //           students: 3,
  //           bCDt: "13-02-2020",
  //           batchJoiningDt: "13-02-2020",
  //         },
  //         {
  //           bId: "5e444d6837d6f12430533cfb",
  //           bNm: "Batch 2 - Maths",
  //           timings: [
  //             "-1",
  //             "-1",
  //             "20:00 - 21:00",
  //             "-1",
  //             "20:00 - 21:00",
  //             "-1",
  //             "20:00 - 21:00",
  //           ],
  //           students: 12,
  //           attendance: 89,
  //           bCDt: "13-02-2020",
  //           batchJoiningDt: "13-02-2020",
  //         },
  //       ],
  //       students: 15,
  //       attendance: 89,
  //       performance: 1,
  //     },
  //     {
  //       tId: "5dd17e9b0b1fdf258c36b388",
  //       tNm: "Teacher 2",
  //       cNo: 9599333636,
  //       email: "sourabh.axestrack@gmail.com",
  //       subs: ["Maths"],
  //       batches: [
  //         {
  //           bId: "5e444a6637d6f12430533cf7",
  //           bNm: "Batch 3 - Science",
  //           timings: [
  //             "-1",
  //             "-1",
  //             "19:00 - 20:00",
  //             "-1",
  //             "19:00 - 20:00",
  //             "-1",
  //             "19:00 - 20:00",
  //           ],
  //           students: 2,
  //           attendance: 89,
  //           bCDt: "13-02-2020",
  //           batchJoiningDt: "13-02-2020",
  //         },
  //       ],
  //       students: 2,
  //       attendance: 89,
  //       performance: 0,
  //     },
  //   ],
  // });
});

//The API will be used to batch dashboard of and institute.
router.post("/batch", (req, res) => {
  let { insId } = req.body;
  let batchProjection = {
    __v: false,
    cDt: false,
    mDt: false,
    insti: false,
    updatedTimings: false,
    updatedDt: false,
  };

  let arrData = [];

  Batch.find({ insti: insId })
    .populate({ path: "fees", select: "feePlans" })
    .populate({ path: "teacher", select: "nm email cNo" })
    .exec(function (errors, batchDetails) {
      for (let b = 0; b < batchDetails.length; b++) {
        let data = {};
        data.id = batchDetails[b]._id;
        data.sub = batchDetails[b].sub;
        data.timings = batchDetails[b].timings;
        data.nm = batchDetails[b].nm;
        data.teachers = batchDetails[b].teacher;
        data.students = batchDetails[b].student.length;
        data.feePlan = batchDetails[b].fees.feePlans;
        arrData.push(data);
      }
      res.status(200).json({
        flag: 1,
        data: arrData,
      });
    });
});

//The function will map institute to teacher and inform then by sending the mail
const MapTeacherToInsti = (insId, joinDt, user, adminNm, insNm, subjects) => {
  return new Promise((resolve, reject) => {
    //We need to store teacher insti mapping in our system.
    const teacher = new Teacher({
      tId: user._id,
      insti: [
        {
          insId: insId,
          joinDt: joinDt,
          sub: subjects,
          bIds: [],
        },
      ],
    });

    teacher
      .save()
      .then((teacher) => {
        //Map Teacher to Institute as well
        Institute.findOneAndUpdate(
          { _id: insId },
          { $push: { teachers: user._id } }
        )
          .then((institute) => {
            //Send mail to teacher informing him about hi association with institute
            SendMail(
              user.email,
              teacherAddedSub.replace("#Insti", insNm),
              teacherAddedBody
                .replace("#Insti", insNm)
                .replace("#Admin", adminNm)
            );
            return resolve({
              flag: 1,
              msg: "Teachers added successfully in the institute.",
            });
          })
          .catch((err) => {
            console.log(err);
            res.status(200).json(errorMsg);
          });
      })
      .catch((err) => {
        console.log(err);
        return reject(errorMsg);
      });
  });
};

module.exports = router;
