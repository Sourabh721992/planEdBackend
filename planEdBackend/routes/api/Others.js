const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");

const InstiAdvertising = require("../../models/InstiAdvertising");

//The API will be used by teacer to upload contents for the batch -- start
//Specify the destination of the uploaded files
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let path =
      "/home/drogon/insImages/" + req.body.insNm.trim().replace(/ +/g, "");
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
    cb(null, file.originalname.trim().replace(/ +/g, ""));
  },
});

var upload = multer({ storage: storage });

router.post(
  "/instiadvertisinglink",
  upload.single("file"),
  (req, res, next) => {
    let file = req.file;
    let fileName = file.originalname;
    let instiAdvertising = new InstiAdvertising({
      insNm: req.body.insNm,
      insAddress: req.body.insAddress,
      teacherNm: req.body.teacherNm,
      subject: req.body.subject,
      tagline: req.body.tagline,
      mobile: req.body.mobile,
      email: req.body.email,
      image:
        "/home/drogon/insImages/" +
        req.body.insNm.trim().replace(/ +/g, "") +
        "/" +
        fileName.trim().replace(/ +/g, ""),
    });

    instiAdvertising.save().then((instiDetails) => {
      res.status(200).json({
        flag: 1,
        msg: "https://planed.in/login/" + instiDetails._id,
      });
    });
  }
);

router.post("/insitinfo", (req, res) => {
  console.log(req.body);
  InstiAdvertising.findOne({ _id: req.body.insId }).then((instiInfo) => {
    res.status(200).json({
      flag: 1,
      data: instiInfo,
    });
  });
});

router.get("/instibanner", (req, res) => {
  res.sendFile(req.query.path);
});

module.exports = router;
