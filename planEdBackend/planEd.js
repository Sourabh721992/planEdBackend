const express = require("express");
const mongoose = require("mongoose");
const bodyparser = require("body-parser");
const saslprep = require("saslprep");
const cors = require("cors");
const multer = require("multer");

const common = require("./routes/api/Common");
const users = require("./routes/api/User");
const parents = require("./routes/api/Parent");
const students = require("./routes/api/Student");
const teachers = require("./routes/api/Teacher");
const admins = require("./routes/api/Admin");

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

//Connect to mongoDb
mongoose
  .connect(mongoURI)
  .then(() => console.log("MongoDb Connected"))
  .catch((err) => console.log(err));

const port = process.env.port || 5000;

app.listen(port, () => console.log(`Server running on port ${port}`));
