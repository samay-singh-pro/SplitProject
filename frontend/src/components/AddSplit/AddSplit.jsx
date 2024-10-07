import React, { useState, useEffect } from "react";
import "./AddSplit.scss";
import Select from "react-select";
import addExpense2 from "../../assets/addExpense.png";
import { useDispatch, useSelector } from "react-redux";
import { fetchGroups } from "../../store/groupSlice";
import { addExpense } from "../../store/expenseSlice";

const AddSplit = () => {
  const dispatch = useDispatch();
  const { groups } = useSelector((state) => state.group);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [spender, setSpender] = useState("");
  const [splitAmong, setSplitAmong] = useState([]);
  const [category, setCategory] = useState("");
  const [splitType, setSplitType] = useState("equally");
  const [unequalSplits, setUnequalSplits] = useState({});
  const [percentageSplits, setPercentageSplits] = useState({});
  const [error, setError] = useState("");

  const categories = [
    "Household",
    "Travel",
    "Entertainment",
    "Groceries",
    "Dining",
    "Gifts",
    "Utilities",
    "Social",
    "Bill",
    "Subscriptions",
    "Education",
    "Health",
    "Others",
  ];

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  const handleGroupChange = (e) => {
    const selectedGroupId = e.target.value;
    setSelectedGroup(selectedGroupId);

    const group = groups.find((group) => group._id === selectedGroupId);
    if (group) {
      setSplitAmong([]);
      setSpender("");
    }
  };

  const handleUnequalInputChange = (userId, value) => {
    setUnequalSplits((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  const handlePercentageInputChange = (userId, value) => {
    setPercentageSplits((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const expenseData = {
      groupId: selectedGroup,
      amount: parseFloat(amount),
      description,
      category,
      spenderId: spender,
      splitDetails: [],
      splitType,
    };

    if (
      !selectedGroup ||
      !amount ||
      !description ||
      !spender ||
      splitAmong.length === 0
    ) {
      setError("Please fill in all the fields");
      return;
    }

    if (splitType === "unequally") {
      const totalUnequal = Object.values(unequalSplits).reduce(
        (sum, val) => sum + parseFloat(val || 0),
        0
      );
      if (totalUnequal !== parseFloat(amount)) {
        setError("The sum of unequal splits must equal the total amount");
        return;
      }

      expenseData.splitDetails = splitAmong.map((memberId) => ({
        member: memberId,
        amount: Number(unequalSplits[memberId]),
      }));
    } else if (splitType === "percentage") {
      const totalPercentage = Object.values(percentageSplits).reduce(
        (sum, val) => sum + parseFloat(val || 0),
        0
      );
      if (totalPercentage !== 100) {
        setError("The sum of percentages must equal 100%");
        return;
      }

      expenseData.splitDetails = splitAmong.map((memberId) => ({
        member: memberId,
        percentage: Number(percentageSplits[memberId]),
      }));
    } else if (splitType === "equally") {
      expenseData.splitDetails = splitAmong.map((memberId) => ({
        member: memberId,
      }));
    }

    dispatch(addExpense(expenseData))
      .then((response) => {
        setSelectedGroup("");
        setAmount("");
        setDescription("");
        setSpender("");
        setCategory("");
        setSplitAmong([]);
        setUnequalSplits({});
        setPercentageSplits({});
        setSplitType("equally");
      })
      .catch((error) => {
        console.error("Error adding expense:", error);
        setError("Failed to add the expense");
      });
  };

  const groupOptions =
    groups.map((group) => ({
      value: group._id,
      label: group.name,
    })) || [];

  const selectedGroupMembers =
    groups.find((group) => group._id === selectedGroup)?.members || [];

  const spenderOptions =
    selectedGroupMembers.map((member) => ({
      value: member._id,
      label: member.name, 
    })) || [];

  const customStyles = {
    control: (base) => ({
      ...base,
      height: "40px",
      minHeight: "40px",
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0 8px",
    }),
  };

  return (
    <div className="expense">
      <div className="expense__header">
        <span>Add new Expense</span>
      </div>
      <div className="expense__container">
        <form className="expense__form" onSubmit={handleSubmit}>
          <div className="expense__form__inputs">
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

          <div className="expense__form__inputs">
            <label>Add Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="expense__form__inputs">
            <label>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="expense__form__inputs">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select Category</option>
              {categories.map((category, index) => (
                <option key={index} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="expense__form__inputs">
            <label>Spended By Whom</label>
            <select
              value={spender}
              onChange={(e) => setSpender(e.target.value)}
            >
              <option value="">Select User</option>
              {spenderOptions.map((user) => (
                <option key={user.value} value={user.value}>
                  {user.label}
                </option>
              ))}
            </select>
          </div>

          <div className="expense__form__inputs">
            <label>Split Among Whom</label>
            <Select
              isMulti
              options={spenderOptions}
              onChange={(selectedOptions) =>
                setSplitAmong(selectedOptions.map((option) => option.value))
              }
              className="basic-multi-select"
              classNamePrefix="select"
              styles={customStyles}
              placeholder="Select users to split among"
              value={spenderOptions.filter((option) =>
                splitAmong.includes(option.value)
              )}
            />
          </div>

          <div className="expense__form__inputs">
            <label>Split Type</label>
            <select
              value={splitType}
              onChange={(e) => setSplitType(e.target.value)}
            >
              <option value="equally">Split Equally</option>
              <option value="unequally">Split Unequally</option>
              <option value="percentage">Split by Percentage</option>
            </select>
          </div>

          {splitType === "unequally" &&
            splitAmong.map((userId) => {
              const user = spenderOptions.find((u) => u.value === userId);
              return (
                <div className="expense__form__inputs" key={userId}>
                  <label>{user?.label}'s share</label>
                  <input
                    className="dynamicInputs"
                    type="number"
                    value={unequalSplits[userId] || ""}
                    onChange={(e) =>
                      handleUnequalInputChange(userId, e.target.value)
                    }
                  />
                </div>
              );
            })}

          {splitType === "percentage" &&
            splitAmong.map((userId) => {
              const user = spenderOptions.find((u) => u.value === userId);
              return (
                <div className="expense__form__inputs" key={userId}>
                  <label>{user?.label}'s percentage</label>
                  <input
                    type="number"
                    value={percentageSplits[userId] || ""}
                    onChange={(e) =>
                      handlePercentageInputChange(userId, e.target.value)
                    }
                  />
                </div>
              );
            })}

          {error && <p style={{ color: "red" }}>{error}</p>}
          <button className="submitButton" type="submit">
            Add Expense
          </button>
        </form>
        <div className="expense__img">
          <h1>Track, Split, Save</h1>
          <img src={addExpense2} alt="" />
        </div>
      </div>
    </div>
  );
};

export default AddSplit;
