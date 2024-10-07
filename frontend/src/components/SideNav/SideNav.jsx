import React from "react";
import "./SideNav.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faReceipt,
  faList,
  faCog,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";

const SideNav = ({ onNavClick }) => {
  return (
    <div className="nav-card">
      <div className="nav-item" onClick={() => onNavClick("AddGroup")}>
        <FontAwesomeIcon icon={faPlus} />
        <span className="nav-label">Add Group</span>
      </div>
      <div className="nav-item" onClick={() => onNavClick("Groups")}>
        <FontAwesomeIcon icon={faUsers} />
        <span className="nav-label">Groups</span>
      </div>
      <div className="nav-item" onClick={() => onNavClick("AddSplit")}>
        <FontAwesomeIcon icon={faReceipt} /> <FontAwesomeIcon icon={faPlus} />
        <span className="nav-label">Add Split</span>
      </div>
      <div className="nav-item" onClick={() => onNavClick("ViewSplits")}>
        <FontAwesomeIcon icon={faList} />
        <span className="nav-label">View Reports</span>
      </div>
      <div className="nav-item" onClick={() => onNavClick("ExpenseList")}>
        <FontAwesomeIcon icon={faCog} />
        <span className="nav-label">Expense List</span>
      </div>
    </div>
  );
};

export default SideNav;
