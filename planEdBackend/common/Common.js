const nodemailer = require("nodemailer");
const PLCenter = require("../models/PLCenter");

module.exports.GenerateOTP = () => {
  return new Promise((resolve, reject) => {
    let digits = "123456789";
    let OTP = "";
    for (let i = 0; i < 4; i++) {
      OTP += digits[Math.floor(Math.random() * digits.length)];
    }
    return resolve(OTP);
  });
};

//Function will be used to generate the random password
//of 12 alphabets
module.exports.GenerateRandomPwd = () => {
  return new Promise((resolve, reject) => {
    let uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let lowercase = "abcdefghijklmnopqrstuvwxyz";
    let numbers = "123456789";
    let symbols = "!\"#$%&'()*+,-./:;<=>?@^[\\]^_`{|}~";
    let alphabets = uppercase + lowercase + symbols + numbers;
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += alphabets[Math.floor(Math.random() * alphabets.length)];
    }
    return resolve(pwd);
  });
};

module.exports.SendMail = (to, subject, body) => {
  return new Promise((resolve, reject) => {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "noreply.planed@gmail.com",
        pass: "planEd34194pWQ@419",
      },
    });

    let mailOptions = {
      from: "noreply.planed@gmail.com",
      to: to,
      subject: subject,
      html: body,
    };

    transporter.sendMail(mailOptions, function (err, info) {
      if (err) {
        return reject(err);
      } else {
        return resolve(info.response);
      }
    });
  });
};

module.exports.SendError = (res) => {
  res.status(200).json({
    err: "An error has occured. Request you to try after sometime.",
  });
};

//The function will be used to update the PL Center dynamics
//Log the received fee infomation in the plcenter, so that admin can see later on
//while calculating profit and loss.
module.exports.AddFeePLCenter = (monthIndex, year, insId, bId, totalFee) => {
  try {
    let arrMonth = [];
    PLCenter.findOne({ insId: insId, year: year }).then((response) => {
      //meaning first entry for the institute
      if (response == null) {
        while (arrMonth.length < monthIndex) {
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
        objMonth["batchFeeCollected"] = [{ bId: bId, fee: totalFee }];
        objMonth["instiFeeCollected"] = totalFee;
        objMonth["monthyExp"] = 0;
        objMonth["monthlyErngs"] = 0;
        objMonth["PL"] = totalFee;
        objMonth["expense"] = [{}];
        objMonth["earnings"] = [{}];
        arrMonth.push(objMonth);

        const pl = new PLCenter({
          insId: insId,
          year: year,
          month: arrMonth,
        });

        pl.save().catch((err) => {
          console.log(err);
        });
      } else {
        //Check the month index exists or not. In case it exists, update values there.
        //Else enter a new month index. and do it.
        let batchExist = 0;
        if (response.month.length >= monthIndex + 1) {
          response.month[monthIndex].instiFeeCollected =
            Number(response.month[monthIndex].instiFeeCollected) +
            Number(totalFee);
          response.month[monthIndex].PL =
            Number(response.month[monthIndex].PL) + Number(totalFee);

          for (
            let b = 0;
            b < response.month[monthIndex].batchFeeCollected.length;
            b++
          ) {
            if (bId == response.month[monthIndex].batchFeeCollected[b].bId) {
              response.month[monthIndex].batchFeeCollected[b].fee =
                Number(response.month[monthIndex].batchFeeCollected[b].fee) +
                Number(totalFee);
              batchExist = 1;
              break;
            }
          }
          if (batchExist == 0) {
            //New batch Entry
            response.month[monthIndex].batchFeeCollected.push({
              bId: bId,
              fee: totalFee,
            });
          }
        } else {
          //Till the month create dummies ... if required and update the response
          while (response.month.length < monthIndex) {
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

            response.month.push(objMonth);
          }
          //For the current month in which fees came.
          let objMonth = {};
          objMonth["batchFeeCollected"] = [{ bId: bId, fee: totalFee }];
          objMonth["instiFeeCollected"] = totalFee;
          objMonth["monthyExp"] = 0;
          objMonth["monthlyErngs"] = 0;
          objMonth["PL"] = totalFee;
          objMonth["expense"] = [{}];
          objMonth["earnings"] = [{}];
          response.month.push(objMonth);
        }

        PLCenter.updateOne(
          { insId: insId, year: year },
          { month: response.month }
        ).catch((err) => {
          console.log(err);
        });
      }
    });
  } catch (err) {
    console.log(err);
  }
};

module.exports.GetCurrentDate = () => {
  return new Promise((resolve, reject) => {
    let dt = new Date();
    let zoneOffset = dt.getTimezoneOffset();
    zoneOffset = 0; //bcz our server is showing time in gmt and its zoneoffset is -120.
    // dt = new Date(dt.getTime() + (zoneOffset + 330) * 60 * 1000);
    return resolve(dt);
  });
};
