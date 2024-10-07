import React from "react";
import "./ExpenseCard.scss";

const ExpenseCard = ({ expense }) => {
  const { amount, description, category, spenderName, splitDetails, createdAt } = expense;

  return (
    <div className="expense-card">
      <div className="expense-header">
        <div className="expense-info">
          <h2 className="description">{description}</h2>
          <span className="category">{category}</span>
        </div>
        <div className="expense-amount">
          <span className="amount">₹{amount.toFixed(2)}</span>
        </div>
      </div>

      <div className="expense-body">
        <div className="spender-info">
          <span>Spent by: <strong>{spenderName}</strong></span>
          <span className="date-time">{createdAt}</span>
        </div>

        <div className="split-details">
          <h4>Member Shares</h4>
          <ul>
            {splitDetails.map((member) => (
              <li key={member.memberId}>
                <span className="member-name">{member.memberName}</span>
                <span className="share-amount">₹{member.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExpenseCard;
