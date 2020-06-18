const validator = require("validator");
const isEmpty = require("./is-empty");

module.exports.validateRegisterInput = (parent, cb) => {
  let errors = {};
  parent.email = !isEmpty(parent.email) ? parent.email : "";
  parent.cNo = !isEmpty(parent.cNo) ? parent.cNo : "";
  parent.pwd = !isEmpty(parent.pwd) ? parent.pwd : "";
  parent.cPwd = !isEmpty(parent.cPwd) ? parent.cPwd : "";
  parent.nm = !isEmpty(parent.nm) ? parent.nm : "";
  parent.addrs = !isEmpty(parent.addrs) ? parent.addrs : "";

  if (validator.isEmpty(parent.nm)) errors.nm = "Name is required";
  if (validator.isEmpty(parent.email)) errors.email = "Email Id is required";
  else if (!validator.isEmail(parent.email))
    errors.email = "Email Id is invalid";
  if (validator.isEmpty(parent.cNo)) errors.cNo = "Contact Number is required";
  else if (!validator.isMobilePhone(parent.cNo))
    errors.cNo = "Mobile Number is invalid";
  if (validator.isEmpty(parent.pwd)) errors.pwd = "Password is required";
  else if (!validator.isLength(parent.pwd, { min: 6, max: 15 }))
    errors.pwd = "Password field must be atleast 6 characters";
  if (validator.isEmpty(parent.cPwd))
    errors.cPwd = "Confirm Password is required";
  else if (!validator.equals(parent.pwd, parent.cPwd)) {
    errors.pwd = "Password must match the Confirm Password";
  }

  return cb({
    errors,
    isValid: isEmpty(errors)
  });
};
