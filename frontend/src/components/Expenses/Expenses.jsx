import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGroups } from "../../store/groupSlice";
import "./Expenses.scss";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchGroupStats } from "../../store/statsSlice";
import { toast } from "react-toastify";
import { addExpense } from "../../store/expenseSlice";
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const Expenses = () => {
  const dispatch = useDispatch();
  const { groups } = useSelector((state) => state.group);
  const { stats } = useSelector((state) => state.stats);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectePayer, setSelectedPayer] = useState("");
  const [selectedBenificiary, setSelectedBenificiary] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");

  const handleGroupChange = (e) => {
    const selectedGroupId = e.target.value;
    setSelectedGroup(selectedGroupId);
    dispatch(fetchGroupStats(e.target.value));
  };

  const handlePayerChange = (e) => {
    setSelectedPayer(e.target.value);
  };
  const handleSettleAmountChange = (e) => {
    setSettlementAmount(e.target.value);
  };
  const handleBenificiaryChange = (e) => {
    setSelectedBenificiary(e.target.value);
  };

  const handleSettleSubmit = () => {
    if (selectePayer === selectedBenificiary) {
      toast.error("Payer and Benificiary cant be same");
    }
    const expenseData = {
      settlementExpense: true,
      groupId: selectedGroup,
      amount: parseFloat(settlementAmount),
      description: "settleUp",
      category: "others",
      spenderId: selectePayer,
      splitDetails: [
        {
          member: selectedBenificiary,
          amount: parseFloat(settlementAmount),
        },
      ],
      splitType: "unequally",
    };
    dispatch(addExpense(expenseData)).then((res) => {
      setSelectedPayer("");
      setSelectedBenificiary("");
      setSettlementAmount("");
      dispatch(fetchGroupStats(selectedGroup));
    });
  };

  const pieData = stats
    ? Object.values(stats.memberStats).map((member) => ({
        name: member.name,
        value: member.totalSpentOnSelfAndByOthers,
      }))
    : [];

  const barData = stats
    ? Object.values(stats.memberStats).map((member) => ({
        name: member.name,
        "Money Contributed": member.totalSpent,
      }))
    : [];

  const categoryData = stats
    ? Object.keys(stats.categoryWiseSpendings).map((key) => ({
        name: key,
        spending: stats.categoryWiseSpendings[key],
      }))
    : [];

  // Preparing data for "Owe" Horizontal BarChart
  let oweData = stats
    ? Object.values(stats.memberStats).flatMap((member) => {
        return Object.entries(member.owe).map(([memberId, oweInfo]) => ({
          name: `${member.name} owes ${oweInfo.name}`,
          label: `${member.name} needs to pay ${oweInfo.name}`,
          amount: oweInfo.amount,
        }));
      })
    : [];

  oweData = oweData.filter((e) => e.amount !== 0);

  const selectedGroupMembers =
    groups.find((group) => group._id === selectedGroup)?.members || [];

  const spenderOptions =
    selectedGroupMembers.map((member) => ({
      value: member._id,
      label: member.name,
    })) || [];

  const groupOptions =
    groups.map((group) => ({
      value: group._id,
      label: group.name,
    })) || [];

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);
  return (
    <div className="expenses">
      <div className="expenses__header">
        <span>All Expenses</span>
      </div>
      <div className="expenses__controls">
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

          {selectedGroup ? (
            <>
              <h3>
                Total expense For Group : <span>{stats?.totalSpent} $</span>
              </h3>
              {oweData.length ? (
                <>
                  <h3>Settlement Data</h3>
                  {oweData.map((data) => (
                    <div className="settle">
                      <p> {data.label} : </p>
                      <span>{data.amount} $</span>
                    </div>
                  ))}
                </>
              ) : (
                "No Data to display"
              )}
            </>
          ) : (
            <div>Please select a Group</div>
          )}
        </div>
        {selectedGroup ? (
          <div className="expenses__settlement">
            <h1>Settle Up Now!</h1>
            <div className="inputs">
              <label>Payer</label>
              <select value={selectePayer} onChange={handlePayerChange}>
                <option value="">Select Payer</option>
                {spenderOptions.map((spender) => (
                  <option key={spender.value} value={spender.value}>
                    {spender.label}
                  </option>
                ))}
              </select>
              <label>Benificiary</label>
              <select
                value={selectedBenificiary}
                onChange={handleBenificiaryChange}
              >
                <option value="">Select Benificiary</option>
                {spenderOptions.map((spender) => (
                  <option key={spender.value} value={spender.value}>
                    {spender.label}
                  </option>
                ))}
              </select>
              <label>Amount to be payed</label>
              <input
                type="number"
                required
                value={settlementAmount}
                onChange={handleSettleAmountChange}
              />
              <button onClick={handleSettleSubmit}>Settle</button>
            </div>
          </div>
        ) : (
          ""
        )}
      </div>
      <div className="expenses__charts">
        {pieData.length && selectedGroup ? (
          <div className="chart">
            <h3>Amount spent on each individual</h3>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius="80%"
                  fill="#8884d8"
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          ""
        )}

        {barData.length && selectedGroup ? (
          <div className="chart">
            <h3>Amount individual spended</h3>
            <ResponsiveContainer>
              <BarChart
                data={barData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-90} tick={{ fontSize: 12 }} textAnchor="end" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Money Contributed" fill="#8884d8" label={{ position: 'insideTop', fill: '#fff' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          ""
        )}

        {categoryData.length && selectedGroup ? (
          <div className="chart">
            <h3>Category Wise Spendings</h3>
            <ResponsiveContainer>
              <BarChart
                data={categoryData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="spending" fill="#ef8e1bc9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          ""
        )}

        {oweData.length && selectedGroup ? (
          <div className="chart">
            <h3>Amount Owed by Each Member</h3>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={oweData}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          ""
        )}
      </div>
    </div>
  );
};

export default Expenses;
