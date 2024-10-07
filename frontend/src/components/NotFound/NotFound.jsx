import React from "react";
import notFound from "../../assets/NotFound.svg";
import "./NotFound.scss";

const NotFound = () => {
  return (
    <div className="not-found">
      <img src={notFound} alt="" />
    </div>
  );
};

export default NotFound;
