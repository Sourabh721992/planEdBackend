const express = require("express");
const mongoose = require("mongoose");
const bodyparser = require("body-parser");
const cors = require("cors");
const read = require("readline");
const redis = require("./common/RedisLayer");

const common = require("./routes/api/Common");
const users = require("./routes/api/User");
const parents = require("./routes/api/Parent");
const students = require("./routes/api/Student");
const teachers = require("./routes/api/Teacher");
const admins = require("./routes/api/Admin");
const others = require("./routes/api/Others");

const { FetchFcmIdsFromDb } = require("./common/Fcm");

const app = express();

//Config File
const { mongoURI } = require("./config/keys");

//Body parser middleware
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

app.use(cors());

//Routes of app
app.use("/api/common", common);
app.use("/api/users", users);
app.use("/api/parents", parents);
app.use("/api/students", students);
app.use("/api/teachers", teachers);
app.use("/api/admins", admins);
app.use("/api/others", others);

var main = () => {
  read
    .createInterface(process.stdin, process.stdout)
    .question("", function (inputData) {
      if (inputData === "e") {
        redis.UnsubscribeToChannels();
        setTimeout(function () {
          process.exit();
        }, 3000);
      } else {
        main();
      }
    });
};

main();

//Connect to mongoDb
mongoose
  .connect(mongoURI)
  .then(() => {
    console.log("MongoDb Connected");
    //Fetch User Fcm Ids for notifcation
    FetchFcmIdsFromDb();
  })
  .catch((err) => console.log(err));

const port = process.env.port || 5000;

app.listen(port, () => console.log(`Server running on port ${port}`));

// const { sendTestNotification } = require("./common/Fcm");
// let arrRegId = [
//   "d--vMSnWSr6U2Vld-8pjcg:APA91bFLeRiS8lqDFWo9CqmukQu3-xugzy__r9WNh7Zjzi-IaC9WsEiefAmBmia0cLEDHckGsU_0V56LGePa59fkDRvlwMqXpBso78bLstFLeqTftXsRmKX_sM1VIHtZ6ZsQoWqPChJK",
// ];
// let dt = Math.trunc(new Date().getTime() / 1000);
// let obj = {};
// obj.dt = 1594921761;
// obj.body = "slim shady";
// sendTestNotification(arrRegId, "Test title", JSON.stringify(obj));
