import React, { useState } from "react";
import "./GroupCard.scss";

const GroupCard = ({ group }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };
  return (
    <div className="flip-card" onClick={handleFlip}>
      <div className={`flip-card-inner ${isFlipped ? "flipped" : ""}`}>
        <div className="flip-card-front">
          <img src={group.image} alt="Group" className="group-image" />
          <h2 className="group-name">{group.name}</h2>
          <p className="group-purpose">{group.description}</p>
          <p className="group-purpose">{group.category}</p>
        </div>
        <div className="flip-card-back">
          <h2>Members</h2>
          <ul>
            {group.members.map((member, index) => (
              <li key={index}>{member.name}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
