import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGroups } from "../../store/groupSlice";
import "./expenseList.scss";
import ExpenseCard from "./ExpenseItem/expenseItem";
import { getAllExpenses } from "../../store/expenseSlice";

const expenseList = () => {
  const dispatch = useDispatch();
  const { groups } = useSelector((state) => state.group);
  const { expenses } = useSelector((state) => state.expense);
  const [selectedGroup, setSelectedGroup] = useState("");

  const handleGroupChange = (e) => {
    const selectedGroupId = e.target.value;
    setSelectedGroup(selectedGroupId);
    dispatch(getAllExpenses(e.target.value));
  };

  const groupOptions =
    groups.map((group) => ({
      value: group._id,
      label: group.name,
    })) || [];

  return (
    <div className="expenseList">
      <div className="expenseList__header">
        <span>Expenses List</span>
      </div>
      <div className="expenses__inputs">
        <label>Choose Group</label>
        <select value={selectedGroup} onChange={handleGroupChange}>
          <option value="">Select Group</option>
          {groupOptions.map((group) => (
            <option key={group.value} value={group.value}>
              {group.label}
            </option>
          ))}
        </select>
      </div>
      <div className="expensesItems">
        { expenses && expenses.length
          ? expenses.map((expense) => {
              return <ExpenseCard expense={expense} />;
            })
          : selectedGroup ? <div className="empty_messages">No expenses logged yet</div> : <div className="empty_messages">Please Select a Group</div>}
      </div>
    </div>
  );
};

export default expenseList;
