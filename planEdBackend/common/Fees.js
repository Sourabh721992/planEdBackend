const HashMap = require("hashmap");
const isEmpty = require("../validations/is-empty");
const redis = require("./RedisLayer");
const {
  RedisKeyGetAllInstiIds,
  RedisKeyInstiWiseDueFees,
} = require("../config/keys");
var hashInstiWiseDueFees = new HashMap();
var hashStudentDueFees = new HashMap();

module.exports.CreateFeeMap = () => {
  return new Promise((resolve, reject) => {
    hashInstiWiseDueFees.clear();
    hashStudentDueFees.clear();
    //Fetch all the institutes Ids from the redis
    redis.FetchStringSet("redisClient6002", RedisKeyGetAllInstiIds, function (
      strInstiIds
    ) {
      strInstiIds
        .slice(0, -1)
        .split(",")
        .map((instiId) => {
          //Fetch the due fees Info of the institutes from the redis
          redis.FetchHashSet(
            "redisClient6002",
            RedisKeyInstiWiseDueFees.replace("insId", instiId),
            function (arrObj) {
              let instiId = arrObj[0].replace("InstiDueFees: ", "");
              let instiWiseDueFees = arrObj[1];
              for (
                let i = 0, key = Object.keys(instiWiseDueFees);
                i < key.length;
                i++
              ) {
                let studentInfo = JSON.parse(instiWiseDueFees[key[i]]);
                //We will get student specific details at this level
                for (let b = 0; b < studentInfo.batchWiseDueFees.length; b++) {
                  //Batch specific Details at this level
                  let batchInfo = studentInfo.batchWiseDueFees[b];
                  //Due fees of student in a batch
                  for (
                    let f = 0;
                    f < studentInfo.batchWiseDueFees[b].feesInfo.length;
                    f++
                  ) {
                    let objStudentDueFees = {};
                    let studentDueFeeInfo =
                      studentInfo.batchWiseDueFees[b].feesInfo[f];
                    objStudentDueFees["sId"] = studentInfo.sId;
                    objStudentDueFees["sNm"] = studentInfo.sNm;
                    objStudentDueFees["pId"] = studentInfo.pId;
                    objStudentDueFees["sEmail"] = studentInfo.sEmail;
                    objStudentDueFees["sCNo"] = studentInfo.sCNo;
                    objStudentDueFees["bId"] = batchInfo.bId;
                    objStudentDueFees["bNm"] = batchInfo.bNm;
                    objStudentDueFees["fee"] = studentDueFeeInfo.fee;
                    objStudentDueFees["discount"] = studentDueFeeInfo.discount;
                    objStudentDueFees["scholarship"] =
                      studentDueFeeInfo.scholarship;
                    objStudentDueFees["fine"] = studentDueFeeInfo.fine;
                    objStudentDueFees["totalFee"] = studentDueFeeInfo.totalFee;
                    objStudentDueFees["dueDt"] = studentDueFeeInfo.dueDt;
                    objStudentDueFees["paidDt"] = studentDueFeeInfo.paidDt;
                    if (isEmpty(hashInstiWiseDueFees.get(instiId))) {
                      let arrDueFees = [];
                      arrDueFees.push(objStudentDueFees);
                      hashInstiWiseDueFees.set(instiId, arrDueFees);
                    } else {
                      hashInstiWiseDueFees.get(instiId).push(objStudentDueFees);
                    }

                    //Create the student wise due fees that he needs to pay
                    //Check we have any entry of student.
                    //Check whether student entry exist in Student Due Fees hash. If no, create the record for student
                    if (isEmpty(hashStudentDueFees.get(studentInfo.sId))) {
                      let objInstiWiseFees = {};
                      let arrStudentDueFees = [];
                      arrStudentDueFees.push(objStudentDueFees);

                      objInstiWiseFees[instiId] = arrStudentDueFees;
                      hashStudentDueFees.set(studentInfo.sId, objInstiWiseFees);
                    }
                    //If it exist, check whether student recird exist for the particular insti
                    else {
                      //Check entry of student fee record exist for insti. If no, feed the same
                      if (
                        isEmpty(
                          hashStudentDueFees.get(studentInfo.sId)[instiId]
                        )
                      ) {
                        //Add new insti object in the existing one
                        let objInstiWiseFees = hashStudentDueFees.get(
                          studentInfo.sId
                        );
                        let arrStudentDueFees = [];
                        arrStudentDueFees.push(objStudentDueFees);
                        objInstiWiseFees[instiId] = arrStudentDueFees;

                        hashStudentDueFees.set(
                          studentInfo.sId,
                          objInstiWiseFees
                        );
                      } else {
                        //If student fee record exist,
                        //Push the fee record in the old insti
                        hashStudentDueFees
                          .get(studentInfo.sId)
                          [instiId].push(objStudentDueFees);
                      }
                    }
                  }
                }
              }
            }
          );
        });
    });
    return resolve("Fee Map Created");
  });
};

