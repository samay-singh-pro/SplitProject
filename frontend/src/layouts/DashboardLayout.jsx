import React, { useState } from "react";
import SideNav from "../components/SideNav/SideNav";
import Groups from "../components/Groups/Groups";
import "./DashboardLayout.scss";
import AddSplit from "../components/AddSplit/AddSplit";
import Expenses from "../components/Expenses/Expenses";
import ExpenseList from "../components/ExpenseList/expenseList";
import NewGroup from "../components/Groups/GroupsForm/newGroup";

const DashboardLayout = () => {
  const [activeComponent, setActiveComponent] = useState("AddSplit");

  const renderComponent = () => {
    switch (activeComponent) {
      case "AddGroup":
        return <NewGroup />;
      case "Groups":
        return <Groups />;
      case "AddSplit":
        return <AddSplit />;
      case "ViewSplits":
        return <Expenses />;
      case "ExpenseList":
        return <ExpenseList/>;
      default:
        return <AddSplit />;
    }
  };
  return (
    <div className="dashboard">
      <SideNav onNavClick={setActiveComponent} />
      <>{renderComponent()}</>
    </div>
  );
};

export default DashboardLayout;
