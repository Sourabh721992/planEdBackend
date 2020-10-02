const fcmAdmin = require("firebase-admin");
const HashMap = require("hashmap");
const serviceAccount = require("../config/Fcm.json");
const { fcmDatabase } = require("../config/keys");
const UserFcm = require("../models/UserFcm");

var hashUserFcmIdsMapping = new HashMap();

fcmAdmin.initializeApp({
  credential: fcmAdmin.credential.cert(serviceAccount),
  databaseURL: fcmDatabase,
});

//Get all the FCM Ids from the database when the server starts
module.exports.FetchFcmIdsFromDb = () => {
  UserFcm.find({})
    .then((usersFcmIdsMapping) => {
      for (let u = 0; u < usersFcmIdsMapping.length; u++) {
        let arrUserFcmIds = [];
        for (let r = 0; r < usersFcmIdsMapping[u].regIds.length; r++) {
          let objUserFcmId = {};
          objUserFcmId["fcmId"] = usersFcmIdsMapping[u].regIds[r].fcmId;
          objUserFcmId["platform"] = usersFcmIdsMapping[u].regIds[r].platform;

          arrUserFcmIds.push(objUserFcmId);
        }

        hashUserFcmIdsMapping.set(
          String(usersFcmIdsMapping[u].uId),
          arrUserFcmIds
        );
      }
    })
    .catch((err) => {
      console.log(err);
    });
};

module.exports.SaveUserFcmIds = (
  uId,
  fcmId,
  imei,
  platform,
  version,
  versionNo
) => {
  //Check if the fcmId exist in the hashMap or not
  if (typeof hashUserFcmIdsMapping.get(String(uId)) != "undefined") {
    let arrFcmIds = hashUserFcmIdsMapping.get(String(uId));
    let isFound = false;
    for (let f = 0; f < arrFcmIds.length; f++) {
      if (fcmId == arrFcmIds[f].fcmId) {
        isFound = true;
        break;
      }
    }

    if (!isFound) {
      //Store the User FCM details in internal cache as well as in mongoDb
      let objUserFcmCache = {};
      objUserFcmCache["fcmId"] = fcmId;
      objUserFcmCache["platform"] = platform;
      arrFcmIds.push(objUserFcmCache);
      hashUserFcmIdsMapping.set(String(uId), arrFcmIds);

      let objUserFcm = {};
      objUserFcm["fcmId"] = fcmId;
      objUserFcm["imei"] = imei;
      objUserFcm["platform"] = platform;
      objUserFcm["version"] = version;
      objUserFcm["versionNo"] = versionNo;

      //Save the same in mongoDb as well
      UserFcm.findOneAndUpdate(
        { uId: uId },
        {
          $push: { regIds: objUserFcm },
        }
      ).catch((err) => {
        console.log(err);
      });
    }
  } else {
    //Store the User FCM details in internal cache as well as in mongoDb
    let arrFcmIds = [];
    let objUserFcmCache = {};
    objUserFcmCache["fcmId"] = fcmId;
    objUserFcmCache["platform"] = platform;
    arrFcmIds.push(objUserFcmCache);
    hashUserFcmIdsMapping.set(String(uId), arrFcmIds);

    let objUserFcm = {};
    objUserFcm["fcmId"] = fcmId;
    objUserFcm["imei"] = imei;
    objUserFcm["platform"] = platform;
    objUserFcm["version"] = version;
    objUserFcm["versionNo"] = versionNo;

    let arrFcm = [];
    arrFcm.push(objUserFcm);

    //Save the same in mongoDb as well
    let userFcm = new UserFcm({
      uId: uId,
      regIds: arrFcm,
    });

    userFcm.save().catch((err) => {
      console.log(err);
    });
  }
};

