const express = require("express");
const { errorMsg } = require("../../config/keys");
const { GetCurrentDate } = require("../../common/Common");
const router = express.Router();
const Institute = require("../../models/Institute");
const School = require("../../models/Schools");
const Batch = require("../../models/Batch");
const Class = require("../../models/Class");
const BatchWiseMessage = require("../../models/BatchWiseMessage");
const LiveSession = require("../../models/LiveSession");
const Query = require("../../models/Query");

//The API will send the institute registered with our system.
router.post("/insti", (req, res) => {
  var instiProjection = {
    cNo: false,
    email: false,
    website: false,
    isActive: false,
    addrs: false,
    pincode: false,
    cDt: false,
    mDt: false,
    __v: false,
  };

  Institute.find({ isActive: true }, instiProjection)
    .maxTimeMS(100)
    .then((instis) => {
      res.status(200).json({
        flag: 1,
        data: instis,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be used to fetch the teachers details
//related to institute
router.post("/institeachers", (req, res) => {
  var teacherProjection = {
    admin: false,
    isActive: false,
    cDt: false,
    mDt: false,
    _id: false,
    nm: false,
    cNo: false,
    email: false,
    website: false,
    addrs: false,
    pincode: false,
    __v: false,
  };
  let insId = req.body.insId;
  Institute.findOne({ _id: insId }, teacherProjection)
    .populate("teachers", "nm")
    .then((teachers) => {
      res.status(200).json({
        flag: 1,
        data: teachers,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be used to fetch the batches \
//related to institute
router.post("/instibatches", (req, res) => {
  let insId = req.body.insId;
  let batchProjection = {
    cDt: false,
    mDt: false,
    insti: false,
    teacher: false,
    updatedTimings: false,
    updatedDt: false,
    __v: false,
  };

  Batch.find({ insti: insId }, batchProjection)
    .then((batches) => {
      let data = [];
      for (let b = 0; b < batches.length; b++) {
        let batch = {};
        batch.id = batches[b]._id;
        batch.nm = batches[b].nm + " - " + batches[b].sub.join(", ");
        batch.timings = batches[b].timings[new Date().getDay() - 1];
        data.push(batch);
      }
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

//The API will send the school information in our system
//to parent.
router.post("/school", (req, res) => {
  var schoolProjection = {
    cNo: false,
    email: false,
    website: false,
    isActive: false,
    addrs: false,
    pincode: false,
    cDt: false,
    mDt: false,
    __v: false,
  };

  School.find({ isActive: true }, schoolProjection)
    .maxTimeMS(100)
    .then((schools) => {
      res.status(200).json({
        flag: 1,
        data: schools,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be used by teacher and admin to get the batches
//and the students studying in the batches.
router.post("/batchstudents", (req, res) => {
  let batchId = req.body.batchId;
  Batch.findOne({ _id: batchId })
    .populate("student", "nm")
    .then((studentDetails) => {
      res.status(200).json({
        flag: 1,
        data: studentDetails.student,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will be sending the batch name, subject and, batch Id based
//on institute Id
router.post("/batch", (req, res) => {
  var batchProjection = {
    insti: false,
    teacher: false,
    timings: false,
    cDt: false,
    mDt: false,
    updatedTimings: false,
    updatedDt: false,
    __v: false,
  };
  Batch.find({ insti: req.body.insId }, batchProjection)
    .maxTimeMS(100)
    .then((batches) => {
      res.status(200).json({
        flag: 1,
        data: batches,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//The API will check the class name that exist in our system
//and send the same to user.
router.post("/class", (req, res) => {
  var classProjection = {
    __v: false,
  };
  Class.find({}, classProjection)
    .maxTimeMS(100)
    .then((classes) => {
      res.status(200).json({
        flag: 1,
        data: classes,
      });
    })
    .catch((err) => {
      res.status(200).json(errorMsg);
    });
});

//The API will be used by teacher/student/admin to check the content uploaded for the batch
//Can be used to check the batch content shared with students
router.post("/content", (req, res) => {
  let { insId } = req.body;
  let tId = "-1";
  let bId = "-1";
  let sId = "-1";
  if ("tId" in req.body) {
    tId = req.body.tId;
  }

  if ("bId" in req.body) {
    bId = req.body.bId;
  }

  if ("sId" in req.body) {
    sId = req.body.sId;
  }

  //Will be used by student
  if (sId != "-1") {
    if (bId != "-1") {
    } else {
      let arrBIds = [];
      Student.findOne({ sId: req.body.sId }).then((studentInsDetails) => {
        for (let i = 0; i < studentInsDetails.insti.length; i++) {
          if (studentInsDetails.insti[i].insId == insId) {
            for (let b = 0; b < studentInsDetails.insti[i].bIds.length; b++) {
              let bId = studentInsDetails.insti[i].bIds[b].bId;
              arrBIds.push(bId);
            }
          }
        }
        BatchWiseContent.find(
          { bId: { $in: arrBIds } },
          "fileNm description uploadedDt uploadedPath -_id",
          {
            sort: { uploadedDt: -1 },
          }
        )
          .populate("bId", "nm sub -_id")
          .then((batchContent) => {
            let arrWebObj = [];
            for (let b = 0; b < batchContent.length; b++) {
              let webObj = {};
              webObj["Batch Name"] =
                batchContent[b].bId.nm +
                " - " +
                batchContent[b].bId.sub.join(",");
              webObj["File"] = batchContent[b].fileNm;
              webObj["Description"] = batchContent[b].description;

              //Date from epoch time
              let dt = new Date(0);
              dt.setSeconds(Number(batchContent[b].uploadedDt));

              webObj["Date"] = GetCurrentDateInFormat(dt);

              webObj["Path"] = batchContent[b].uploadedPath;

              arrWebObj.push(webObj);
            }
            res.status(200).json({
              flag: 1,
              data: arrWebObj,
            });
          })
          .catch((err) => {
            console.log(err);
            res.status(200).json(errorMsg);
          });
      });
    }
  } else if (tId != "-1") {
    if (bId != "-1") {
    } else {
      //Tis case will happen only from web
      BatchWiseContent.find(
        { tId: tId },
        "fileNm description uploadedDt uploadedPath -_id",
        {
          sort: { uploadedDt: -1 },
        }
      )
        .populate("bId", "nm sub -_id")
        .then((batchContent) => {
          let arrWebObj = [];
          for (let b = 0; b < batchContent.length; b++) {
            let webObj = {};
            webObj["Batch Name"] =
              batchContent[b].bId.nm +
              " - " +
              batchContent[b].bId.sub.join(",");
            webObj["File"] = batchContent[b].fileNm;
            webObj["Description"] = batchContent[b].description;

            //Date from epoch time
            let dt = new Date(0);
            dt.setSeconds(Number(batchContent[b].uploadedDt));

            webObj["Date"] = GetCurrentDateInFormat(dt);

            webObj["Path"] = batchContent[b].uploadedPath;

            arrWebObj.push(webObj);
          }
          res.status(200).json({
            flag: 1,
            data: arrWebObj,
          });
        })
        .catch((err) => {
          console.log(err);
          res.status(200).json(errorMsg);
        });
    }
  }
});

//The API will be used by teacher/student/admin to check the content uploaded for the batch
//Can be used to check the batch content shared with students
router.post("/message", (req, res) => {
  let tId = "-1";
  let bId = "-1";
  let sId = "-1";
  let insId = req.body.insId;
  if ("tId" in req.body) {
    tId = req.body.tId;
  }

  if ("bId" in req.body) {
    bId = req.body.bId;
  }

  if ("sId" in req.body) {
    sId = req.body.sId;
  }

  if (tId != "-1") {
    if (bId != "-1") {
    } else {
      //This case will happen only from web
      GetCurrentDate().then((dt) => {
        let epochTime = Math.trunc(dt.getTime() / 1000);
        let lastWeekEpochTime = epochTime - 7 * 24 * 60 * 60;
        BatchWiseMessage.find(
          { tId: tId, broadcastDt: { $gt: lastWeekEpochTime } },
          "message broadcastDt -_id",
          {
            sort: { broadcastDt: -1 },
          }
        )
          .limit(50)
          .populate("bId", "nm sub -_id")
          .then((batchContent) => {
            let arrWebObj = [];
            for (let b = 0; b < batchContent.length; b++) {
              let webObj = {};
              webObj["Batch Name"] =
                batchContent[b].bId.nm +
                " - " +
                batchContent[b].bId.sub.join(",");
              webObj["Message"] = batchContent[b].message;

              //Date from epoch time
              let dt = new Date(0);
              dt.setSeconds(Number(batchContent[b].broadcastDt));

              webObj["Date"] = GetCurrentDateInFormat(dt);

              arrWebObj.push(webObj);
            }
            res.status(200).json({
              flag: 1,
              data: arrWebObj,
            });
          })
          .catch((err) => {
            console.log(err);
            res.status(200).json(errorMsg);
          });
      });
    }
  } else if (sId != "-1") {
    if (bId != "-1") {
    } else {
      //This case will happen only from web
      GetCurrentDate().then((dt) => {
        let epochTime = Math.trunc(dt.getTime() / 1000);
        let lastWeekEpochTime = epochTime - 7 * 24 * 60 * 60;
        let arrBIds = [];
        Student.findOne({ sId: req.body.sId }).then((studentInsDetails) => {
          for (let i = 0; i < studentInsDetails.insti.length; i++) {
            if (studentInsDetails.insti[i].insId == insId) {
              for (let b = 0; b < studentInsDetails.insti[i].bIds.length; b++) {
                let bId = studentInsDetails.insti[i].bIds[b].bId;
                arrBIds.push(bId);
              }
            }
          }
          //This case will happen only from web
          GetCurrentDate().then((dt) => {
            let epochTime = Math.trunc(dt.getTime() / 1000);
            let lastWeekEpochTime = epochTime - 7 * 24 * 60 * 60;
            BatchWiseMessage.find(
              {
                bId: { $in: arrBIds },
                broadcastDt: { $gt: lastWeekEpochTime },
              },
              "message broadcastDt tNm -_id",
              {
                sort: { broadcastDt: -1 },
              }
            )
              .limit(20)
              .populate("bId", "nm sub -_id")
              .then((batchContent) => {
                let arrWebObj = [];
                for (let b = 0; b < batchContent.length; b++) {
                  let webObj = {};
                  webObj["Batch Name"] =
                    batchContent[b].bId.nm +
                    " - " +
                    batchContent[b].bId.sub.join(",");
                  webObj["Teacher Name"] = batchContent[b].tNm;
                  webObj["Message"] = batchContent[b].message;

                  //Date from epoch time
                  let dt = new Date(0);
                  dt.setSeconds(Number(batchContent[b].broadcastDt));

                  webObj["Date"] = GetCurrentDateInFormat(dt);

                  arrWebObj.push(webObj);
                }
                res.status(200).json({
                  flag: 1,
                  data: arrWebObj,
                });
              })
              .catch((err) => {
                console.log(err);
                res.status(200).json(errorMsg);
              });
          });
        });
      });
    }
  }
});

router.post("/livesession", (req, res) => {
  let tId = "-1";
  let sId = "-1";

  if ("tId" in req.body) {
    tId = req.body.tId;
  }

  if ("sId" in req.body) {
    sId = req.body.sId;
    //insId = req.body.insId;
  }

  if (tId != "-1") {
    //Get epoch time of 12 a.m today
    GetCurrentDate().then((dt) => {
      let nowEpochSec = Math.trunc(new Date().getTime() / 1000) + 330 * 60;
      let dt12Am = nowEpochSec - (nowEpochSec % 86400);
      console.log(dt12Am);
      LiveSession.find({
        tId: tId,
        dt: { $gt: Math.trunc(dt12Am.getTime() / 1000) },
      }).then((liveSession) => {
        let arrWebObj = [];
        for (let l = 0; l < liveSession.length; l++) {
          let webObj = {};

          webObj["sessionId"] = liveSession[l]._id;
          webObj["Timings"] =
            liveSession[l].startTime + " - " + liveSession[l].endTime;
          webObj["Batch Name"] = liveSession[l].bNm;
          webObj["Chapter"] = liveSession[l].chapter;
          webObj["Topic"] = liveSession[l].topic;
          webObj["Action"] = liveSession[l].started;

          arrWebObj.push(webObj);
        }
        res.status(200).json({
          flag: 1,
          data: arrWebObj,
        });
      });
    });
  } else if (sId != "-1") {
    let arrBatchIds = [];
    Student.findOne({ sId: req.body.sId }).then((studentInsDetails) => {
      GetCurrentDate().then((dt) => {
        for (let i = 0; i < studentInsDetails.insti.length; i++) {
          if (studentInsDetails.insti[i].insId == req.body.insId) {
            for (let b = 0; b < studentInsDetails.insti[i].bIds.length; b++) {
              let bId = studentInsDetails.insti[i].bIds[b].bId;
              arrBatchIds.push(bId);
            }

            let nowEpochSec =
              Math.trunc(new Date().getTime() / 1000) + 330 * 60;
            let dt12Am = nowEpochSec - (nowEpochSec % 86400);
            LiveSession.find({
              bId: { $in: arrBatchIds },
              dt: { $gt: Math.trunc(dt12Am.getTime() / 1000) },
            }).then((liveSession) => {
              let arrLiveSession = [];
              for (let l = 0; l < liveSession.length; l++) {
                let webObj = {};

                webObj["sessionId"] = liveSession[l]._id;
                webObj["Timings"] =
                  liveSession[l].startTime + " - " + liveSession[l].endTime;
                webObj["Batch Name"] = liveSession[l].bNm;
                webObj["Chapter"] = liveSession[l].chapter;
                webObj["Topic"] = liveSession[l].topic;
                webObj["Action"] = liveSession[l].started;

                arrLiveSession.push(webObj);
              }
              res.status(200).json({
                flag: 1,
                data: arrLiveSession,
              });
            });
          }
        }
      });
    });
  }
});

router.post("/query", (req, res) => {
  let { nm, cNo, email, query } = req.body;

  GetCurrentDate().then((dt) => {
    let objQuery = new Query({
      nm: nm,
      cNo: cNo,
      email: email,
      query: query,
      status: 0,
      assignedTo: "SK",
      dt: Math.trunc(dt.getTime() / 1000),
    });

    objQuery.save().then((response) => {
      res.status(200).json({
        flag: 1,
        msg:
          "Your query has been submitted successfully. Request you to wait for sometime. Our team will respond asap.",
      });
    });
  });
});

//The API will be used by user to download the content from the server.
router.post("/downloadcontent", (req, res) => {
  let { path } = req.body;
  try {
    let filePath = path;
    //"/root/sourabh" +
    // "/Content/" + insNm + "/" + year + "/" + bId + "/" + fileNm;
    res.download(filePath);
  } catch (err) {
    var fullUrl = req.originalUrl;
    console.log(fullUrl);
    console.log(req.body);
    console.log(err);
    res.status(200).json(errorMsg);
  }
});

//The API will be used to check respective profiles of the user
router.post("/profile", (req, res) => {
  let { uId, role } = req.body;
  if (role == "a") {
    //uild Admin Profile
  }
});

const GetCurrentDateInFormat = (dt) => {
  let currentDate = dt.getDate() + " ";

  //get Month
  switch (dt.getMonth()) {
    case 0:
      currentDate += "Jan, ";
      break;
    case 1:
      currentDate += "Feb, ";
      break;
    case 2:
      currentDate += "Mar, ";
      break;
    case 3:
      currentDate += "Apr, ";
      break;
    case 4:
      currentDate += "May, ";
      break;
    case 5:
      currentDate += "Jun, ";
      break;
    case 6:
      currentDate += "Jul, ";
      break;
    case 7:
      currentDate += "Aug, ";
      break;
    case 8:
      currentDate += "Sep, ";
      break;
    case 9:
      currentDate += "Oct, ";
      break;
    case 10:
      currentDate += "Nov, ";
      break;
    case 11:
      currentDate += "Dec, ";
      break;
  }

  currentDate += dt.getFullYear();
  return currentDate;
};

module.exports = router;
