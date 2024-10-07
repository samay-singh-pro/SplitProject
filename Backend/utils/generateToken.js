import jwt from "jsonwebtoken";
const generateToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "1d",
  });
};

export default generateToken;
