import React from "react";
import { FaWallet, FaUsers, FaChartPie } from "react-icons/fa";
import simplicity from "../../assets/simplicity.svg";
import transparency from "../../assets/transparency.svg";
import people from "../../assets/people.svg";
import "./AboutUs.scss";

const AboutUs = () => {
  return (
    <section className="about-us">
      <div className="about-us__container">
        <h1 className="about-us__title">Our mission</h1>
        <p className="about-us__intro">
          "To create a financial tool that fosters connection, transparency, and
          collaboration. We aim to empower users to enjoy their moments together
          without the stress of financial disputes."
        </p>

        <div className="about-us__features">
          <div className="about-us__feature">
            <img src={simplicity} alt="" />
            <h2 className="about-us__subtitle">Simplicity</h2>
            <p>We prioritize user-friendly designs to ensure ease of use</p>
          </div>
          <div className="about-us__feature">
            <img src={transparency} alt="" />
            <h2 className="about-us__subtitle">Transparency</h2>
            <p>Clear and fair calculations for every shared expense</p>
          </div>
          <div className="about-us__feature">
            <img src={people} alt="" />
            <h2 className="about-us__subtitle">Community</h2>
            <p>
              We’re committed to building a supportive environment for our
              users.
            </p>
          </div>
        </div>

        <div className="about-us__closing">
          <h1>"At SplitIt, we believe in the power of shared experiences. Our journey began with a simple idea: to make the process of managing shared expenses seamless and enjoyable. We’re not just an app; we’re a community of friends, families, and adventurers who understand that splitting bills should never be a burden."</h1>
          <p>
            Join us as we redefine how you share and manage expenses, making
            every gathering a memorable experience. Together, let’s focus on
            what truly matters – enjoying life with the people you care about!
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
