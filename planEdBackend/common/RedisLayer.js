var redis = require("redis");

var redisClient = redis.createClient({
  port: 6001,
  host: "127.0.0.1",
  password: "pass4Red15",
});

redisClient.on("connect", function () {
  try {
    console.log("Redis client connected");
  } catch (error) {}
});

redisClient.on("error", function (err) {
  console.log("[" + new Date().toLocaleString() + "]  BC! f****d Up" + err);
});

module.exports.CheckKeyExists = (redisKey, cb) => {
  redisClient.exists(redisKey, function (err, obj) {
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
  redisClient.zadd(zSetKey, zScore, zval);
};

module.exports.DeleteRedisKey = (redisKey, cb) => {
  redisClient.del(String(redisKey), function (err, obj) {
    if (!err) {
      return cb(obj);
    } else {
      console.log(
        "[" + new Date().toLocaleString() + "]  DeleteRedisKey: " + err
      );
    }
  });
};

module.exports.SetHashSetInRedis = (hashKey, hashField, hashVal, cb) => {
  redisClient.hmset(hashKey, hashField, hashVal);
};

//The function will fetch the hash fields data
module.exports.FetchHashSetFields = (redisKey, hashFields, cb) => {
  redisClient.hmget(redisKey, hashFields, function (err, obj) {
    if (!err) {
      return cb(obj);
    } else {
      console.log(
        "[" + new Date().toLocaleString() + "]  FetchHashSetFields: " + err
      );
    }
  });
};

//Fetch all hashFields from redis
module.exports.FetchHashSet = (redisKey, cb) => {
  redisClient.hgetall(redisKey, function (err, obj) {
    if (!err) {
      return cb(obj);
    } else {
      console.log(
        "[" + new Date().toLocaleString() + "]  FetchHashSet: " + err
      );
    }
  });
};

module.exports.PublishData = (channelNm, data) => {
  try {
    pubIMEICookedData.PUBLISH(channelNm, data, function (err, reply) {});
  } catch (error) {
    console.log(
      "[" + new Date().toLocaleString() + "]  PublishIMEILiveData: " + err
    );
  }
};