module.exports.FetchInstiWiseDueFees = (insId) => {
  return new Promise((resolve, reject) => {
    if (isEmpty(hashInstiWiseDueFees.get(insId))) return resolve([]);
    else return resolve(hashInstiWiseDueFees.get(insId));
  });
};

module.exports.FetchStudentWiseDueFees = (sId, insId) => {
  return new Promise((resolve, reject) => {
    if (isEmpty(hashStudentDueFees.get(sId))) return resolve([]);
    else if (isEmpty(hashStudentDueFees.get(sId)[insId])) return resolve([]);
    else return resolve(hashStudentDueFees.get(sId)[insId]);
  });
};

module.exports.RemoveStudentDueFees = (
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
  epochDueDt
) => {
  let instiWiseDueFees = [];
  //Remove Due fee entry from instiduefees
  hashInstiWiseDueFees.get(insId).map((studentDueFees) => {
    if (studentDueFees.bId == bId && studentDueFees.dueDt == epochDueDt) {
      //Do Nothing
    } else {
      instiWiseDueFees.push(studentDueFees);
    }
  });

  hashInstiWiseDueFees.set(insId, instiWiseDueFees);

  //Remove due fee entry from hashStudentDueFeesInfo
  let studentWiseDueFees = [];
  hashStudentDueFees.get(sId)[insId].map((studentDueFees) => {
    if (studentDueFees.sId == sId && studentDueFees.dueDt == epochDueDt) {
      //Do Nothing
    } else {
      studentWiseDueFees.push(studentDueFees);
    }
  });

  hashStudentDueFees.get(sId)[insId] = studentWiseDueFees;

  //Update the student fees details in Redis
  redis.FetchHashSetFields(
    "redisClient6002",
    "InstiDueFees: " + insId,
    sId,
    function (studentDueFeeInfo) {
      //We will get student specific details at this level
      let studentInfo = JSON.parse(studentDueFeeInfo);
      for (let b = 0; b < studentInfo.batchWiseDueFees.length; b++) {
        //Batch specific Details at this level
        let batchInfo = studentInfo.batchWiseDueFees[b];
        //Due fees of student in a batch
        for (
          let f = 0;
          f < studentInfo.batchWiseDueFees[b].feesInfo.length;
          f++
        ) {
          let studentDueFeeInfo = studentInfo.batchWiseDueFees[b].feesInfo[f];
          if (studentDueFeeInfo.dueDt == epochDueDt && batchInfo.bId == bId) {
            studentInfo.batchWiseDueFees[b].feesInfo.splice(f, 1);
          }
        }
      }

      //Save the new student info info in the Redis.
      redis.SetHashSetInRedis(
        "redisClient6002",
        "InstiDueFees: " + insId,
        sId,
        JSON.stringify(studentInfo)
      );
    }
  );
};

module.exports.ChangeStudentFeePaidDt = (
  sId,
  insId,
  bId,
  paidDt,
  epochDueDt
) => {
  hashStudentDueFees.get(sId)[insId].map((studentDueFees) => {
    if (studentDueFees.bId == bId && studentDueFees.dueDt == epochDueDt) {
      studentDueFees.paidDt = Number(paidDt);
    }
  });

  //Update the student fees details in Redis
  redis.FetchHashSetFields(
    "redisClient6002",
    "InstiDueFees: " + insId,
    sId,
    function (studentDueFeeInfo) {
      //We will get student specific details at this level
      let studentInfo = JSON.parse(studentDueFeeInfo);
      for (let b = 0; b < studentInfo.batchWiseDueFees.length; b++) {
        //Batch specific Details at this level
        let batchInfo = studentInfo.batchWiseDueFees[b];
        //Due fees of student in a batch
        for (
          let f = 0;
          f < studentInfo.batchWiseDueFees[b].feesInfo.length;
          f++
        ) {
          let studentDueFeeInfo = studentInfo.batchWiseDueFees[b].feesInfo[f];
          if (studentDueFeeInfo.dueDt == epochDueDt && batchInfo.bId == bId) {
            studentInfo.batchWiseDueFees[b].feesInfo[f].paidDt = Number(paidDt);
          } else studentInfo.batchWiseDueFees[b].feesInfo[f].paidDt = -1;
        }
      }

      //Save the new student info info in the Redis.
      redis.SetHashSetInRedis(
        "redisClient6002",
        "InstiDueFees: " + insId,
        sId,
        JSON.stringify(studentInfo)
      );
    }
  );
};