module.exports.RegisterForNotification = (
  uId,
  fcmId,
  imei,
  platform,
  version,
  versionNo
) => {
  return new Promise((resolve, reject) => {
    //Check if FCM Id exist. If yes, return it is registered.
    //Else, add it
    //Check if the fcmId exist in the hashMap or not
    if (typeof hashUserFcmIdsMapping.get(String(uId)) != "undefined") {
      let arrFcmIds = hashUserFcmIdsMapping.get(String(uId));
      let isFound = 0;
      for (let f = 0; f < arrFcmIds.length; f++) {
        if (fcmId == arrFcmIds[f].fcmId) {
          isFound = 1;
          break;
        }
      }

      if (isFound == 0) {
        //Store the User FCM details in internal cache as well as in mongoDb
        let objUserFcmCache = {};
        objUserFcmCache["fcmId"] = fcmId;
        objUserFcmCache["platform"] = platform;
        arrFcmIds.push(objUserFcmCache);
        hashUserFcmIdsMapping.set(String(uId), arrFcmIds);

        let objUserFcm = {};
        objUserFcm["fcmId"] = fcmId;
        objUserFcm["imei"] = imei;
        objUserFcm["platform"] = platform;
        objUserFcm["version"] = version;
        objUserFcm["versionNo"] = versionNo;

        //Save the same in mongoDb as well
        UserFcm.findOneAndUpdate(
          { uId: uId },
          {
            $push: { regIds: objUserFcm },
          }
        )
          .then((response) => {
            return resolve("Device registered successfully for notification");
          })
          .catch((err) => {
            console.log(err);
            return reject("Some error occured. Request you to try in sometime");
          });
      } else {
        return resolve("Device already registered for notifcation");
      }
    } else {
      //Store the User FCM details in internal cache as well as in mongoDb
      let arrFcmIds = [];
      let objUserFcmCache = {};
      objUserFcmCache["fcmId"] = fcmId;
      objUserFcmCache["platform"] = platform;
      arrFcmIds.push(objUserFcmCache);
      hashUserFcmIdsMapping.set(String(uId), arrFcmIds);

      let objUserFcm = {};
      objUserFcm["fcmId"] = fcmId;
      objUserFcm["imei"] = imei;
      objUserFcm["platform"] = platform;
      objUserFcm["version"] = version;
      objUserFcm["versionNo"] = versionNo;

      let arrFcm = [];
      arrFcm.push(objUserFcm);

      //Save the same in mongoDb as well
      let userFcm = new UserFcm({
        uId: uId,
        regIds: arrFcm,
      });

      userFcm
        .save()
        .then((response) => {
          return resolve("Device registered successfully for notification");
        })
        .catch((err) => {
          console.log(err);
          return reject("Some error occured. Request you to try in sometime");
        });
    }
  });
};

module.exports.DeregisterForNotification = (uId, platform, fcmId) => {
  //Remove the user from the internal cache as well as from the mongodb
  if (typeof hashUserFcmIdsMapping.get(String(uId)) != "undefined") {
    let arrRegIds = hashUserFcmIdsMapping.get(String(uId));
    let filteredArrRegIds = arrRegIds.filter((objFcmId) => {
      if (objFcmId.fcmId == fcmId && objFcmId.platform == platform) {
      } else return objFcmId;
    });

    hashUserFcmIdsMapping.set(String(uId), filteredArrRegIds);

    //remove the object from mongo db as well
    UserFcm.findOneAndUpdate(
      { uId: uId },
      {
        $pull: { regIds: { fcmId: fcmId, platform: platform } },
      }
    ).catch((err) => {
      console.log(err);
    });
  }
};

module.exports.sendNotification = (uId, title, body) => {
  //Get the fcmIds registered for the user
  if (typeof hashUserFcmIdsMapping.get(String(uId)) != "undefined") {
    let fcmIds = hashUserFcmIdsMapping.get(String(uId));
    let arrAndroidRegIds = [];

    for (let f = 0; f < fcmIds.length; f++) {
      if (fcmIds[f].platform == "android") {
        arrAndroidRegIds.push(fcmIds[f].fcmId);
      }
    }

    let dt = Math.trunc(new Date().getTime() / 1000);
    let obj = {};
    obj.dt = dt;
    obj.body = body;

    const message = {
      data: { title: title, body: JSON.stringify(obj) },
      tokens: arrAndroidRegIds,
    };
    fcmAdmin
      .messaging()
      .sendMulticast(message)
      .then((send) => {
        console.log(send);
      })
      .catch((err) => {
        console.log(err);
      });
  }
};

module.exports.sendTestNotification = (arrAndroidRegIds, title, body) => {
  const message = {
    data: { title: title, body: body },
    tokens: arrAndroidRegIds,
  };
  fcmAdmin
    .messaging()
    .sendMulticast(message)
    .then((send) => {
      console.log(send);
    })
    .catch((err) => {
      console.log(err);
    });
};
