var redis = require("redis");
var fees = require("./Fees");

var redisClient6001 = redis.createClient({
  port: 6001,
  host: "134.119.184.201",
  password: "pass4Red15",
});

var redisClientPubSub6001 = redis.createClient({
  port: 6001,
  host: "134.119.184.201",
  password: "pass4Red15",
});

var redisClient6002 = redis.createClient({
  port: 6002,
  host: "134.119.184.201",
  password: "pass4Red15",
});

redisClient6001.on("connect", function () {
  try {
    console.log("Redis client 6001 connected");
    SubscribeUpdateFeeMapChannel();
  } catch (error) {}
});

redisClient6002.on("connect", function () {
  try {
    //Built Insti wise and parent wise due fees structure
    fees.CreateFeeMap();
    console.log("Redis client 6002 connected");
  } catch (error) {
    console.log(error);
  }
});

redisClient6001.on("error", function (err) {
  console.log("[" + new Date().toLocaleString() + "]  BC! f****d Up" + err);
});

redisClient6002.on("error", function (err) {
  console.log("[" + new Date().toLocaleString() + "]  BC! f****d Up" + err);
});

module.exports.CheckKeyExists = (redisClient, redisKey, cb) => {
  redisClient6001.exists(redisKey, function (err, obj) {
    if (!err) {
      return cb(obj);
    } else {
      console.log(
        "[" + new Date().toLocaleString() + "]  CheckKeyExists: " + err
      );
    }
  });
};

module.exports.SetZsetInredis = (zSetKey, zScore, zval) => {
  redisClient6001.zadd(zSetKey, zScore, zval);
};

module.exports.DeleteRedisKey = (redisKey, cb) => {
  redisClient6001.del(String(redisKey), function (err, obj) {
    if (!err) {
      return cb(obj);
    } else {
      console.log(
        "[" + new Date().toLocaleString() + "]  DeleteRedisKey: " + err
      );
    }
  });
};

module.exports.SetHashSetInRedis = (
  redisClient,
  hashKey,
  hashField,
  hashVal,
  cb
) => {
  if (redisClient == "redisClient6002") {
    redisClient6002.hmset(hashKey, hashField, hashVal);
  } else redisClient6001.hmset(hashKey, hashField, hashVal);
};

module.exports.HashSetFieldExistOrNot = (
  redisClient,
  hashkey,
  hashField,
  cb
) => {
  if (redisClient == "redisClient6002") {
    redisClient6002.hexists(hashkey, hashField, function (err, obj) {
      if (!err) {
        return cb(obj);
      } else {
        console.log(
          "[" +
            new Date().toLocaleString() +
            "]  HashSetFieldExistOrNot: " +
            err
        );
      }
    });
  } else {
    redisClient6001.hexists(hashkey, hashField, function (err, obj) {
      if (!err) {
        return cb(obj);
      } else {
        console.log(
          "[" +
            new Date().toLocaleString() +
            "]  HashSetFieldExistOrNot: " +
            err
        );
      }
    });
  }
};

//The function will fetch the hash fields data
module.exports.FetchHashSetFields = (redisClient, redisKey, hashFields, cb) => {
  if (redisClient == "redisClient6002") {
    redisClient6002.hmget(redisKey, hashFields, function (err, obj) {
      if (!err) {
        return cb(obj);
      } else {
        console.log(
          "[" + new Date().toLocaleString() + "]  FetchHashSetFields: " + err
        );
      }
    });
  } else {
    redisClient6001.hmget(redisKey, hashFields, function (err, obj) {
      if (!err) {
        return cb(obj);
      } else {
        console.log(
          "[" + new Date().toLocaleString() + "]  FetchHashSetFields: " + err
        );
      }
    });
  }
};

//Fetch all hashFields from redis
module.exports.FetchHashSet = (redisClient, redisKey, cb) => {
  if (redisClient == "redisClient6002") {
    redisClient6002.hgetall(redisKey, function (err, obj) {
      if (!err) {
        let arrObj = [];
        arrObj.push(redisKey);
        arrObj.push(obj);
        return cb(arrObj);
      } else {
        console.log(
          "[" + new Date().toLocaleString() + "]  FetchHashSet: " + err
        );
      }
    });
  } else {
    redisClient6001.hgetall(redisKey, function (err, obj) {
      if (!err) {
        return cb(obj);
      } else {
        console.log(
          "[" + new Date().toLocaleString() + "]  FetchHashSet: " + err
        );
      }
    });
  }
};

//Fetch all hashFields from redis
module.exports.FetchStringSet = (redisClient, redisKey, cb) => {
  if (redisClient == "redisClient6002") {
    redisClient6002.get(redisKey, function (err, obj) {
      if (!err) {
        return cb(obj);
      } else {
        console.log(
          "[" + new Date().toLocaleString() + "]  FetchHashSet: " + err
        );
      }
    });
  } else {
    redisClient6001.get(redisKey, function (err, obj) {
      if (!err) {
        return cb(obj);
      } else {
        console.log(
          "[" + new Date().toLocaleString() + "]  FetchHashSet: " + err
        );
      }
    });
  }
};

module.exports.PublishData = (channelNm, data) => {
  try {
    redisClientPubSub6001.PUBLISH(channelNm, data, function (err, reply) {});
  } catch (error) {
    console.log(
      "[" + new Date().toLocaleString() + "]  PublishIMEILiveData: " + error
    );
  }
};

const SubscribeUpdateFeeMapChannel = () => {
  console.log("Subscribe Channel to Update Fee");
  redisClientPubSub6001.on("pmessage", function (pattern, channel, message) {
    try {
      //Create Fee Map Again
      fees.CreateFeeMap();
    } catch (error) {
      console.log(
        "[" + new Date().toLocaleString() + "]  SubscribeToChannels: " + err
      );
    }
  });
  redisClientPubSub6001.psubscribe(String("UpdateCycle"));
};

module.exports.UnsubscribeToChannels = () => {
  try {
    redisClientPubSub6001.punsubscribe("UpdateCycle", function (err, reply) {
      if (err) return cb(err);
      else return cb(reply);
    });

    console.log("[" + new Date().toLocaleString() + "]  " + "Bye folks");
  } catch (error) {
    console.log(
      "[" + new Date().toLocaleString() + "]  UnsubscribeToChannels: " + err
    );
  }
};
