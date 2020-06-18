const express = require("express");
const router = express.Router();

const StudentWiseAttendance = require("../../models/StudentWiseAttendance");
const BatchWiseAttendance = require("../../models/BatchWiseAttendance");
const BatchWiseSyllabus = require("../../models/BatchWiseSyllabus");
const Student = require("../../models/Student");

const { errorMsg } = require("../../config/keys");

var studentWiseAttendanceProjection = {
  dt: false,
  _id: false,
  pId: false,
  sId: false,
  insId: false,
  year: false,
  __v: false
};

var batchWiseAttendanceProjection = {
  dt: false,
  _id: false,
  bId: false,
  insId: false,
  year: false,
  __v: false
};

//This API will be used to fetch the attendance information
//of a student based on year, month, batch, institute.
router.post("/attendance", (req, res) => {
  //Current month attendance
  StudentWiseAttendance.findOne(
    {
      sId: req.body.sId,
      year: req.body.year,
      insId: req.body.insId
    },
    studentWiseAttendanceProjection
  )
    //.populate("bIds.bId")
    .then(sDetails => {
      let attendanceDetails = [];
      //sDetails.bIds is a month wise array which contains student attendance info
      //Pick the particular month information using an index

      //sDetails will be of the format
      //{ bIds: [ { month: [Array], bId: 5da07709b0718f3224684010 } ] }
      //First we have Batches array and in that we have month array of particular batch
      for (let i = 0; i < sDetails.bIds.length; i++) {
        //Fetch the batch wise information for particular batch
        BatchWiseAttendance.findOne(
          {
            year: req.body.year,
            insId: req.body.insId,
            bId: sDetails.bIds[i].bId
          },
          batchWiseAttendanceProjection
        )
          .then(bDetails => {
            let details = {};
            details["day"] = sDetails.bIds[i].month[req.body.month - 1].day;
            details["clsAttended"] =
              sDetails.bIds[i].month[req.body.month - 1].count;
            details["totalCls"] = bDetails.month[req.body.month - 1].count;
            details["maxClsAttended"] = bDetails.month[req.body.month - 1].max;
            details["minClsAttended"] = bDetails.month[req.body.month - 1].min;
            details["avgClsAttended"] = bDetails.month[req.body.month - 1].avg;
            attendanceDetails.push(details);

            if (i == sDetails.bIds.length - 1)
              res.status(200).json({
                flag: 1,
                data: attendanceDetails,
                msg: "Attendance details sent successfully"
              });
          })
          .catch(err => {
            console.log(err);
            res.status(200).json(errorMsg);
          });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

//THe API will be used to fetch the syllabus infromation
//of a institute based on the studentId, institute and batc
router.post("/syllabus", (req, res) => {
  let studentProjection = {
    _id: false,
    sId: false,
    cDt: false,
    mDt: false,
    pId: false,
    __v: false
  };
  //Find out the batch of the student in the current Institute
  Student.findOne({ sId: req.body.sId }, studentProjection)
    .then(instiDetails => {
      let syllabusDetails = [];
      for (let i = 0; i < instiDetails.insti.length; i++) {
        //Student can be studying in multiple institutes.
        //So now I need to find the batch of th institute user has asked for
        //That is why comparing insti Ids
        if (instiDetails.insti[i].insId == req.body.insId) {
          //Now we are getting batch array like ["5da07709b0718f3224684010"]
          let batchSyllabusProjection = {
            _id: false,
            bId: false,
            insId: false,
            year: false,
            dt: false,
            __v: false
          };
          for (let k = 0; k < instiDetails.insti[i].bId.length; k++) {
            //Let us find now the syllabus details of the Batch
            BatchWiseSyllabus.findOne(
              {
                bId: instiDetails.insti[i].bId[k],
                insId: req.body.insId,
                year: req.body.year
              },
              batchSyllabusProjection
            )
              .then(batchDetails => {
                let details = {};
                details["sub"] = batchDetails.sub;
                details["chapters"] = batchDetails.chapters;
                syllabusDetails.push(details);
                if (k == syllabusDetails.length - 1) {
                  //Send the response to user
                  res.status(200).json({
                    flag: 1,
                    data: syllabusDetails,
                    msg: "Syllabus details sent successfully"
                  });
                }
              })
              .catch(err => {
                console.log(err);
                res.status(200).json(errorMsg);
              });
          }
        }
      }
    })
    .catch(err => {
      console.log(err);
      res.status(200).json(errorMsg);
    });
});

router.post("/performance", (req, res) => {
  res.status(200).json({
    msg: "Performance"
  });
});

module.exports = router;
